'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { resolveSession } from '@/app/actions/student';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lesson } from '@/types';
import { Music, LogOut, Loader2 } from 'lucide-react';

function LessonRoomContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const lessonId = params.id as string;
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    const verifyAccess = async () => {
      if (!lessonId || !token) {
        router.push('/');
        return;
      }

      try {
        // Admin/instructor bypass — skip the student session entirely, just confirm an authenticated admin session
        if (token === 'admin') {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            router.push('/admin/login');
            return;
          }

          const { data: lessonData, error: lessonError } = await supabase
            .from('lessons')
            .select('*')
            .eq('id', lessonId)
            .single();

          if (lessonError || !lessonData) {
            router.push('/admin');
            return;
          }

          setLesson(lessonData as Lesson);
          setAuthorized(true);
          return;
        }

        // Resolve the opaque session token into the student/lesson/payment it represents
        const res = await resolveSession(token);

        if (!res.success || !res.lesson || !res.studentId || res.lesson.id !== lessonId) {
          router.push('/');
          return;
        }

        // Not live yet, or payment not approved — send back to the status page (still valid token)
        if (res.lesson.status !== 'live' || res.paymentStatus !== 'approved') {
          router.push(`/status?token=${token}`);
          return;
        }

        setLesson(res.lesson);
        setStudentId(res.studentId);
        setAuthorized(true);
      } catch (err) {
        console.error('Error verifying lesson access:', err);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    verifyAccess();
  }, [lessonId, token]);

  // Subscribe to realtime changes in case the lesson is ended by the instructor while student is in room
  useEffect(() => {
    if (!lessonId || !authorized) return;

    const channel = supabase
      .channel(`lesson-room:${lessonId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lessons',
          filter: `id=eq.${lessonId}`,
        },
        async (payload) => {
          const updatedLesson = payload.new as Lesson;
          if (updatedLesson.status === 'ended') {
            // Log attendance exit and redirect
            handleLeave();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lessonId, authorized]);

  const handleLeave = async () => {
    if (token === 'admin') {
      router.push('/admin');
      return;
    }

    // Record attendance exit time
    try {
      if (studentId) {
        const { data: lastAttendance } = await supabase
          .from('attendance')
          .select('id')
          .eq('student_id', studentId)
          .eq('lesson_id', lessonId)
          .is('left_at', null)
          .order('joined_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastAttendance) {
          await supabase
            .from('attendance')
            .update({ left_at: new Date().toISOString() })
            .eq('id', lastAttendance.id);
        }
      }
    } catch (e) {
      console.error('Failed to log attendance departure', e);
    }

    // Redirect back to status page using the same token — no need to re-derive phone/code
    router.push(`/status?token=${token}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-base">
        <Loader2 className="h-8 w-8 text-uv-purple animate-spin mb-4" />
        <p className="text-text-secondary text-sm font-semibold uppercase tracking-wider font-heading">
          Connecting to Live Room...
        </p>
      </div>
    );
  }

  if (!authorized || !lesson) {
    return null; // verification hook redirects
  }

  // Construct Jitsi iframe URL.
  // We can pass prejoin page disabled and other styling configurations.
  const jitsiRoomName = `LiveDance_${lesson.meeting_room || lesson.id.substring(0, 8)}`;
  const jitsiUrl = `https://meet.jit.si/${jitsiRoomName}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.startWithVideoMuted=true&interfaceConfig.SHOW_JITSI_WATERMARK=false`;

  return (
    <div className="flex flex-col h-screen bg-bg-base overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-bg-elevated z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-uv-gradient">
            <Music className="h-4.5 w-4.5 text-text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold font-heading uppercase text-text-primary tracking-wide">
              {lesson.title}
            </h1>
            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-semibold">
              LiveDance Room
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Badge status="live" label="LIVE" />
          
          <Button
            variant="outline"
            className="px-3.5 py-1.5 h-8 text-xs font-semibold normal-case"
            onClick={() => handleLeave()}
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" /> Leave Room
          </Button>
        </div>
      </header>

      {/* Jitsi Meet Iframe Container */}
      <div className="flex-1 w-full bg-black relative">
        <iframe
          src={jitsiUrl}
          className="absolute inset-0 w-full h-full border-0"
          allow="camera; microphone; fullscreen; display-capture; autoplay"
        />
      </div>
    </div>
  );
}

export default function LessonRoomPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-base">
        <Loader2 className="h-8 w-8 text-uv-purple animate-spin mb-4" />
        <p className="text-text-secondary text-sm font-semibold uppercase tracking-wider font-heading">
          Loading...
        </p>
      </div>
    }>
      <LessonRoomContent />
    </Suspense>
  );
}

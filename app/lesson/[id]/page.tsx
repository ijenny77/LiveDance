'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useLocalParticipant,
  useChat,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { supabase } from '@/lib/supabase';
import { resolveSession, leaveLessonAttendance } from '@/app/actions/student';
import { getLiveKitToken } from '@/app/actions/livekit';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lesson } from '@/types';
import { Music, LogOut, Loader2, Mic, MicOff, Video, VideoOff, MonitorUp, MessageSquare } from 'lucide-react';

function LessonRoomContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const lessonId = params.id as string;
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);

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

          const lkRes = await getLiveKitToken(lessonId, 'admin', session.access_token);
          if (!lkRes.success || !lkRes.url || !lkRes.token) {
            router.push('/admin');
            return;
          }

          setLesson(lessonData as Lesson);
          setLivekitUrl(lkRes.url);
          setLivekitToken(lkRes.token);
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

        const lkRes = await getLiveKitToken(lessonId, token);
        if (!lkRes.success || !lkRes.url || !lkRes.token) {
          router.push(`/status?token=${token}`);
          return;
        }

        setLesson(res.lesson);
        setLivekitUrl(lkRes.url);
        setLivekitToken(lkRes.token);
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

    // Record attendance exit time via server action (resolves the token to the
    // caller's own student/lesson identity server-side — no raw ids trusted from the client)
    try {
      await leaveLessonAttendance(token);
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

  if (!authorized || !lesson || !livekitUrl || !livekitToken) {
    return null; // verification hook redirects
  }

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

      {/* LiveKit call — built from low-level primitives (not the VideoConference/ControlBar
          prefab) since ControlBar's built-in permission gate could hide every button but
          Leave, with no way to work around it from the outside. */}
      <div className="flex-1 w-full bg-black relative flex flex-col">
        <LiveKitRoom
          serverUrl={livekitUrl}
          token={livekitToken}
          connect
          audio
          video={false}
          onDisconnected={handleLeave}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          data-lk-theme="default"
        >
          <CallVideoGrid />
          <CallControls onLeave={handleLeave} />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
}

function CallVideoGrid() {
  // Must be its own component rendered as a child of LiveKitRoom — calling
  // useTracks() inline while constructing LiveKitRoom's children would run
  // before the room context LiveKitRoom provides actually exists.
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  return (
    <div className="flex-1 min-h-0">
      <GridLayout tracks={tracks}>
        <ParticipantTile />
      </GridLayout>
    </div>
  );
}

function ControlButton({
  icon: Icon,
  label,
  active,
  danger,
  badge,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  active?: boolean;
  danger?: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`relative flex h-12 w-12 items-center justify-center rounded-full transition ${
        active
          ? 'bg-uv-gradient'
          : danger
            ? 'bg-error'
            : 'bg-bg-elevated-2 border border-border hover:bg-bg-elevated'
      }`}
    >
      <Icon size={20} className="text-white" />
      {!!badge && (
        <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

function CallControls({ onLeave }: { onLeave: () => void }) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const { chatMessages, send, isSending } = useChat();

  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const seenMessageCount = useRef(0);

  useEffect(() => {
    if (!chatOpen && chatMessages.length > seenMessageCount.current) {
      setUnreadCount(chatMessages.length - seenMessageCount.current);
    }
  }, [chatMessages.length, chatOpen]);

  const openChat = () => {
    setChatOpen(true);
    setUnreadCount(0);
    seenMessageCount.current = chatMessages.length;
  };

  const handleSend = async () => {
    const text = chatText.trim();
    if (!text) return;
    setChatText('');
    await send(text);
  };

  return (
    <>
      <div className="flex flex-shrink-0 items-center justify-center gap-3 border-t border-border bg-bg-elevated py-4">
        <ControlButton
          icon={isMicrophoneEnabled ? Mic : MicOff}
          label="Microphone"
          active={isMicrophoneEnabled}
          onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
        />
        <ControlButton
          icon={isCameraEnabled ? Video : VideoOff}
          label="Camera"
          active={isCameraEnabled}
          onClick={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
        />
        <ControlButton
          icon={MonitorUp}
          label="Share screen"
          active={isScreenShareEnabled}
          onClick={() => localParticipant.setScreenShareEnabled(!isScreenShareEnabled)}
        />
        <ControlButton icon={MessageSquare} label="Chat" badge={unreadCount} onClick={openChat} />
        <ControlButton icon={LogOut} label="Leave" danger onClick={onLeave} />
      </div>

      {chatOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setChatOpen(false)}
        >
          <div
            className="flex w-full max-w-md flex-col rounded-t-2xl bg-bg-elevated p-4"
            style={{ height: '65%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-text-primary">Chat</h2>
              <button type="button" onClick={() => setChatOpen(false)} className="text-xs font-semibold text-text-secondary">
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-3">
              {chatMessages.length === 0 ? (
                <p className="text-center text-sm text-text-secondary">No messages yet — say hi!</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {chatMessages.map((msg) => (
                    <div key={msg.id}>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-uv-blue">
                        {msg.from?.name || msg.from?.identity || 'Someone'}
                      </p>
                      <p className="text-sm text-text-primary">{msg.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 border-t border-border pt-3">
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Message"
                className="flex-1 rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-text-primary outline-none focus:border-uv-purple"
              />
              <Button onClick={handleSend} disabled={isSending || !chatText.trim()} className="px-4 py-2 text-xs">
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
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

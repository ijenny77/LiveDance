'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { lookupStudentSession, joinLessonAttendance } from '@/app/actions/student';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lesson, PaymentStatus, LessonStatus } from '@/types';
import { Clock, AlertOctagon, CheckCircle2, Play, Music, ArrowLeft, RefreshCw } from 'lucide-react';

function StatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const phone = searchParams.get('phone') || '';
  const code = searchParams.get('code') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  
  // Countdown state for scheduled lessons
  const [countdownText, setCountdownText] = useState('');

  const fetchData = async () => {
    if (!phone || !code) {
      setError('Missing phone number or lesson code.');
      setLoading(false);
      return;
    }

    try {
      const res = await lookupStudentSession(phone, code);
      if (res.success && res.lesson && res.paymentStatus && res.studentId) {
        setLesson(res.lesson);
        setPaymentStatus(res.paymentStatus);
        setStudentId(res.studentId);
      } else {
        setError(res.error || 'Failed to retrieve status');
      }
    } catch (err: any) {
      setError('An error occurred while checking status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [phone, code]);

  // Realtime connection
  useEffect(() => {
    if (!lesson || !studentId) return;

    // 1. Subscribe to Lesson updates (e.g. status changes from scheduled -> live -> ended)
    const lessonChannel = supabase
      .channel(`lesson-status:${lesson.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lessons',
          filter: `id=eq.${lesson.id}`,
        },
        (payload) => {
          const updatedLesson = payload.new as Lesson;
          setLesson(updatedLesson);
        }
      )
      .subscribe();

    // 2. Subscribe to Payment updates (e.g. status changes from pending -> approved)
    const paymentChannel = supabase
      .channel(`payment-status:${studentId}:${lesson.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `student_id=eq.${studentId}`,
        },
        async (payload) => {
          // If the status updated, let's refresh our local state
          const updatedPayment = payload.new as any;
          if (updatedPayment && updatedPayment.lesson_id === lesson.id) {
            setPaymentStatus(updatedPayment.status as PaymentStatus);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(lessonChannel);
      supabase.removeChannel(paymentChannel);
    };
  }, [lesson?.id, studentId]);

  // Lesson Countdown Timer
  useEffect(() => {
    if (!lesson || lesson.status !== 'scheduled') return;

    const calculateCountdown = () => {
      const lessonDateTime = new Date(`${lesson.date}T${lesson.time}`);
      const now = new Date();
      const diff = lessonDateTime.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdownText('Starting any minute now...');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      let text = '';
      if (hours > 0) text += `${hours}h `;
      if (minutes > 0 || hours > 0) text += `${minutes}m `;
      text += `${seconds}s`;
      setCountdownText(`Starts in: ${text}`);
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lesson]);

  const handleJoin = async () => {
    if (!studentId || !lesson) return;
    setLoading(true);
    // Log attendance before redirect
    const res = await joinLessonAttendance(studentId, lesson.id);
    setLoading(false);
    if (res.success) {
      router.push(`/lesson/${lesson.id}?studentId=${studentId}`);
    } else {
      alert('Could not join room. ' + res.error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <RefreshCw className="h-10 w-10 text-uv-purple animate-spin mb-4" />
        <p className="text-text-secondary text-sm font-semibold uppercase tracking-wider font-heading">
          Checking your access credentials...
        </p>
      </div>
    );
  }

  // Handle Invalid Lesson Code or general errors
  if (error || !lesson) {
    return (
      <Card className="max-w-md w-full border-error/20 p-8 text-center" glow>
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-error/15 flex items-center justify-center border border-error/20">
            <AlertOctagon className="h-6 w-6 text-error" />
          </div>
        </div>
        <h2 className="text-2xl font-bold font-heading uppercase text-text-primary mb-2">
          Access Denied
        </h2>
        <p className="text-sm text-text-secondary mb-6 leading-relaxed">
          {error || 'Invalid session code. Double check the code or contact your dance instructor.'}
        </p>
        <Button variant="outline" className="w-full" onClick={() => router.push('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Try Another Code
        </Button>
      </Card>
    );
  }

  // State mappings
  const isPending = paymentStatus === 'pending';
  const isRejected = paymentStatus === 'rejected';
  const isApproved = paymentStatus === 'approved';
  const lessonLive = lesson.status === 'live';
  const lessonScheduled = lesson.status === 'scheduled';
  const lessonEnded = lesson.status === 'ended';

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Session Title Header */}
      <div className="text-center space-y-2">
        <Badge status={lessonLive ? 'live' : lessonEnded ? 'ended' : 'scheduled'} />
        <h1 className="text-2xl font-bold font-heading uppercase tracking-wide text-text-primary mt-3">
          {lesson.title}
        </h1>
        <p className="text-sm text-text-secondary">
          Code: <span className="font-mono font-bold text-uv-blue">{lesson.lesson_code}</span>
        </p>
      </div>

      {/* State Cards */}
      {isPending && (
        <Card className="border-warning/20 p-8 text-center" glow>
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-full bg-warning/10 flex items-center justify-center border border-warning/20">
              <Clock className="h-7 w-7 text-warning animate-pulse" />
            </div>
          </div>
          <h2 className="text-xl font-bold font-heading uppercase text-text-primary mb-2">
            Confirming Payment
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-6">
            We are confirming your payment of <span className="text-text-primary font-bold">${Number(lesson.price).toFixed(2)}</span>.
            This screen will update automatically as soon as the instructor approves your mobile money transaction.
          </p>
          <div className="text-xs text-text-disabled bg-bg-elevated-2 rounded-xl p-3 border border-border">
            Checking status in real-time. Do not close this page.
          </div>
        </Card>
      )}

      {isRejected && (
        <Card className="border-error/20 p-8 text-center" glow>
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-full bg-error/10 flex items-center justify-center border border-error/20">
              <AlertOctagon className="h-7 w-7 text-error" />
            </div>
          </div>
          <h2 className="text-xl font-bold font-heading uppercase text-text-primary mb-2">
            Payment Rejected
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-6">
            Your payment approval request was rejected by the administrator. Please contact your instructor to verify your registration.
          </p>
          <Button variant="outline" className="w-full" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Entry
          </Button>
        </Card>
      )}

      {isApproved && lessonScheduled && (
        <Card className="border-border p-8 text-center" glow>
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-full bg-uv-purple/10 flex items-center justify-center border border-uv-purple/20">
              <CheckCircle2 className="h-7 w-7 text-uv-purple" />
            </div>
          </div>
          <h2 className="text-xl font-bold font-heading uppercase text-text-primary mb-1">
            Payment Approved
          </h2>
          <p className="text-xs text-success font-semibold tracking-wider uppercase mb-4">
            Ready to dance
          </p>
          <p className="text-sm text-text-secondary leading-relaxed mb-6">
            Your registration is confirmed! The lesson will begin shortly. Hang tight, this screen will open the video room when the live session starts.
          </p>
          
          <div className="text-lg font-bold font-mono text-uv-blue bg-bg-elevated-2 rounded-xl p-3 border border-border">
            {countdownText}
          </div>
        </Card>
      )}

      {isApproved && lessonLive && (
        <Card className="border-uv-purple/30 p-8 text-center shadow-[0_0_40px_rgba(123,47,247,0.15)]" glow>
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-uv-gradient flex items-center justify-center shadow-[0_0_20px_rgba(0,192,255,0.4)]">
              <Play className="h-8 w-8 text-text-primary fill-text-primary ml-1 animate-indicator-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold font-heading uppercase text-text-primary mb-1">
            Lesson is Live!
          </h2>
          <p className="text-xs text-uv-blue font-bold tracking-widest uppercase mb-6 animate-pulse">
            Instructor is in the room
          </p>
          <Button
            variant="gradient"
            className="w-full py-4 text-base shadow-[0_0_25px_rgba(123,47,247,0.4)] animate-live-pulse"
            onClick={handleJoin}
          >
            Join Live Lesson
          </Button>
        </Card>
      )}

      {isApproved && lessonEnded && (
        <Card className="border-error/20 p-8 text-center" glow>
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-full bg-error/10 flex items-center justify-center border border-error/20">
              <Music className="h-7 w-7 text-error" />
            </div>
          </div>
          <h2 className="text-xl font-bold font-heading uppercase text-text-primary mb-2">
            Lesson Finished
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-6">
            This live dance lesson has ended. We hope you had a blast learning and dancing! Keep practicing and check out our upcoming schedules.
          </p>
          <Button variant="outline" className="w-full" onClick={() => router.push('/')}>
            Back to Home
          </Button>
        </Card>
      )}
    </div>
  );
}

export default function StudentStatusPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-bg-base">
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-uv-purple/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-uv-blue/10 blur-[120px] pointer-events-none" />
      
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center text-center">
          <RefreshCw className="h-10 w-10 text-uv-purple animate-spin mb-4" />
          <p className="text-text-secondary text-sm font-semibold uppercase tracking-wider font-heading">
            Loading...
          </p>
        </div>
      }>
        <StatusContent />
      </Suspense>
    </main>
  );
}

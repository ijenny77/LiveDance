'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ToastContainer, ToastMessage } from '@/components/toast';
import { Lesson } from '@/types';
import { 
  Play, 
  Square, 
  Users, 
  BookOpen, 
  CreditCard, 
  TrendingUp, 
  Clock, 
  MapPin, 
  Loader2, 
  Plus, 
  CheckCircle2 
} from 'lucide-react';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [studentsCount, setStudentsCount] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'warning' | 'error', text: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, text }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Get lessons (all upcoming or live)
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (lessonsError) throw lessonsError;
      setLessons((lessonsData as Lesson[]) || []);

      // 2. Get pending payments count
      const { count: pendingCount, error: paymentsError } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (paymentsError) throw paymentsError;
      setPendingPaymentsCount(pendingCount || 0);

      // 3. Get total students count
      const { count: studCount, error: studentsError } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      if (studentsError) throw studentsError;
      setStudentsCount(studCount || 0);

    } catch (err: any) {
      addToast('error', err.message || 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Subscribe to realtime database changes so stats/lesson states stay synchronized
    const channel = supabase
      .channel('admin-dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        // Refresh payments counter
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending')
          .then(({ count }) => setPendingPaymentsCount(count || 0));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lessons' }, () => {
        // Refresh lessons list
        supabase.from('lessons').select('*').order('date', { ascending: true }).order('time', { ascending: true })
          .then(({ data }) => setLessons((data as Lesson[]) || []));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleStartLesson = async (lessonId: string) => {
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ status: 'live' })
        .eq('id', lessonId);

      if (error) throw error;
      addToast('success', 'Lesson is now LIVE! Students have been notified.');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to start lesson');
    }
  };

  const handleEndLesson = async (lessonId: string) => {
    try {
      // 1. Set status to ended
      const { error: lessonError } = await supabase
        .from('lessons')
        .update({ status: 'ended' })
        .eq('id', lessonId);

      if (lessonError) throw lessonError;

      // 2. Finalize attendance (set left_at = now for anyone still connected)
      const { error: attendanceError } = await supabase
        .from('attendance')
        .update({ left_at: new Date().toISOString() })
        .eq('lesson_id', lessonId)
        .is('left_at', null);

      if (attendanceError) throw attendanceError;

      addToast('success', 'Lesson ended and attendance records finalized.');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to end lesson');
    }
  };

  // Find currently live lesson or the next upcoming scheduled lesson
  const liveLesson = lessons.find(l => l.status === 'live');
  const nextScheduledLesson = lessons.find(l => l.status === 'scheduled');
  const activeControlLesson = liveLesson || nextScheduledLesson;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] bg-bg-base">
        <Loader2 className="h-8 w-8 text-uv-purple animate-spin mb-4" />
        <p className="text-text-secondary text-sm font-semibold uppercase tracking-wider font-heading">
          Loading metrics...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-grow p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold uppercase font-heading text-text-primary tracking-wide">
            Control Center
          </h1>
          <p className="text-sm text-text-secondary">
            Manage live streams, review payments, and monitor academy registration.
          </p>
        </div>
        
        <Link href="/admin/lessons">
          <Button variant="gradient" className="h-10 text-xs font-semibold py-0 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create Lesson
          </Button>
        </Link>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 flex items-center justify-between border-border" glow={false}>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Students</p>
            <p className="text-2xl font-bold text-text-primary font-mono">{studentsCount}</p>
          </div>
          <div className="h-11 w-11 bg-uv-purple/10 border border-uv-purple/20 rounded-xl flex items-center justify-center">
            <Users className="h-5 w-5 text-uv-purple" />
          </div>
        </Card>

        <Card className="p-6 flex items-center justify-between border-border" glow={pendingPaymentsCount > 0}>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Pending Payments</p>
            <p className={`text-2xl font-bold font-mono ${pendingPaymentsCount > 0 ? 'text-warning' : 'text-text-primary'}`}>
              {pendingPaymentsCount}
            </p>
          </div>
          <div className={`h-11 w-11 border rounded-xl flex items-center justify-center ${
            pendingPaymentsCount > 0 
              ? 'bg-warning/10 border-warning/20' 
              : 'bg-bg-elevated-2 border-border'
          }`}>
            <CreditCard className={`h-5 w-5 ${pendingPaymentsCount > 0 ? 'text-warning' : 'text-text-secondary'}`} />
          </div>
        </Card>

        <Card className="p-6 flex items-center justify-between border-border" glow={false}>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Lessons</p>
            <p className="text-2xl font-bold text-text-primary font-mono">{lessons.length}</p>
          </div>
          <div className="h-11 w-11 bg-uv-blue/10 border border-uv-blue/20 rounded-xl flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-uv-blue" />
          </div>
        </Card>

        <Card className="p-6 flex items-center justify-between border-border" glow={!!liveLesson}>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Current Status</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`h-2.5 w-2.5 rounded-full ${liveLesson ? 'bg-success animate-indicator-pulse' : 'bg-text-disabled'}`} />
              <p className="text-sm font-bold uppercase font-heading tracking-wide">
                {liveLesson ? 'LIVE STREAMING' : 'IDLE'}
              </p>
            </div>
          </div>
          <div className="h-11 w-11 bg-bg-elevated-2 border border-border rounded-xl flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-text-secondary" />
          </div>
        </Card>
      </div>

      {/* Main Dashboard Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Today's Live Actions */}
        <Card className="lg:col-span-2 p-8 border-border relative overflow-hidden" glow={!!liveLesson}>
          {liveLesson && (
            <div className="absolute top-0 left-0 w-full h-[3px] bg-uv-gradient" />
          )}

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold font-heading uppercase tracking-wider text-text-primary">
              Instructor Controller
            </h2>
            {liveLesson ? (
              <Badge status="live" label="LIVE" />
            ) : nextScheduledLesson ? (
              <Badge status="scheduled" label="UPCOMING" />
            ) : (
              <span className="text-xs text-text-disabled uppercase font-semibold">No active lessons</span>
            )}
          </div>

          {activeControlLesson ? (
            <div className="space-y-6">
              <div className="p-5 bg-bg-elevated-2 border border-border rounded-xl space-y-4">
                <div>
                  <p className="text-xs font-bold text-uv-blue uppercase tracking-wider">Active/Next Lesson</p>
                  <h3 className="text-xl font-bold font-heading text-text-primary mt-1">
                    {activeControlLesson.title}
                  </h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-medium text-text-secondary">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-uv-purple" />
                    <span>{activeControlLesson.date} at {activeControlLesson.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-success" />
                    <span>${Number(activeControlLesson.price).toFixed(2)} entry fee</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-uv-blue" />
                    <span>Room: {activeControlLesson.meeting_room}</span>
                  </div>
                </div>
              </div>

              {/* Start / End Actions */}
              <div className="flex flex-col sm:flex-row gap-4">
                {activeControlLesson.status === 'scheduled' ? (
                  <Button 
                    variant="gradient" 
                    className="flex-1 py-4 flex items-center justify-center gap-2 text-base font-bold shadow-[0_0_20px_rgba(123,47,247,0.3)] hover:shadow-[0_0_30px_rgba(123,47,247,0.5)]"
                    onClick={() => handleStartLesson(activeControlLesson.id)}
                  >
                    <Play className="h-5 w-5 fill-current" /> Start Lesson
                  </Button>
                ) : activeControlLesson.status === 'live' ? (
                  <>
                    <Button 
                      variant="error" 
                      className="flex-1 py-4 flex items-center justify-center gap-2 text-base font-bold shadow-[0_0_20px_rgba(255,77,109,0.2)]"
                      onClick={() => handleEndLesson(activeControlLesson.id)}
                    >
                      <Square className="h-5 w-5 fill-current" /> End Lesson
                    </Button>
                    <Link href={`/lesson/${activeControlLesson.id}?studentId=admin`} className="flex-grow">
                      <Button variant="outline" className="w-full py-4 h-full text-base font-bold">
                        Join Instructor View
                      </Button>
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-text-secondary">
              <BookOpen className="h-10 w-10 text-text-disabled mb-3" />
              <p className="font-heading uppercase tracking-wider text-sm font-semibold">No Scheduled Lessons Today</p>
              <p className="text-xs text-text-disabled mt-1 max-w-xs">
                Create a new lesson in the lessons tab to open controls.
              </p>
            </div>
          )}
        </Card>

        {/* Right Side: Quick Action Sidebar */}
        <div className="space-y-6">
          <Card className="p-6 border-border flex flex-col justify-between" glow={false}>
            <div className="space-y-3">
              <h3 className="text-sm font-bold font-heading uppercase text-text-primary tracking-wider">
                Payments Queue
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Review and approve incoming mobile money payments instantly.
              </p>
            </div>
            
            <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${pendingPaymentsCount > 0 ? 'bg-warning animate-ping' : 'bg-success'}`} />
                <span className="text-xs font-semibold text-text-secondary">
                  {pendingPaymentsCount} pending approval
                </span>
              </div>
              <Link href="/admin/payments">
                <Button variant="outline" className="px-4 py-2 text-xs font-bold uppercase tracking-wider">
                  Review Queue
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6 border-border flex flex-col justify-between" glow={false}>
            <div className="space-y-3">
              <h3 className="text-sm font-bold font-heading uppercase text-text-primary tracking-wider">
                Student Registry
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Manage registered students, dates registered, and general profiles.
              </p>
            </div>
            
            <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary">
                {studentsCount} active accounts
              </span>
              <Link href="/admin/students">
                <Button variant="outline" className="px-4 py-2 text-xs font-bold uppercase tracking-wider">
                  Manage List
                </Button>
              </Link>
            </div>
          </Card>
        </div>

      </div>
      
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

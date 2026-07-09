'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lesson } from '@/types';
import { ToastContainer, ToastMessage } from '@/components/toast';
import { History, Calendar, Clock, Users, ArrowLeft, Loader2, Play } from 'lucide-react';

interface AttendanceJoin {
  id: string;
  student_id: string;
  lesson_id: string;
  joined_at: string;
  left_at: string | null;
  student: {
    name: string;
    phone_number: string;
  };
}

export default function AdminAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceJoin[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'warning' | 'error', text: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, text }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchLessons = async () => {
    try {
      setLoading(true);
      // Fetch all lessons
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (error) throw error;
      setLessons((data as Lesson[]) || []);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to fetch lessons list');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (lessonId: string) => {
    try {
      setLoadingRecords(true);
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          student_id,
          lesson_id,
          joined_at,
          left_at,
          student:students (name, phone_number)
        `)
        .eq('lesson_id', lessonId)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      setAttendanceRecords((data as any[]) || []);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load attendance records');
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, []);

  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    fetchAttendance(lesson.id);
  };

  const handleBack = () => {
    setSelectedLesson(null);
    setAttendanceRecords([]);
  };

  const formatDuration = (joined: string, left: string | null) => {
    if (!left) return 'Still in room';
    const durationMs = new Date(left).getTime() - new Date(joined).getTime();
    const mins = Math.round(durationMs / 1000 / 60);
    if (mins < 1) return '< 1 min';
    return `${mins} min${mins > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 text-uv-purple animate-spin mb-4" />
        <p className="text-text-secondary text-sm font-semibold uppercase tracking-wider font-heading">
          Loading history files...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-grow p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
      {/* View 1: List of Lessons */}
      {!selectedLesson ? (
        <>
          <div>
            <h1 className="text-3xl font-extrabold uppercase font-heading text-text-primary tracking-wide">
              Attendance Records
            </h1>
            <p className="text-sm text-text-secondary">
              Select a lesson from the history log to review student attendance details and room duration.
            </p>
          </div>

          {lessons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lessons.map((lesson) => (
                <Card 
                  key={lesson.id} 
                  className="border-border p-6 flex flex-col justify-between hover:border-uv-purple/35 transition-colors cursor-pointer"
                  onClick={() => handleSelectLesson(lesson)}
                  glow={false}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold font-heading tracking-wider uppercase border ${
                        lesson.status === 'live' 
                          ? 'bg-success/10 border-success/30 text-success' 
                          : lesson.status === 'ended' 
                          ? 'bg-error/10 border-error/30 text-error' 
                          : 'bg-warning/10 border-warning/30 text-warning'
                      }`}>
                        {lesson.status}
                      </span>
                      <span className="font-mono text-xs font-bold text-uv-blue uppercase bg-bg-elevated-2 px-2 py-0.5 rounded border border-border">
                        {lesson.lesson_code}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-text-primary text-base line-clamp-1">{lesson.title}</h3>
                      <p className="text-xs text-text-secondary mt-0.5">Room ID: {lesson.meeting_room}</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-text-disabled pt-4 border-t border-border font-medium">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{lesson.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{lesson.time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 flex items-center justify-between border-t border-border text-xs text-uv-purple font-bold uppercase tracking-wider font-heading">
                    <span>View Attendance</span>
                    <span>→</span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-text-secondary border border-dashed border-border rounded-2xl bg-bg-elevated/20">
              <History className="h-12 w-12 text-text-disabled mb-3" />
              <p className="font-heading uppercase tracking-wider text-sm font-semibold">No lesson history</p>
              <p className="text-xs text-text-disabled mt-1 max-w-xs">
                Attendance logs will populate here once lessons are created.
              </p>
            </div>
          )}
        </>
      ) : (
        /* View 2: Lesson Detail Attendance Sheet */
        <div className="space-y-6">
          {/* Back Action */}
          <button 
            onClick={handleBack}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider font-heading text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Lessons
          </button>

          {/* Lesson Info Card */}
          <Card className="border-border p-6" glow={selectedLesson.status === 'live'}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold font-heading tracking-wider uppercase border ${
                    selectedLesson.status === 'live' 
                      ? 'bg-success/15 border-success/30 text-success' 
                      : selectedLesson.status === 'ended' 
                      ? 'bg-error/15 border-error/30 text-error' 
                      : 'bg-warning/15 border-warning/30 text-warning'
                  }`}>
                    {selectedLesson.status}
                  </span>
                  <span className="font-mono text-xs font-bold text-uv-blue bg-bg-elevated-2 px-2 py-0.5 rounded border border-border">
                    Code: {selectedLesson.lesson_code}
                  </span>
                </div>
                <h2 className="text-2xl font-bold font-heading uppercase text-text-primary">
                  {selectedLesson.title}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-text-secondary">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> {selectedLesson.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {selectedLesson.time}
                  </span>
                  <span>Price: ${Number(selectedLesson.price).toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-bg-elevated-2 border border-border rounded-xl px-5 py-3 text-center shrink-0">
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Total Attendees</p>
                <p className="text-2xl font-bold font-mono text-uv-purple mt-0.5">
                  {attendanceRecords.length}
                </p>
              </div>
            </div>
          </Card>

          {/* Attendance List */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold font-heading uppercase tracking-wide text-text-primary flex items-center gap-2">
              <Users className="h-5 w-5 text-uv-purple" />
              Attendance Sheet
            </h3>

            {loadingRecords ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Loader2 className="h-8 w-8 text-uv-purple animate-spin mb-4" />
                <p className="text-text-secondary text-sm font-semibold uppercase tracking-wider font-heading">
                  Querying sheet records...
                </p>
              </div>
            ) : attendanceRecords.length > 0 ? (
              <div className="overflow-x-auto bg-bg-elevated border border-border rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-[10px] uppercase font-bold tracking-wider text-text-secondary bg-bg-elevated-2">
                      <th className="p-4 pl-6">Student Name</th>
                      <th className="p-4">Phone Number</th>
                      <th className="p-4">Joined At</th>
                      <th className="p-4">Left At</th>
                      <th className="p-4 pr-6 text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map((record) => (
                      <tr key={record.id} className="border-b border-border/50 hover:bg-bg-elevated-2/30 transition-colors text-sm text-text-primary">
                        <td className="p-4 pl-6 font-semibold">{record.student?.name || 'Unknown Student'}</td>
                        <td className="p-4 font-mono text-xs text-text-secondary">{record.student?.phone_number}</td>
                        <td className="p-4 text-xs font-medium text-text-secondary">
                          {new Date(record.joined_at).toLocaleTimeString()}
                        </td>
                        <td className="p-4 text-xs font-medium text-text-secondary">
                          {record.left_at ? new Date(record.left_at).toLocaleTimeString() : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-success/10 text-success text-[10px] font-bold border border-success/20 animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-success animate-ping" />
                              Active
                            </span>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right font-bold text-uv-blue font-heading tracking-wide">
                          {formatDuration(record.joined_at, record.left_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-text-secondary border border-dashed border-border rounded-2xl bg-bg-elevated/20">
                <Users className="h-10 w-10 text-text-disabled mb-3" />
                <p className="font-heading uppercase tracking-wider text-sm font-semibold">No student logins</p>
                <p className="text-xs text-text-disabled mt-1 max-w-xs">
                  {selectedLesson.status === 'scheduled' 
                    ? 'This lesson has not started yet. Logs will record here when students join.'
                    : 'No students joined this live lesson room.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Lesson } from '@/types';
import { ToastContainer, ToastMessage } from '@/components/toast';
import { 
  BookOpen, 
  Plus, 
  X, 
  Loader2, 
  Calendar, 
  Clock, 
  DollarSign, 
  Key, 
  Video, 
  RefreshCw, 
  Trash2,
  Edit2
} from 'lucide-react';

export default function AdminLessonsPage() {
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [price, setPrice] = useState('10.00');
  const [lessonCode, setLessonCode] = useState('');
  const [meetingRoom, setMeetingRoom] = useState('');
  const [formError, setFormError] = useState('');

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
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (error) throw error;
      setLessons((data as Lesson[]) || []);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to fetch lessons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, []);

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'LD-';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setLessonCode(code);
  };

  const generateMeetingRoom = () => {
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    setMeetingRoom(`dance-studio-${rand}`);
  };

  const openAddModal = () => {
    resetForm();
    generateRandomCode();
    generateMeetingRoom();
    // Default date to today, time to current hour + 1
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
    setTime('18:00');
    setIsAddModalOpen(true);
  };

  const openEditModal = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setTitle(lesson.title);
    setDate(lesson.date);
    // Suppress seconds in time string if present
    setTime(lesson.time.substring(0, 5));
    setPrice(Number(lesson.price).toFixed(2));
    setLessonCode(lesson.lesson_code);
    setMeetingRoom(lesson.meeting_room);
    setIsEditModalOpen(true);
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim() || !date || !time || !price || !lessonCode || !meetingRoom) {
      setFormError('All fields are required.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('lessons')
        .insert({
          title: title.trim(),
          date,
          time,
          price: parseFloat(price),
          lesson_code: lessonCode,
          meeting_room: meetingRoom,
          status: 'scheduled'
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Lesson code is already in use. Please regenerate.');
        }
        throw error;
      }

      setLessons(prev => [data as Lesson, ...prev]);
      addToast('success', 'Lesson created successfully.');
      setIsAddModalOpen(false);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create lesson.');
    }
  };

  const handleEditLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLesson) return;
    setFormError('');

    if (!title.trim() || !date || !time || !price || !lessonCode || !meetingRoom) {
      setFormError('All fields are required.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('lessons')
        .update({
          title: title.trim(),
          date,
          time,
          price: parseFloat(price),
          lesson_code: lessonCode,
          meeting_room: meetingRoom,
        })
        .eq('id', selectedLesson.id)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Lesson code is already in use. Please regenerate.');
        }
        throw error;
      }

      setLessons(prev => prev.map(l => l.id === selectedLesson.id ? (data as Lesson) : l));
      addToast('success', 'Lesson updated successfully.');
      setIsEditModalOpen(false);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update lesson.');
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lesson? All student registration history and attendance records for it will be lost.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLessons(prev => prev.filter(l => l.id !== id));
      addToast('success', 'Lesson deleted successfully.');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete lesson');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDate('');
    setTime('');
    setPrice('10.00');
    setLessonCode('');
    setMeetingRoom('');
    setFormError('');
    setSelectedLesson(null);
  };

  return (
    <div className="flex-grow p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold uppercase font-heading text-text-primary tracking-wide">
            Lesson Scheduler
          </h1>
          <p className="text-sm text-text-secondary">
            Manage upcoming dynamic sessions, session prices, and live stream channels.
          </p>
        </div>
        
        <Button 
          variant="gradient" 
          className="h-10 text-xs font-semibold py-0 flex items-center gap-2"
          onClick={openAddModal}
        >
          <Plus className="h-4 w-4" /> Create Lesson
        </Button>
      </div>

      {/* Lesson List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="h-8 w-8 text-uv-purple animate-spin mb-4" />
          <p className="text-text-secondary text-sm font-semibold uppercase tracking-wider font-heading">
            Fetching lessons calendar...
          </p>
        </div>
      ) : lessons.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map((lesson) => (
            <Card key={lesson.id} className="border-border p-6 flex flex-col justify-between" glow={lesson.status === 'live'}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge status={lesson.status} />
                  <span className="font-mono text-xs font-bold text-uv-blue uppercase tracking-wider bg-bg-elevated-2 px-2.5 py-1 rounded-lg border border-border">
                    {lesson.lesson_code}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-text-primary text-base line-clamp-2">{lesson.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <span className="font-mono font-bold text-success">${Number(lesson.price).toFixed(2)}</span>
                    <span className="text-text-disabled">•</span>
                    <span>Room: {lesson.meeting_room}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-text-disabled pt-4 border-t border-border">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{lesson.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{lesson.time}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 mt-6">
                <Button 
                  variant="outline" 
                  className="p-2 h-9 w-9" 
                  onClick={() => openEditModal(lesson)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  variant="error" 
                  className="p-2 h-9 w-9 bg-error/10 hover:bg-error/20" 
                  onClick={() => handleDeleteLesson(lesson.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center text-text-secondary border border-dashed border-border rounded-2xl bg-bg-elevated/20">
          <BookOpen className="h-12 w-12 text-text-disabled mb-3" />
          <p className="font-heading uppercase tracking-wider text-sm font-semibold">No lessons created</p>
          <p className="text-xs text-text-disabled mt-1 max-w-xs">
            Create your first dance session above. Once live, students will be able to join.
          </p>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-8 border-border relative overflow-y-auto max-h-[90vh]" glow>
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-text-disabled hover:text-text-primary cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-bold font-heading uppercase tracking-wide text-text-primary mb-6">
              Create New Lesson
            </h2>

            <form onSubmit={handleAddLesson} className="space-y-4">
              <Input 
                label="Lesson Title"
                type="text"
                placeholder="e.g. Masterclass Amapiano Basics"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
                <Input 
                  label="Time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Input 
                  label="Price ($)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>

              {/* Lesson Code Generator */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Access Lesson Code
                </label>
                <div className="flex gap-2">
                  <div className="flex-grow relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-disabled" />
                    <input 
                      type="text"
                      className="w-full bg-bg-elevated-2 border border-border rounded-xl pl-10 pr-4 py-3.5 text-text-primary font-mono font-bold tracking-widest text-base outline-none focus:border-uv-purple focus:ring-1 focus:ring-uv-purple"
                      value={lessonCode}
                      onChange={(e) => setLessonCode(e.target.value.toUpperCase())}
                      required
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="px-3 py-0 h-[50px] aspect-square rounded-xl"
                    onClick={generateRandomCode}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Live Meeting Room Generator */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Jitsi Room Identifier
                </label>
                <div className="flex gap-2">
                  <div className="flex-grow relative">
                    <Video className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-disabled" />
                    <input 
                      type="text"
                      className="w-full bg-bg-elevated-2 border border-border rounded-xl pl-10 pr-4 py-3.5 text-text-primary font-mono text-sm outline-none focus:border-uv-purple focus:ring-1 focus:ring-uv-purple"
                      value={meetingRoom}
                      onChange={(e) => setMeetingRoom(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      required
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="px-3 py-0 h-[50px] aspect-square rounded-xl"
                    onClick={generateMeetingRoom}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {formError && (
                <div className="text-xs text-error font-semibold bg-error/10 border border-error/20 p-3 rounded-xl">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="px-4 py-2"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="gradient" className="px-5 py-2">
                  Create Lesson
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-8 border-border relative overflow-y-auto max-h-[90vh]" glow>
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-text-disabled hover:text-text-primary cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-bold font-heading uppercase tracking-wide text-text-primary mb-6">
              Edit Lesson Details
            </h2>

            <form onSubmit={handleEditLesson} className="space-y-4">
              <Input 
                label="Lesson Title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
                <Input 
                  label="Time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Input 
                  label="Price ($)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>

              {/* Lesson Code */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Access Lesson Code
                </label>
                <div className="flex gap-2">
                  <div className="flex-grow relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-disabled" />
                    <input 
                      type="text"
                      className="w-full bg-bg-elevated-2 border border-border rounded-xl pl-10 pr-4 py-3.5 text-text-primary font-mono font-bold tracking-widest text-base outline-none focus:border-uv-purple focus:ring-1 focus:ring-uv-purple"
                      value={lessonCode}
                      onChange={(e) => setLessonCode(e.target.value.toUpperCase())}
                      required
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="px-3 py-0 h-[50px] aspect-square rounded-xl"
                    onClick={generateRandomCode}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Jitsi Room ID */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Jitsi Room Identifier
                </label>
                <div className="flex gap-2">
                  <div className="flex-grow relative">
                    <Video className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-disabled" />
                    <input 
                      type="text"
                      className="w-full bg-bg-elevated-2 border border-border rounded-xl pl-10 pr-4 py-3.5 text-text-primary font-mono text-sm outline-none focus:border-uv-purple focus:ring-1 focus:ring-uv-purple"
                      value={meetingRoom}
                      onChange={(e) => setMeetingRoom(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      required
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="px-3 py-0 h-[50px] aspect-square rounded-xl"
                    onClick={generateMeetingRoom}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {formError && (
                <div className="text-xs text-error font-semibold bg-error/10 border border-error/20 p-3 rounded-xl">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="px-4 py-2"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="gradient" className="px-5 py-2">
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

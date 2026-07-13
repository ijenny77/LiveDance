import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Modal, Alert, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { AdminShell } from './AdminShell';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { ToastContainer, useToasts } from '../../components/Toast';
import { colors } from '../../theme';
import { Lesson } from '../../types';
import { supabase } from '../../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminLessons'>;

function randomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'LD-';
  for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function randomRoom() {
  return `dance-studio-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export function AdminLessonsScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [price, setPrice] = useState('10.00');
  const [lessonCode, setLessonCode] = useState('');
  const [meetingRoom, setMeetingRoom] = useState('');
  const [formError, setFormError] = useState('');
  const { toasts, addToast } = useToasts();

  const fetchLessons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .order('date', { ascending: false })
      .order('time', { ascending: false });
    if (error) addToast('error', error.message);
    else setLessons((data as Lesson[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLessons();
  }, []);

  const resetForm = () => {
    setTitle('');
    setDate('');
    setTime('');
    setPrice('10.00');
    setLessonCode('');
    setMeetingRoom('');
    setFormError('');
    setEditing(null);
  };

  const openAdd = () => {
    resetForm();
    setLessonCode(randomCode());
    setMeetingRoom(randomRoom());
    setDate(new Date().toISOString().split('T')[0]);
    setTime('18:00');
    setModalOpen(true);
  };

  const openEdit = (l: Lesson) => {
    setEditing(l);
    setTitle(l.title);
    setDate(l.date);
    setTime(l.time.substring(0, 5));
    setPrice(Number(l.price).toFixed(2));
    setLessonCode(l.lesson_code);
    setMeetingRoom(l.meeting_room);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError('');
    if (!title.trim() || !date || !time || !price || !lessonCode || !meetingRoom) {
      setFormError('All fields are required.');
      return;
    }
    const payload = {
      title: title.trim(),
      date,
      time,
      price: parseFloat(price),
      lesson_code: lessonCode,
      meeting_room: meetingRoom,
    };

    if (editing) {
      const { data, error } = await supabase.from('lessons').update(payload).eq('id', editing.id).select().single();
      if (error) {
        setFormError(error.code === '23505' ? 'Lesson code is already in use.' : error.message);
        return;
      }
      setLessons((prev) => prev.map((l) => (l.id === editing.id ? (data as Lesson) : l)));
      addToast('success', 'Lesson updated.');
    } else {
      const { data, error } = await supabase.from('lessons').insert({ ...payload, status: 'scheduled' }).select().single();
      if (error) {
        setFormError(error.code === '23505' ? 'Lesson code is already in use.' : error.message);
        return;
      }
      setLessons((prev) => [data as Lesson, ...prev]);
      addToast('success', 'Lesson created.');
    }
    setModalOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete lesson?', 'Registration history and attendance records will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('lessons').delete().eq('id', id);
          if (error) addToast('error', error.message);
          else {
            setLessons((prev) => prev.filter((l) => l.id !== id));
            addToast('success', 'Lesson deleted.');
          }
        },
      },
    ]);
  };

  return (
    <AdminShell navigation={navigation} active="AdminLessons" title="Lesson Scheduler" subtitle="Manage sessions, pricing, and live channels.">
      <Button onPress={openAdd}>+ Create Lesson</Button>

      {loading ? (
        <ActivityIndicator color={colors.uvPurple} size="large" style={{ marginTop: 40 }} />
      ) : lessons.length > 0 ? (
        lessons.map((l) => (
          <Card key={l.id} glow={l.status === 'live'}>
            <View style={styles.rowBetween}>
              <Badge status={l.status} />
              <Text style={styles.code}>{l.lesson_code}</Text>
            </View>
            <Text style={styles.lessonTitle}>{l.title}</Text>
            <Text style={styles.meta}>
              ${Number(l.price).toFixed(2)} · Room: {l.meeting_room}
            </Text>
            <Text style={styles.metaSmall}>
              {l.date} at {l.time}
            </Text>
            <View style={styles.actions}>
              <Button variant="outline" onPress={() => openEdit(l)} style={styles.smallBtn}>
                Edit
              </Button>
              <Button variant="error" onPress={() => handleDelete(l.id)} style={styles.smallBtn}>
                Delete
              </Button>
            </View>
          </Card>
        ))
      ) : (
        <Text style={styles.emptyText}>No lessons created yet.</Text>
      )}

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <Card glow style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Lesson' : 'Create Lesson'}</Text>
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <Input label="Lesson Title" value={title} onChangeText={setTitle} />
              <View style={styles.inline}>
                <Input label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} style={{ flex: 1 }} />
                <Input label="Time (HH:MM)" value={time} onChangeText={setTime} style={{ flex: 1 }} />
              </View>
              <Input label="Price ($)" keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
              <Input label="Lesson Code" autoCapitalize="characters" value={lessonCode} onChangeText={(v) => setLessonCode(v.toUpperCase())} />
              <Input label="Jitsi Room Identifier" value={meetingRoom} onChangeText={(v) => setMeetingRoom(v.toLowerCase().replace(/\s+/g, '-'))} />

              {!!formError && <Text style={styles.errorText}>{formError}</Text>}

              <View style={styles.modalActions}>
                <Button variant="outline" onPress={() => setModalOpen(false)} style={{ flex: 1 }}>
                  Cancel
                </Button>
                <Button onPress={handleSave} style={{ flex: 1 }}>
                  Save
                </Button>
              </View>
            </ScrollView>
          </Card>
        </View>
      </Modal>

      <ToastContainer toasts={toasts} />
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  code: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.uvBlue,
    backgroundColor: colors.bgElevated2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  lessonTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 10,
  },
  meta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  metaSmall: {
    fontSize: 11,
    color: colors.textDisabled,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  smallBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    gap: 4,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  inline: {
    flexDirection: 'row',
    gap: 10,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
});

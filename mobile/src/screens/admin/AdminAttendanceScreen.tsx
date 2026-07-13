import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { AdminShell } from './AdminShell';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { ToastContainer, useToasts } from '../../components/Toast';
import { colors } from '../../theme';
import { Lesson, AttendanceJoin } from '../../types';
import { supabase } from '../../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminAttendance'>;

function formatDuration(joined: string, left: string | null) {
  if (!left) return 'Still in room';
  const mins = Math.round((new Date(left).getTime() - new Date(joined).getTime()) / 60000);
  if (mins < 1) return '< 1 min';
  return `${mins} min${mins > 1 ? 's' : ''}`;
}

export function AdminAttendanceScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selected, setSelected] = useState<Lesson | null>(null);
  const [records, setRecords] = useState<AttendanceJoin[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const { toasts, addToast } = useToasts();

  useEffect(() => {
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
    fetchLessons();
  }, []);

  const openLesson = async (lesson: Lesson) => {
    setSelected(lesson);
    setLoadingRecords(true);
    const { data, error } = await supabase
      .from('attendance')
      .select(`id, student_id, lesson_id, joined_at, left_at, student:students (name, phone_number)`)
      .eq('lesson_id', lesson.id)
      .order('joined_at', { ascending: true });
    if (error) addToast('error', error.message);
    else setRecords((data as any[]) || []);
    setLoadingRecords(false);
  };

  if (selected) {
    return (
      <AdminShell navigation={navigation} active="AdminAttendance" title="Attendance Sheet" subtitle={selected.title}>
        <Pressable onPress={() => { setSelected(null); setRecords([]); }}>
          <Text style={styles.backLink}>← Back to Lessons</Text>
        </Pressable>

        <Card glow={selected.status === 'live'}>
          <View style={styles.rowBetween}>
            <Badge status={selected.status} />
            <Text style={styles.code}>{selected.lesson_code}</Text>
          </View>
          <Text style={styles.lessonTitle}>{selected.title}</Text>
          <Text style={styles.meta}>
            {selected.date} at {selected.time} · ${Number(selected.price).toFixed(2)}
          </Text>
          <Text style={styles.attendeeCount}>{records.length} attendees</Text>
        </Card>

        {loadingRecords ? (
          <ActivityIndicator color={colors.uvPurple} size="large" style={{ marginTop: 30 }} />
        ) : records.length > 0 ? (
          records.map((r) => (
            <Card key={r.id}>
              <Text style={styles.studentName}>{r.student?.name || 'Unknown Student'}</Text>
              <Text style={styles.meta}>{r.student?.phone_number}</Text>
              <View style={styles.rowBetween}>
                <Text style={styles.metaSmall}>Joined {new Date(r.joined_at).toLocaleTimeString()}</Text>
                <Text style={styles.metaSmall}>
                  {r.left_at ? `Left ${new Date(r.left_at).toLocaleTimeString()}` : 'Active'}
                </Text>
              </View>
              <Text style={styles.duration}>{formatDuration(r.joined_at, r.left_at)}</Text>
            </Card>
          ))
        ) : (
          <Text style={styles.emptyText}>No student logins for this lesson.</Text>
        )}

        <ToastContainer toasts={toasts} />
      </AdminShell>
    );
  }

  return (
    <AdminShell navigation={navigation} active="AdminAttendance" title="Attendance Records" subtitle="Select a lesson to review its attendance sheet.">
      {loading ? (
        <ActivityIndicator color={colors.uvPurple} size="large" style={{ marginTop: 40 }} />
      ) : lessons.length > 0 ? (
        lessons.map((l) => (
          <Pressable key={l.id} onPress={() => openLesson(l)}>
            <Card>
              <View style={styles.rowBetween}>
                <Badge status={l.status} />
                <Text style={styles.code}>{l.lesson_code}</Text>
              </View>
              <Text style={styles.lessonTitle}>{l.title}</Text>
              <Text style={styles.meta}>
                {l.date} at {l.time} · Room: {l.meeting_room}
              </Text>
              <Text style={styles.viewLink}>View Attendance →</Text>
            </Card>
          </Pressable>
        ))
      ) : (
        <Text style={styles.emptyText}>No lesson history yet.</Text>
      )}
      <ToastContainer toasts={toasts} />
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  backLink: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
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
  },
  attendeeCount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.uvPurple,
    marginTop: 10,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  duration: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.uvBlue,
    marginTop: 6,
  },
  viewLink: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.uvPurple,
    textTransform: 'uppercase',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 30,
  },
});

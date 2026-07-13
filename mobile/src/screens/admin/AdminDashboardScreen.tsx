import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { AdminShell } from './AdminShell';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ToastContainer, useToasts } from '../../components/Toast';
import { colors } from '../../theme';
import { Lesson } from '../../types';
import { supabase } from '../../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminDashboard'>;

export function AdminDashboardScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [studentsCount, setStudentsCount] = useState(0);
  const { toasts, addToast } = useToasts();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });
      if (lessonsError) throw lessonsError;
      setLessons((lessonsData as Lesson[]) || []);

      const { count: pending } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      setPendingCount(pending || 0);

      const { count: students } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });
      setStudentsCount(students || 0);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('admin-dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lessons' }, loadData)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const handleStart = async (id: string) => {
    const { error } = await supabase.from('lessons').update({ status: 'live' }).eq('id', id);
    if (error) addToast('error', error.message);
    else addToast('success', 'Lesson is now LIVE!');
  };

  const handleEnd = async (id: string) => {
    const { error: lessonError } = await supabase.from('lessons').update({ status: 'ended' }).eq('id', id);
    if (lessonError) {
      addToast('error', lessonError.message);
      return;
    }
    await supabase.from('attendance').update({ left_at: new Date().toISOString() }).eq('lesson_id', id).is('left_at', null);
    addToast('success', 'Lesson ended and attendance finalized.');
  };

  const liveLesson = lessons.find((l) => l.status === 'live');
  const nextLesson = lessons.find((l) => l.status === 'scheduled');
  const activeLesson = liveLesson || nextLesson;

  return (
    <AdminShell navigation={navigation} active="AdminDashboard" title="Control Center" subtitle="Manage live streams and monitor registration.">
      {loading ? (
        <ActivityIndicator color={colors.uvPurple} size="large" style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>Total Students</Text>
              <Text style={styles.statValue}>{studentsCount}</Text>
            </Card>
            <Card style={styles.statCard} glow={pendingCount > 0}>
              <Text style={styles.statLabel}>Pending Payments</Text>
              <Text style={[styles.statValue, pendingCount > 0 && { color: colors.warning }]}>{pendingCount}</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>Total Lessons</Text>
              <Text style={styles.statValue}>{lessons.length}</Text>
            </Card>
          </View>

          <Card glow={!!liveLesson}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Instructor Controller</Text>
              {liveLesson ? (
                <Badge status="live" label="LIVE" />
              ) : nextLesson ? (
                <Badge status="scheduled" label="UPCOMING" />
              ) : null}
            </View>

            {activeLesson ? (
              <View style={{ gap: 14 }}>
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Active/Next Lesson</Text>
                  <Text style={styles.infoTitle}>{activeLesson.title}</Text>
                  <Text style={styles.infoMeta}>
                    {activeLesson.date} at {activeLesson.time} · ${Number(activeLesson.price).toFixed(2)} · Room: {activeLesson.meeting_room}
                  </Text>
                </View>

                {activeLesson.status === 'scheduled' ? (
                  <Button onPress={() => handleStart(activeLesson.id)}>Start Lesson</Button>
                ) : activeLesson.status === 'live' ? (
                  <View style={{ gap: 10 }}>
                    <Button variant="error" onPress={() => handleEnd(activeLesson.id)}>
                      End Lesson
                    </Button>
                    <Button
                      variant="outline"
                      onPress={() => navigation.navigate('LessonRoom', { lessonId: activeLesson.id, token: 'admin' })}
                    >
                      Join Instructor View
                    </Button>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={styles.emptyText}>No scheduled lessons. Create one in the Lessons tab.</Text>
            )}
          </Card>
        </>
      )}
      <ToastContainer toasts={toasts} />
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flexGrow: 1,
    minWidth: '30%',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 4,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  infoBox: {
    backgroundColor: colors.bgElevated2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.uvBlue,
    textTransform: 'uppercase',
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  infoMeta: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { colors } from '../theme';
import { Lesson, PaymentStatus } from '../types';
import { resolveSession, joinLessonAttendance } from '../lib/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Status'>;

export function StatusScreen({ route, navigation }: Props) {
  const { token } = route.params;
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [countdown, setCountdown] = useState('');

  const fetchStatus = useCallback(async () => {
    const res = await resolveSession(token);
    if (res.success && res.lesson && res.paymentStatus) {
      setLesson(res.lesson);
      setPaymentStatus(res.paymentStatus);
      setError('');
    } else {
      setError(res.error || 'Failed to retrieve status');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll every 4s for lesson/payment updates — mirrors the web app's approach
  // (no public RLS on payments, so the anon client can't subscribe directly).
  useEffect(() => {
    if (!lesson || lesson.status === 'ended') return;
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, [lesson?.status, fetchStatus]);

  useEffect(() => {
    if (!lesson || lesson.status !== 'scheduled') return;
    const tick = () => {
      const lessonDateTime = new Date(`${lesson.date}T${lesson.time}`);
      const diff = lessonDateTime.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('Starting any minute now...');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      let text = '';
      if (hours > 0) text += `${hours}h `;
      if (minutes > 0 || hours > 0) text += `${minutes}m `;
      text += `${seconds}s`;
      setCountdown(`Starts in: ${text}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lesson]);

  const handleJoin = async () => {
    if (!lesson) return;
    setJoining(true);
    const res = await joinLessonAttendance(token);
    setJoining(false);
    if (res.success) {
      navigation.replace('LessonRoom', { lessonId: lesson.id, token });
    } else {
      setError(res.error || 'Could not join room');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Checking your access credentials...</Text>
      </View>
    );
  }

  if (error || !lesson) {
    return (
      <View style={styles.screen}>
        <Card glow style={styles.centeredCard}>
          <Text style={styles.cardTitle}>Access Denied</Text>
          <Text style={styles.body}>{error || 'Invalid session. Please try again.'}</Text>
          <Button variant="outline" onPress={() => navigation.replace('JoinSession')}>
            ← Try Another Code
          </Button>
        </Card>
      </View>
    );
  }

  const isPending = paymentStatus === 'pending';
  const isRejected = paymentStatus === 'rejected';
  const isApproved = paymentStatus === 'approved';
  const lessonLive = lesson.status === 'live';
  const lessonScheduled = lesson.status === 'scheduled';
  const lessonEnded = lesson.status === 'ended';

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Badge status={lessonLive ? 'live' : lessonEnded ? 'ended' : 'scheduled'} />
        <Text style={styles.title}>{lesson.title}</Text>
        <Text style={styles.code}>
          Code: <Text style={{ color: colors.uvBlue, fontWeight: '700' }}>{lesson.lesson_code}</Text>
        </Text>
      </View>

      {isPending && (
        <Card glow style={styles.centeredCard}>
          <Text style={styles.cardTitle}>Confirming Payment</Text>
          <Text style={styles.body}>
            We are confirming your payment of ${Number(lesson.price).toFixed(2)}. This screen updates
            automatically once the instructor approves it.
          </Text>
          <Text style={styles.hint}>Checking status in real time. Keep the app open.</Text>
        </Card>
      )}

      {isRejected && (
        <Card glow style={styles.centeredCard}>
          <Text style={[styles.cardTitle, { color: colors.error }]}>Payment Rejected</Text>
          <Text style={styles.body}>
            Your payment approval request was rejected. Please contact your instructor.
          </Text>
          <Button variant="outline" onPress={() => navigation.replace('JoinSession')}>
            ← Back to Entry
          </Button>
        </Card>
      )}

      {isApproved && lessonScheduled && (
        <Card glow style={styles.centeredCard}>
          <Text style={styles.cardTitle}>Payment Approved</Text>
          <Text style={[styles.body, { color: colors.success, fontWeight: '700' }]}>Ready to dance</Text>
          <Text style={styles.body}>
            Your registration is confirmed. This screen will open the video room when the lesson goes live.
          </Text>
          <Text style={styles.countdown}>{countdown}</Text>
        </Card>
      )}

      {isApproved && lessonLive && (
        <Card glow style={styles.centeredCard}>
          <Text style={styles.cardTitle}>Lesson is Live!</Text>
          <Text style={[styles.body, { color: colors.uvBlue }]}>Instructor is in the room</Text>
          <Button onPress={handleJoin} isLoading={joining}>
            Join Live Lesson
          </Button>
        </Card>
      )}

      {isApproved && lessonEnded && (
        <Card glow style={styles.centeredCard}>
          <Text style={styles.cardTitle}>Lesson Finished</Text>
          <Text style={styles.body}>This live dance lesson has ended. Hope you had a blast!</Text>
          <Button variant="outline" onPress={() => navigation.replace('JoinSession')}>
            Back to Home
          </Button>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: colors.bgBase,
    padding: 20,
    justifyContent: 'center',
    gap: 20,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  code: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  centeredCard: {
    alignItems: 'center',
    gap: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  body: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  hint: {
    fontSize: 11,
    color: colors.textDisabled,
    textAlign: 'center',
  },
  countdown: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.uvBlue,
    backgroundColor: colors.bgElevated2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    overflow: 'hidden',
  },
});

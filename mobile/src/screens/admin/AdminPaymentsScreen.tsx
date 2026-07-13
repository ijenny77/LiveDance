import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { AdminShell } from './AdminShell';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { ToastContainer, useToasts } from '../../components/Toast';
import { colors } from '../../theme';
import { PaymentJoin } from '../../types';
import { supabase } from '../../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminPayments'>;

export function AdminPaymentsScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentJoin[]>([]);
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [search, setSearch] = useState('');
  const { toasts, addToast } = useToasts();

  const fetchPayments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payments')
      .select(`id, student_id, lesson_id, status, paid_at, student:students (name, phone_number), lesson:lessons (title, price, date)`)
      .order('paid_at', { ascending: false });
    if (error) addToast('error', error.message);
    else setPayments((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();
    const channel = supabase
      .channel('admin-payments-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetchPayments)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from('payments').update({ status: 'approved', paid_at: new Date().toISOString() }).eq('id', id);
    if (error) addToast('error', error.message);
    else addToast('success', 'Payment approved.');
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase.from('payments').update({ status: 'rejected', paid_at: null }).eq('id', id);
    if (error) addToast('error', error.message);
    else addToast('warning', 'Payment rejected.');
  };

  const pending = payments.filter((p) => p.status === 'pending');
  const history = payments.filter((p) => p.status !== 'pending');
  const active = tab === 'pending' ? pending : history;
  const filtered = active.filter(
    (p) =>
      p.student?.name.toLowerCase().includes(search.toLowerCase()) ||
      p.student?.phone_number.includes(search) ||
      p.lesson?.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell navigation={navigation} active="AdminPayments" title="Payment Approval" subtitle="Process pending admissions and trace history.">
      <View style={styles.tabRow}>
        <Pressable onPress={() => setTab('pending')} style={[styles.tabBtn, tab === 'pending' && styles.tabBtnActive]}>
          <Text style={[styles.tabBtnText, tab === 'pending' && styles.tabBtnTextActive]}>Pending ({pending.length})</Text>
        </Pressable>
        <Pressable onPress={() => setTab('history')} style={[styles.tabBtn, tab === 'history' && styles.tabBtnActive]}>
          <Text style={[styles.tabBtnText, tab === 'history' && styles.tabBtnTextActive]}>History ({history.length})</Text>
        </Pressable>
      </View>

      <Input placeholder="Search student or lesson..." value={search} onChangeText={setSearch} />

      {loading ? (
        <ActivityIndicator color={colors.uvPurple} size="large" style={{ marginTop: 40 }} />
      ) : filtered.length > 0 ? (
        filtered.map((p) => (
          <Card key={p.id}>
            <Text style={styles.studentName}>{p.student?.name || 'Unknown Student'}</Text>
            <Text style={styles.meta}>{p.student?.phone_number}</Text>
            <Text style={styles.meta}>Lesson: {p.lesson?.title || 'Unknown'}</Text>
            <View style={styles.rowBetween}>
              <Text style={styles.price}>${Number(p.lesson?.price || 0).toFixed(2)}</Text>
              {p.status === 'pending' ? (
                <View style={styles.actions}>
                  <Button variant="success" onPress={() => handleApprove(p.id)} style={styles.smallBtn}>
                    Approve
                  </Button>
                  <Button variant="error" onPress={() => handleReject(p.id)} style={styles.smallBtn}>
                    Reject
                  </Button>
                </View>
              ) : (
                <Text style={[styles.statusText, { color: p.status === 'approved' ? colors.success : colors.error }]}>
                  {p.status.toUpperCase()}
                </Text>
              )}
            </View>
          </Card>
        ))
      ) : (
        <Text style={styles.emptyText}>
          {tab === 'pending' ? 'Payments queue is empty.' : 'No history yet.'}
        </Text>
      )}

      <ToastContainer toasts={toasts} />
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: colors.uvPurple,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  tabBtnTextActive: {
    color: '#fff',
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  meta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.success,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 30,
  },
});

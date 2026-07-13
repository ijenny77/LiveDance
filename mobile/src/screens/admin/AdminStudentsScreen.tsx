import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Modal, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { AdminShell } from './AdminShell';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { ToastContainer, useToasts } from '../../components/Toast';
import { colors } from '../../theme';
import { Student } from '../../types';
import { supabase } from '../../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminStudents'>;

export function AdminStudentsScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState('');
  const { toasts, addToast } = useToasts();

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('students').select('*').order('name', { ascending: true });
    if (error) addToast('error', error.message);
    else setStudents((data as Student[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const resetForm = () => {
    setName('');
    setPhone('');
    setFormError('');
    setEditing(null);
  };

  const openAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (s: Student) => {
    setEditing(s);
    setName(s.name);
    setPhone(s.phone_number);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError('');
    const cleanPhone = phone.replace(/\s+/g, '');
    if (!name.trim() || cleanPhone.length < 9) {
      setFormError('Please provide a valid name and phone number.');
      return;
    }

    if (editing) {
      const { data, error } = await supabase
        .from('students')
        .update({ name: name.trim(), phone_number: cleanPhone })
        .eq('id', editing.id)
        .select()
        .single();
      if (error) {
        setFormError(error.code === '23505' ? 'A student with this phone number is already registered.' : error.message);
        return;
      }
      setStudents((prev) => prev.map((s) => (s.id === editing.id ? (data as Student) : s)));
      addToast('success', 'Student updated.');
    } else {
      const { data, error } = await supabase
        .from('students')
        .insert({ name: name.trim(), phone_number: cleanPhone })
        .select()
        .single();
      if (error) {
        setFormError(error.code === '23505' ? 'A student with this phone number is already registered.' : error.message);
        return;
      }
      setStudents((prev) => [...prev, data as Student].sort((a, b) => a.name.localeCompare(b.name)));
      addToast('success', 'Student added.');
    }
    setModalOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove student?', 'This deletes their payments and attendance records too.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('students').delete().eq('id', id);
          if (error) addToast('error', error.message);
          else {
            setStudents((prev) => prev.filter((s) => s.id !== id));
            addToast('success', 'Student removed.');
          }
        },
      },
    ]);
  };

  const filtered = students.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.phone_number.includes(search)
  );

  return (
    <AdminShell navigation={navigation} active="AdminStudents" title="Student Registry" subtitle="Manage dancer details and registrations.">
      <Button onPress={openAdd}>+ Add Student</Button>
      <Input placeholder="Search by name or phone..." value={search} onChangeText={setSearch} />

      {loading ? (
        <ActivityIndicator color={colors.uvPurple} size="large" style={{ marginTop: 40 }} />
      ) : filtered.length > 0 ? (
        filtered.map((s) => (
          <Card key={s.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{s.name}</Text>
              <Text style={styles.meta}>{s.phone_number}</Text>
              <Text style={styles.metaSmall}>Registered {new Date(s.date_registered).toLocaleDateString()}</Text>
            </View>
            <View style={styles.actions}>
              <Button variant="outline" onPress={() => openEdit(s)} style={styles.smallBtn}>
                Edit
              </Button>
              <Button variant="error" onPress={() => handleDelete(s.id)} style={styles.smallBtn}>
                Delete
              </Button>
            </View>
          </Card>
        ))
      ) : (
        <Text style={styles.emptyText}>No students found.</Text>
      )}

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <Card glow style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Dancer Profile' : 'Add New Dancer'}</Text>
            <View style={{ gap: 14 }}>
              <Input label="Full Name" value={name} onChangeText={setName} />
              <Input label="Phone Number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
              {!!formError && <Text style={styles.errorText}>{formError}</Text>}
              <View style={styles.modalActions}>
                <Button variant="outline" onPress={() => setModalOpen(false)} style={{ flex: 1 }}>
                  Cancel
                </Button>
                <Button onPress={handleSave} style={{ flex: 1 }}>
                  Save
                </Button>
              </View>
            </View>
          </Card>
        </View>
      </Modal>

      <ToastContainer toasts={toasts} />
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  meta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metaSmall: {
    fontSize: 10,
    color: colors.textDisabled,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
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
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    marginBottom: 16,
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

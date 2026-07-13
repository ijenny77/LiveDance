import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { colors } from '../theme';
import { startStudentSession } from '../lib/api';

type Props = NativeStackScreenProps<RootStackParamList, 'JoinSession'>;

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
}

export function JoinSessionScreen({ navigation }: Props) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [lessonCode, setLessonCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    const cleanPhone = phoneNumber.replace(/\s+/g, '');

    if (cleanPhone.length < 9) {
      setError('Please enter a valid phone number');
      return;
    }
    if (!lessonCode) {
      setError('Please enter a lesson code');
      return;
    }

    setIsLoading(true);
    const res = await startStudentSession(cleanPhone, lessonCode);
    setIsLoading(false);

    if (res.success && res.token) {
      navigation.replace('Status', { token: res.token });
    } else {
      setError(res.error || 'Failed to start session');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoGlyph}>♪</Text>
        </View>
        <Text style={styles.title}>
          LiveDance <Text style={{ color: colors.uvBlue }}>Academy</Text>
        </Text>
        <Text style={styles.subtitle}>Learn Amapiano and urban dance live with top instructors</Text>
      </View>

      <Card glow style={styles.card}>
        <Text style={styles.sectionTitle}>Join the session</Text>

        <View style={{ gap: 16 }}>
          <Input
            label="Phone Number"
            placeholder="e.g. 0772 123 456"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={(v) => setPhoneNumber(formatPhone(v))}
            editable={!isLoading}
          />
          <Input
            label="Lesson Code"
            placeholder="e.g. DANCE-101"
            autoCapitalize="characters"
            value={lessonCode}
            onChangeText={(v) => setLessonCode(v.toUpperCase().trim())}
            editable={!isLoading}
          />

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Button onPress={handleSubmit} isLoading={isLoading}>
            Enter Session
          </Button>
        </View>

        <Text style={styles.footnote}>No account needed — just your number and lesson code.</Text>
      </Card>

      <Pressable onPress={() => navigation.navigate('AdminLogin')} style={styles.adminLink}>
        <Text style={styles.adminLinkText}>Instructor login →</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    height: 56,
    width: 56,
    borderRadius: 18,
    backgroundColor: colors.uvPurple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoGlyph: {
    fontSize: 26,
    color: colors.textPrimary,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
  },
  card: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    marginBottom: 18,
  },
  errorBox: {
    backgroundColor: 'rgba(255,77,109,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,77,109,0.3)',
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  footnote: {
    fontSize: 11,
    color: colors.textDisabled,
    textAlign: 'center',
    marginTop: 20,
  },
  adminLink: {
    alignSelf: 'center',
    marginTop: 24,
    padding: 8,
  },
  adminLinkText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});

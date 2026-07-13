import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme';
import { supabase } from '../../lib/supabase';

type Nav = NativeStackNavigationProp<RootStackParamList, any>;

const TABS: { key: keyof RootStackParamList; label: string }[] = [
  { key: 'AdminDashboard', label: 'Dashboard' },
  { key: 'AdminLessons', label: 'Lessons' },
  { key: 'AdminPayments', label: 'Payments' },
  { key: 'AdminStudents', label: 'Students' },
  { key: 'AdminAttendance', label: 'Attendance' },
];

interface AdminShellProps {
  navigation: Nav;
  active: keyof RootStackParamList;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

// Mirrors app/admin/layout.tsx: gate every admin screen behind an active Supabase
// Auth session, and provide the tab bar admin-navbar.tsx renders on the web.
export function AdminShell({ navigation, active, title, subtitle, children }: AdminShellProps) {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (!session) {
        navigation.replace('AdminLogin');
      } else {
        setChecking(false);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigation.replace('AdminLogin');
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigation]);

  if (checking) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.uvPurple} size="large" />
      </View>
    );
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.replace('AdminLogin');
  };

  return (
    <View style={styles.screen}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => tab.key !== active && navigation.replace(tab.key as any)}
            style={[styles.tab, tab.key === active && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab.key === active && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
        <Pressable onPress={handleLogout} style={styles.tab}>
          <Text style={[styles.tabText, { color: colors.error }]}>Logout</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  tabBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.uvPurple,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  tabTextActive: {
    color: '#fff',
  },
  titleRow: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingTop: 8,
    gap: 16,
  },
});

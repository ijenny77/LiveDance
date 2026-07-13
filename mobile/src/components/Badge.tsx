import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

type Status = 'pending' | 'approved' | 'rejected' | 'scheduled' | 'live' | 'ended' | 'error';

interface BadgeProps {
  status: Status;
  label?: string;
}

export function Badge({ status, label }: BadgeProps) {
  let bg = colors.warning;
  let text = label || status.toUpperCase();

  if (status === 'live') {
    bg = colors.uvPurple;
    text = label || 'LIVE NOW';
  } else if (status === 'approved') {
    bg = colors.success;
    text = label || 'APPROVED';
  } else if (status === 'pending' || status === 'scheduled') {
    bg = colors.warning;
    text = label || (status === 'scheduled' ? 'SCHEDULED' : 'PENDING');
  } else if (status === 'rejected' || status === 'ended' || status === 'error') {
    bg = colors.error;
    text = label || (status === 'ended' ? 'ENDED' : status.toUpperCase());
  }

  return (
    <View style={[styles.badge, { borderColor: bg, backgroundColor: `${bg}22` }]}>
      {status === 'live' && <View style={[styles.dot, { backgroundColor: bg }]} />}
      <Text style={[styles.text, { color: bg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

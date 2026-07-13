import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

interface CardProps {
  children: React.ReactNode;
  glow?: boolean;
  style?: ViewStyle;
}

export function Card({ children, glow = false, style }: CardProps) {
  return (
    <View style={[styles.card, glow && styles.glow, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 20,
  },
  glow: {
    shadowColor: colors.uvPurple,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});

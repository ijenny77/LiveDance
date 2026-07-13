import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

export type ToastType = 'success' | 'warning' | 'error';
export interface ToastMessage {
  id: string;
  type: ToastType;
  text: string;
}

const TYPE_COLOR: Record<ToastType, string> = {
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
};

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastType, text: string) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return { toasts, addToast };
}

export function ToastContainer({ toasts }: { toasts: ToastMessage[] }) {
  if (toasts.length === 0) return null;
  return (
    <View style={styles.container} pointerEvents="none">
      {toasts.map((t) => (
        <View key={t.id} style={[styles.toast, { borderColor: TYPE_COLOR[t.type] }]}>
          <Text style={[styles.text, { color: TYPE_COLOR[t.type] }]}>{t.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    gap: 8,
    zIndex: 100,
  },
  toast: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});

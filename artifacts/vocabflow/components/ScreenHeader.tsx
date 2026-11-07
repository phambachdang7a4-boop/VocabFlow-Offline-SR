import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { F } from '@/components/ui';

export function ScreenHeader({ kicker, title, right }: { kicker: string; title: string; right?: React.ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const top = Platform.OS === 'web' ? 67 : insets.top;
  return (
    <View style={[styles.wrap, { paddingTop: top + 12, backgroundColor: c.header }]}>
      <View style={{ flex: 1 }}>
        <View style={styles.kickRow}>
          <View style={[styles.seal, { backgroundColor: c.navigationActive }]} />
          <Text style={[styles.kicker, { color: c.headerMuted }]}>{kicker}</Text>
        </View>
        <Text style={[styles.title, { color: c.headerForeground }]} numberOfLines={1}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

export function useBottomPad() {
  const insets = useSafeAreaInsets();
  return (Platform.OS === 'web' ? 84 : 60 + insets.bottom) + 24;
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingBottom: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  kickRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  seal: { width: 8, height: 8, borderRadius: 2, transform: [{ rotate: '45deg' }] },
  kicker: { fontFamily: F.s, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { fontFamily: F.b, fontSize: 30, letterSpacing: -0.6 },
});

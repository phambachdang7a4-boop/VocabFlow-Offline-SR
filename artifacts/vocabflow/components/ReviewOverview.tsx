import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { ReviewOverview } from '@/domain/review-overview';
import { F, MaterialSheen } from '@/components/ui';

const CHART_H = 210;

function compact(n: number) {
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1).replace('.0', '')}K`;
  if (n < 1000000) return `${Math.round(n / 1000)}K`;
  return `${(n / 1000000).toFixed(1)}M`;
}

export function LevelDistributionChart({ levels }: { levels: ReviewOverview['levels'] }) {
  const c = useColors();
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(0, ...levels.map(l => l.count));
  const pick = selected ? levels[selected - 1] : null;
  return (
    <View testID="review-level-chart">
      <View style={[styles.plot, { height: CHART_H + 26 }]}>
        {levels.map(({ level, count }) => {
          const h = max > 0 ? (count / max) * CHART_H : 0;
          const active = selected === level;
          return (
            <Pressable key={level} testID={`review-level-${level}`} style={styles.col}
              accessibilityRole="button"
              accessibilityLabel={`Cấp ${level}: ${count.toLocaleString('vi-VN')} từ`}
              onPress={() => setSelected(v => (v === level ? null : level))}>
              <Text numberOfLines={1} style={[styles.count, { color: active ? c.chartBarStrong : c.foreground }]}>{compact(count)}</Text>
              <View style={{ height: h, alignSelf: 'stretch', backgroundColor: active ? c.chartBarStrong : c.chartBar, borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />
            </Pressable>
          );
        })}
      </View>
      <View style={{ height: 2, backgroundColor: c.chartBase, borderRadius: 1 }} />
      <View style={styles.axis}>
        {levels.map(({ level }) => (
          <Text key={level} style={[styles.level, { color: selected === level ? c.chartBarStrong : c.mutedForeground }]}>{level}</Text>
        ))}
      </View>
      <Text style={[styles.caption, { color: c.mutedForeground }]} accessibilityLiveRegion="polite">
        {pick ? `Cấp ${pick.level}: ${pick.count.toLocaleString('vi-VN')} từ` : 'Số từ theo cấp ôn 1–6 · gồm cả từ đã hoàn tất và đóng băng. Chạm cột để xem số đầy đủ.'}
      </Text>
    </View>
  );
}

export function SavedTotal({ total, frozen, completed }: { total: number; frozen: number; completed: number }) {
  const c = useColors();
  return (
    <View style={[styles.total, {
      backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius + 8,
      shadowColor: c.shade, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.14, shadowRadius: 7, elevation: 3,
    }]}>
      <MaterialSheen radius={c.radius + 8} />
      <View style={[styles.icon, { backgroundColor: c.secondary }]}>
        <Feather name="book" size={18} color={c.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.totalLabel, { color: c.mutedForeground }]}>Sổ từ đã có</Text>
        <Text style={[styles.sub, { color: c.mutedForeground }]}>{completed} hoàn tất · {frozen} đóng băng</Text>
      </View>
      <Text testID="review-total" style={[styles.totalNum, { color: c.foreground }]}>{total.toLocaleString('vi-VN')}</Text>
    </View>
  );
}

export function ReviewStatusBar({ testID, icon, title, body }: { testID: string; icon: keyof typeof Feather.glyphMap; title: string; body: string }) {
  const c = useColors();
  return (
    <View testID={testID} accessibilityRole="text" accessibilityLabel={`${title}. ${body}`}
      style={[styles.bar, {
        backgroundColor: c.reviewTrack, borderRadius: 999,
        shadowColor: c.shade, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
      }]}>
      <Feather name={icon} size={18} color={c.primary} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.barTitle, { color: c.secondaryForeground }]} numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
        <Text style={[styles.sub, { color: c.mutedForeground }]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: '100%' },
  count: { fontFamily: F.b, fontSize: 12 },
  axis: { flexDirection: 'row', gap: 8, marginTop: 8 },
  level: { flex: 1, textAlign: 'center', fontFamily: F.b, fontSize: 18 },
  caption: { fontFamily: F.m, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 10 },
  total: { position: 'relative', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  totalLabel: { fontFamily: F.s, fontSize: 14 },
  totalNum: { fontFamily: F.b, fontSize: 26, letterSpacing: -0.5 },
  sub: { fontFamily: F.r, fontSize: 12, lineHeight: 17 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 18 },
  barTitle: { fontFamily: F.b, fontSize: 18, fontVariant: ['tabular-nums'] },
});

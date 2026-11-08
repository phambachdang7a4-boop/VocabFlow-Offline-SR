import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { F } from '@/components/ui';
import type { ReviewStatistics } from '@/domain/review-statistics';

function percent(value: number | null) {
  return value === null ? '—' : `${Math.round(value)}%`;
}

export function NotebookStatistics({ totalWords, statistics }: {
  totalWords: number;
  statistics: ReviewStatistics;
}) {
  const c = useColors();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const selected = statistics.days.find(day => day.day === selectedDay)
    ?? statistics.days.find(day => day.isToday)
    ?? statistics.days[6];
  const maxReviews = Math.max(1, ...statistics.days.map(day => day.reviewedCount));
  const summaryItems = [
    { label: 'Từ trong sổ', value: totalWords.toLocaleString('vi-VN') },
    { label: 'Lượt ôn tuần này', value: statistics.weekReviewed.toLocaleString('vi-VN') },
    { label: 'Độ chính xác tuần này', value: percent(statistics.weekAccuracy) },
    { label: 'Độ chính xác tổng', value: percent(statistics.lifetimeAccuracy) },
  ];

  return (
    <View testID="notebook-statistics" style={[
      styles.card,
      { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius + 8 },
    ]}>
      <View style={styles.headingRow}>
        <Text style={[styles.heading, { color: c.foreground }]}>Thống kê học tập</Text>
        <Text style={[styles.range, { color: c.mutedForeground }]}>
          {statistics.days[0].dateLabel}–{statistics.days[6].dateLabel}
        </Text>
      </View>

      <View style={styles.summaryGrid}>
        {summaryItems.map(item => (
          <View key={item.label} style={[styles.summaryItem, { backgroundColor: c.secondary }]}>
            <Text style={[styles.summaryValue, { color: c.secondaryForeground }]} numberOfLines={1} adjustsFontSizeToFit>
              {item.value}
            </Text>
            <Text style={[styles.summaryLabel, { color: c.mutedForeground }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.chartTitle, { color: c.foreground }]}>Số lượt ôn mỗi ngày</Text>
      <View testID="notebook-weekly-chart" style={styles.chart}>
        {statistics.days.map(day => {
          const isSelected = day.day === selected.day;
          const barHeight = day.reviewedCount === 0
            ? 2
            : Math.max(4, (day.reviewedCount / maxReviews) * 82);
          const dayAccuracy = percent(day.accuracy);
          return (
            <Pressable
              key={day.day}
              testID={`notebook-stat-day-${day.day}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${day.weekdayLabel}, ${day.dateLabel}: ${day.reviewedCount} lượt ôn, ${day.correctCount} đúng, độ chính xác ${dayAccuracy}`}
              onPress={() => setSelectedDay(day.day)}
              style={styles.dayColumn}
            >
              <Text style={[styles.count, { color: isSelected ? c.chartBarStrong : c.mutedForeground }]}>
                {day.reviewedCount}
              </Text>
              <View style={styles.barTrack}>
                <View style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: isSelected ? c.chartBarStrong : c.chartBar,
                  },
                ]} />
              </View>
              <Text style={[styles.weekday, { color: isSelected ? c.primary : c.mutedForeground }]}>
                {day.weekdayLabel}
              </Text>
              <Text style={[styles.date, { color: c.mutedForeground }]}>{day.dateLabel.slice(0, 2)}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.baseline, { backgroundColor: c.chartBase }]} />

      <View accessibilityLiveRegion="polite" style={[styles.dayDetail, { backgroundColor: c.reviewTrack }]}>
        <Text style={[styles.detailTitle, { color: c.secondaryForeground }]}>
          {selected.weekdayLabel} · {selected.dateLabel}
        </Text>
        <Text style={[styles.detailText, { color: c.mutedForeground }]}>
          {selected.reviewedCount
            ? `${selected.reviewedCount} lượt · ${selected.correctCount} đúng · ${dayAccuracyLabel(selected)}`
            : 'Chưa có lượt ôn trong ngày này.'}
        </Text>
      </View>
      <Text style={[styles.note, { color: c.mutedForeground }]}>
        Chỉ tính lượt ôn từ bản cập nhật này; lịch sử cũ không lưu kết quả đúng/sai.
      </Text>
    </View>
  );
}

function dayAccuracyLabel(day: ReviewStatistics['days'][number]) {
  return `chính xác ${percent(day.accuracy)}`;
}

const styles = StyleSheet.create({
  card: { padding: 14, borderWidth: 1, gap: 10 },
  headingRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  heading: { fontFamily: F.b, fontSize: 18 },
  range: { fontFamily: F.m, fontSize: 11 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryItem: { flexBasis: '47%', flexGrow: 1, minHeight: 62, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, justifyContent: 'center', gap: 2 },
  summaryValue: { fontFamily: F.b, fontSize: 20, fontVariant: ['tabular-nums'] },
  summaryLabel: { fontFamily: F.m, fontSize: 10, lineHeight: 14 },
  chartTitle: { fontFamily: F.s, fontSize: 13, marginTop: 2 },
  chart: { height: 122, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4 },
  dayColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3, height: '100%' },
  count: { fontFamily: F.b, fontSize: 11, fontVariant: ['tabular-nums'] },
  barTrack: { height: 82, justifyContent: 'flex-end', width: '62%', alignItems: 'stretch' },
  bar: { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  weekday: { fontFamily: F.s, fontSize: 10 },
  date: { fontFamily: F.r, fontSize: 9 },
  baseline: { height: 2, borderRadius: 1, marginTop: -2 },
  dayDetail: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, gap: 2 },
  detailTitle: { fontFamily: F.s, fontSize: 12 },
  detailText: { fontFamily: F.r, fontSize: 11, lineHeight: 15 },
  note: { fontFamily: F.r, fontSize: 10, lineHeight: 14 },
});

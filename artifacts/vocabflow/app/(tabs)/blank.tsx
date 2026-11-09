import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { ScreenHeader, useBottomPad } from '@/components/ScreenHeader';
import { ErrorBanner, F } from '@/components/ui';
import { getDailyMissionOverview, type DailyMissionOverview } from '@/data/vocabulary';

export default function BlankScreen() {
  const c = useColors();
  const bottom = useBottomPad();
  const [overview, setOverview] = useState<DailyMissionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOverview(await getDailyMissionOverview());
      setError(null);
    } catch {
      setError('Không thể tải nhiệm vụ hôm nay. Tiến độ vẫn được giữ trên thiết bị.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  return (
    <View testID="missions-screen" style={[styles.flex, { backgroundColor: c.background }]}>
      <ScreenHeader kicker="THỬ THÁCH MỖI NGÀY" title="Nhiệm Vụ" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}
        <View style={[styles.walletCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.walletIcon, { backgroundColor: c.accent }]}>
            <Feather name="award" size={24} color={c.buttonForeground} />
          </View>
          <View style={styles.walletText}>
            <Text style={[styles.walletLabel, { color: c.mutedForeground }]}>SỐ DƯ</Text>
            {loading && !overview ? (
              <ActivityIndicator color={c.primary} />
            ) : (
              <Text testID="stone-balance" style={[styles.walletValue, { color: c.foreground }]}>
                {(overview?.stoneBalance ?? 0).toLocaleString('vi-VN')} Stone
              </Text>
            )}
          </View>
          <Text style={[styles.walletDate, { color: c.mutedForeground }]}>Hôm nay</Text>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Ba nhiệm vụ hôm nay</Text>
          <Text style={[styles.sectionHint, { color: c.mutedForeground }]}>Mỗi ngày có nhiệm vụ mới</Text>
        </View>

        {loading && !overview ? (
          <View style={styles.loading}>
            <ActivityIndicator color={c.primary} />
            <Text style={[styles.loadingText, { color: c.mutedForeground }]}>Đang tải nhiệm vụ…</Text>
          </View>
        ) : overview?.missions.map((mission) => {
          const finished = mission.rewarded;
          const iconName = mission.type === 'review'
            ? 'layers'
            : mission.type === 'add-words'
              ? 'plus-circle'
              : mission.type === 'lesson'
                ? 'book-open'
                : 'award';
          const progressPercent = Math.min(100, (mission.progress / mission.target) * 100);
          return (
            <View
              key={mission.id}
              testID={`daily-mission-${mission.id}`}
              accessibilityLabel={`${mission.title}. ${mission.progress} trên ${mission.target}. Phần thưởng ${mission.stoneReward} Stone${finished ? ', đã nhận' : ''}.`}
              style={[
                styles.missionCard,
                {
                  backgroundColor: finished ? c.successSoft : c.card,
                  borderColor: finished ? c.success : c.border,
                },
              ]}
            >
              <View style={styles.missionTop}>
                <View style={[styles.missionIcon, { backgroundColor: finished ? c.success : c.vocabCardAccent }]}>
                  <Feather name={finished ? 'check' : iconName} size={21} color={finished ? '#FFFFFF' : c.buttonForeground} />
                </View>
                <View style={styles.missionCopy}>
                  <Text style={[styles.level, { color: finished ? c.successText : c.primary }]}>CẤP {mission.level}</Text>
                  <Text style={[styles.missionTitle, { color: finished ? c.successText : c.foreground }]}>{mission.title}</Text>
                  <Text style={[styles.missionDescription, { color: c.mutedForeground }]}>{mission.description}</Text>
                </View>
                <View style={[styles.rewardPill, { backgroundColor: finished ? c.success : c.accent }]}>
                  <Text style={[styles.rewardText, { color: finished ? '#FFFFFF' : c.buttonForeground }]}>
                    {finished ? 'Đã nhận' : `+${mission.stoneReward}`}
                  </Text>
                  {!finished ? <Text style={[styles.rewardUnit, { color: c.buttonForeground }]}>Stone</Text> : null}
                </View>
              </View>
              <View style={styles.progressRow}>
                <View style={[styles.track, { backgroundColor: c.muted }]}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${progressPercent}%`, backgroundColor: finished ? c.success : c.accent },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: finished ? c.successText : c.primary }]}>
                  {mission.progress}/{mission.target}
                </Text>
              </View>
            </View>
          );
        })}
        <Text style={[styles.footerNote, { color: c.mutedForeground }]}>
          Stone và tiến độ nhiệm vụ được lưu offline, rồi đồng bộ cùng dữ liệu tài khoản.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 12 },
  walletCard: { borderWidth: 1, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  walletIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  walletText: { flex: 1, gap: 3 },
  walletLabel: { fontFamily: F.s, fontSize: 10, letterSpacing: 1.2 },
  walletValue: { fontFamily: F.b, fontSize: 20 },
  walletDate: { fontFamily: F.m, fontSize: 12 },
  sectionHeading: { gap: 2, marginTop: 6, marginBottom: 2 },
  sectionTitle: { fontFamily: F.b, fontSize: 20 },
  sectionHint: { fontFamily: F.r, fontSize: 13 },
  loading: { padding: 30, alignItems: 'center', gap: 10 },
  loadingText: { fontFamily: F.r, fontSize: 14 },
  missionCard: { borderWidth: 1, borderRadius: 20, padding: 15, gap: 13 },
  missionTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  missionIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  missionCopy: { flex: 1, gap: 3 },
  level: { fontFamily: F.s, fontSize: 10, letterSpacing: 1 },
  missionTitle: { fontFamily: F.b, fontSize: 16, lineHeight: 21 },
  missionDescription: { fontFamily: F.r, fontSize: 12, lineHeight: 17 },
  rewardPill: { minWidth: 52, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, alignItems: 'center' },
  rewardText: { fontFamily: F.b, fontSize: 13 },
  rewardUnit: { fontFamily: F.m, fontSize: 9 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  track: { flex: 1, height: 8, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  progressText: { minWidth: 34, textAlign: 'right', fontFamily: F.b, fontSize: 12 },
  footerNote: { fontFamily: F.r, fontSize: 11, lineHeight: 16, marginTop: 2, marginBottom: 4 },
});

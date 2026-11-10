import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { ErrorBanner, F, MaterialSheen } from '@/components/ui';
import { attemptMissionChestUpgrade, getMissionChest } from '@/data/vocabulary';
import {
  CHEST_RARITIES,
  CHEST_RARITY_COLORS,
  CHEST_RARITY_ICON_COLORS,
  CHEST_RARITY_LABELS,
  CHEST_RARITY_TEXT_COLORS,
  chestUpgradeChance,
  maxChestUpgradeAttempts,
  type ChestRarity,
  type MissionChest,
} from '@/domain/mission-chests';

function rarityDisplayLabel(rarity: ChestRarity): string {
  return rarity === 'legendary' ? 'Corvi · Hắc Diệu Thạch' : CHEST_RARITY_LABELS[rarity];
}

export default function MissionChestScreen() {
  const c = useColors();
  const { chestId } = useLocalSearchParams<{ chestId: string }>();
  const id = Array.isArray(chestId) ? chestId[0] : chestId;
  const [chest, setChest] = useState<MissionChest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ruleSet = chest?.ruleSet ?? 1;
  const superUpgrade = chest?.superUpgrade ?? false;
  const attemptLimit = maxChestUpgradeAttempts(ruleSet, superUpgrade);
  const nextAttempt = (chest?.upgradeAttempts ?? 0) + 1;
  const tierIndex = chest ? CHEST_RARITIES.indexOf(chest.rarity) : -1;
  const nextRarity = tierIndex >= 0 ? CHEST_RARITIES[tierIndex + 1] : undefined;
  const chance = chest ? chestUpgradeChance(chest.rarity, nextAttempt, ruleSet, superUpgrade) : null;
  const specialAttempt = superUpgrade && nextAttempt === 4;

  const load = useCallback(async () => {
    if (!id) {
      setError('Không tìm thấy mã rương.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const saved = await getMissionChest(id);
      setChest(saved);
      setError(saved ? null : 'Không tìm thấy rương này trên thiết bị.');
    } catch {
      setError('Không thể tải rương. Dữ liệu vẫn được giữ trên thiết bị.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const upgrade = async () => {
    if (!id || !chest || chest.opened || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await attemptMissionChestUpgrade(id);
      setChest(result.chest);
      const usedSuperUpgrade = result.chest.ruleSet === 2 &&
        result.chest.superUpgrade &&
        result.chest.upgradeAttempts === 4;
      if (result.finished) {
        setMessage(
          result.succeeded
            ? `${usedSuperUpgrade ? 'Nâng Cấp Siêu Việt thành công! ' : ''}Rương đạt ${rarityDisplayLabel(result.chest.rarity)}! Bạn nhận ${result.awardedStone} Stone và 1 mảnh ${rarityDisplayLabel(result.chest.rarity)}.`
            : `Lần nâng cấp không thành công. Rương giữ phẩm chất ${rarityDisplayLabel(result.chest.rarity)}; bạn nhận ${result.awardedStone} Stone và 1 mảnh.`,
        );
      } else {
        setMessage(`Nâng cấp thành công! Rương đã lên ${rarityDisplayLabel(result.chest.rarity)}. Bạn có thể thử tiếp.`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể mở rương.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={styles.content}>
      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}
      {loading ? <ActivityIndicator color={c.primary} /> : null}
      {!loading && chest ? (
        <>
          <View style={[
            styles.chestCard,
            {
              backgroundColor: c.card,
              borderColor: chest.rarity === 'legendary' ? CHEST_RARITY_TEXT_COLORS.legendary : CHEST_RARITY_COLORS[chest.rarity],
              position: 'relative',
              shadowColor: c.shade, shadowOffset: { width: 0, height: 5 },
              shadowOpacity: 0.18, shadowRadius: 10, elevation: 4,
            },
          ]}>
            <MaterialSheen radius={24} />
            <View style={[
              styles.chestIcon,
              {
                backgroundColor: CHEST_RARITY_COLORS[chest.rarity],
                borderColor: chest.rarity === 'legendary' ? CHEST_RARITY_TEXT_COLORS.legendary : CHEST_RARITY_COLORS[chest.rarity],
              },
            ]}>
              <Feather name={chest.opened ? 'gift' : 'package'} size={50} color={CHEST_RARITY_ICON_COLORS[chest.rarity]} />
            </View>
            <Text style={[styles.chestTitle, { color: c.foreground }]}>{chest.opened ? 'Rương đã mở' : 'Rương nhiệm vụ'}</Text>
            <Text style={[styles.rarity, { color: CHEST_RARITY_TEXT_COLORS[chest.rarity] }]}>
              Phẩm chất {rarityDisplayLabel(chest.rarity)}
            </Text>
            <Text style={[styles.detail, { color: c.mutedForeground }]}>
              Lượt nâng cấp: {chest.upgradeAttempts}/{attemptLimit}
            </Text>
            <View style={styles.attemptRow} accessibilityLabel={`Đã dùng ${chest.upgradeAttempts} trên ${attemptLimit} lượt nâng cấp`}>
              {Array.from({ length: attemptLimit }, (_, index) => index).map((index) => (
                <View
                  key={index}
                  style={[
                    styles.attemptDot,
                    { backgroundColor: index < chest.upgradeAttempts ? CHEST_RARITY_COLORS[chest.rarity] : c.muted },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.detail, { color: c.mutedForeground }]}>
              Thưởng Stone: {chest.opened ? chest.finalStone : `từ ${chest.baseStone}`} · Mảnh {rarityDisplayLabel(chest.rarity)}
            </Text>
          </View>
          {superUpgrade ? (
            <View style={[styles.superUpgradeBanner, { backgroundColor: c.card, borderColor: c.accent }]}>
              <MaterialSheen radius={14} />
              <Feather name="zap" size={19} color={c.accent} />
              <Text style={[styles.superUpgradeText, { color: c.foreground }]}>Nâng Cấp Siêu Việt</Text>
            </View>
          ) : null}

          {message ? (
            <View
              testID="chest-result"
              accessibilityLiveRegion="polite"
              style={[
                styles.result,
                { backgroundColor: chest.opened ? c.successSoft : c.card, borderColor: chest.opened ? c.success : c.border },
              ]}
            >
              <MaterialSheen radius={16} />
              <Feather name={chest.opened ? 'check-circle' : 'trending-up'} size={20} color={chest.opened ? c.success : c.primary} />
              <Text style={[styles.resultText, { color: chest.opened ? c.successText : c.foreground }]}>{message}</Text>
            </View>
          ) : null}

          {!chest.opened ? (
            <View style={styles.actionArea}>
              <Text style={[styles.explainer, { color: c.mutedForeground }]}>
                {specialAttempt
                  ? 'Lượt đặc biệt này chắc chắn nâng rương lên bậc kế tiếp.'
                  : 'Mỗi lượt thử lên một bậc. Nếu trượt, rương dừng ở phẩm chất hiện tại.'}
              </Text>
              {chance !== null && nextRarity ? (
                <Text style={[styles.chanceText, { color: c.primary }]}>
                  Tỉ lệ lên {rarityDisplayLabel(nextRarity)}: {chance}%
                </Text>
              ) : null}
              <Pressable
                testID="upgrade-mission-chest"
                accessibilityRole="button"
                accessibilityLabel={specialAttempt
                  ? 'Nâng Cấp Siêu Việt, chắc chắn lên bậc kế tiếp'
                  : `Thử nâng cấp rương phẩm chất ${rarityDisplayLabel(chest.rarity)}`}
                disabled={busy}
                onPress={() => void upgrade()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: c.accent, borderColor: c.buttonPressed,
                    opacity: busy ? 0.7 : pressed ? 0.88 : 1,
                    shadowColor: c.shade, shadowOffset: { width: 0, height: pressed ? 1 : 4 },
                    shadowOpacity: pressed ? 0.06 : 0.2, shadowRadius: pressed ? 2 : 7,
                    elevation: pressed ? 1 : 3,
                  },
                ]}
              >
                <MaterialSheen tone="gold" radius={16} />
                {busy ? <ActivityIndicator color={c.buttonForeground} /> : <Feather name="trending-up" size={19} color={c.buttonForeground} />}
                <Text style={[styles.primaryText, { color: c.buttonForeground }]}>
                  {busy ? 'Đang nâng cấp…' : specialAttempt ? 'Nâng Cấp Siêu Việt' : 'Thử nâng cấp'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/(tabs)/blank')}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: c.accent, borderColor: c.buttonPressed,
                  opacity: pressed ? 0.88 : 1,
                  shadowColor: c.shade, shadowOffset: { width: 0, height: pressed ? 1 : 4 },
                  shadowOpacity: pressed ? 0.06 : 0.2, shadowRadius: pressed ? 2 : 7,
                  elevation: pressed ? 1 : 3,
                },
              ]}
            >
              <MaterialSheen tone="gold" radius={16} />
              <Feather name="arrow-left" size={19} color={c.buttonForeground} />
              <Text style={[styles.primaryText, { color: c.buttonForeground }]}>Về Nhiệm Vụ</Text>
            </Pressable>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 20, gap: 16, justifyContent: 'center', paddingBottom: 30 },
  chestCard: { borderWidth: 2, borderRadius: 24, padding: 22, alignItems: 'center', gap: 9 },
  chestIcon: { width: 108, height: 108, borderWidth: 2, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  chestTitle: { fontFamily: F.b, fontSize: 23, textAlign: 'center' },
  rarity: { fontFamily: F.b, fontSize: 17 },
  detail: { fontFamily: F.r, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  attemptRow: { flexDirection: 'row', gap: 10, marginVertical: 2 },
  attemptDot: { width: 13, height: 13, borderRadius: 7 },
  superUpgradeBanner: { position: 'relative', borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  superUpgradeText: { fontFamily: F.b, fontSize: 15 },
  chanceText: { fontFamily: F.b, fontSize: 14, textAlign: 'center' },
  result: { position: 'relative', borderWidth: 1, borderRadius: 16, padding: 15, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  resultText: { flex: 1, fontFamily: F.s, fontSize: 14, lineHeight: 21 },
  actionArea: { gap: 12 },
  explainer: { fontFamily: F.r, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  primaryButton: { position: 'relative', minHeight: 54, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 16 },
  primaryText: { fontFamily: F.b, fontSize: 16 },
});

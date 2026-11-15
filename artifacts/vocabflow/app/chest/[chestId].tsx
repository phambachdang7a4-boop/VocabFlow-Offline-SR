import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, router } from "expo-router";
import Animated, {
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import { ErrorBanner, F, MaterialSheen } from "@/components/ui";
import { CorviChestArtwork } from "@/components/CorviChestArtwork";
import {
  attemptMissionChestUpgrade,
  getMissionChest,
  getMissionCorviStatueReward,
  type CorviStatueReward,
} from "@/data/vocabulary";
import {
  CHEST_RARITIES,
  CHEST_RARITY_COLORS,
  CHEST_RARITY_ICON_COLORS,
  CHEST_RARITY_LABELS,
  CHEST_RARITY_TEXT_COLORS,
  chestFragmentReward,
  maxChestUpgradeAttempts,
  type ChestRarity,
  type MissionChest,
} from "@/domain/mission-chests";

function rarityDisplayLabel(rarity: ChestRarity): string {
  return rarity === "legendary"
    ? "Corvi · Hắc Diệu Thạch"
    : CHEST_RARITY_LABELS[rarity];
}

function fragmentRarityLabel(rarity: ChestRarity): string {
  return CHEST_RARITY_LABELS[rarity];
}

function fragmentRewardLabel(
  reward: Record<ChestRarity, number> | null | undefined,
): string {
  if (!reward) return "mảnh ghép ngẫu nhiên";
  return (
    CHEST_RARITIES.filter((rarity) => reward[rarity] > 0)
      .map((rarity) => `${reward[rarity]} mảnh ${rarityDisplayLabel(rarity)}`)
      .join(", ") || "không có mảnh"
  );
}

export default function MissionChestScreen() {
  const c = useColors();
  const { chestId, rewardFlow } = useLocalSearchParams<{
    chestId: string;
    rewardFlow?: string;
  }>();
  const isRewardFlow = rewardFlow === "1";
  const id = Array.isArray(chestId) ? chestId[0] : chestId;
  const [chest, setChest] = useState<MissionChest | null>(null);
  const [statueReward, setStatueReward] =
    useState<CorviStatueReward | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const chestScale = useSharedValue(1);
  const chestX = useSharedValue(0);
  const chestRotation = useSharedValue(0);
  const lidProgress = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const chestMotionStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: chestX.value },
      { rotateZ: `${chestRotation.value}deg` },
      { scale: chestScale.value },
    ],
  }));
  const lidStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(lidProgress.value, [0, 1], [0, -18]) },
      {
        rotateZ: `${interpolate(lidProgress.value, [0, 1], [0, -12])}deg`,
      },
    ],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  const ruleSet = chest?.ruleSet ?? 1;
  const superUpgrade = chest?.superUpgrade ?? false;
  const attemptLimit = maxChestUpgradeAttempts(ruleSet, superUpgrade);
  const nextAttempt = (chest?.upgradeAttempts ?? 0) + 1;
  const remainingAttempts = Math.max(
    0,
    attemptLimit - (chest?.upgradeAttempts ?? 0),
  );
  const specialAttempt = superUpgrade && nextAttempt === 4;
  const openedFragments = chest?.opened
    ? chestFragmentReward(chest.chestId, chest.rarity, ruleSet)
    : null;

  const load = useCallback(async () => {
    if (!id) {
      setError("Không tìm thấy mã rương.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [saved, savedStatue] = await Promise.all([
        getMissionChest(id),
        getMissionCorviStatueReward(id),
      ]);
      setChest(saved);
      setStatueReward(savedStatue);
      lidProgress.value = saved?.opened ? 1 : 0;
      setError(saved ? null : "Không tìm thấy rương này trên thiết bị.");
    } catch {
      setError("Không thể tải rương. Dữ liệu vẫn được giữ trên thiết bị.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const upgrade = async () => {
    if (!id || !chest || chest.opened || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    lidProgress.value = withTiming(0, { duration: 80 });
    chestScale.value = withSequence(
      withTiming(0.9, { duration: 65 }),
      withSpring(1.08, { damping: 7, stiffness: 260 }),
      withTiming(0.93, { duration: 70 }),
      withSpring(1.06, { damping: 7, stiffness: 260 }),
      withTiming(0.97, { duration: 70 }),
      withSpring(1, { damping: 8, stiffness: 240 }),
    );
    chestX.value = withSequence(
      withTiming(-7, { duration: 38 }),
      withTiming(7, { duration: 44 }),
      withTiming(-5, { duration: 42 }),
      withTiming(5, { duration: 44 }),
      withTiming(-3, { duration: 42 }),
      withTiming(0, { duration: 65 }),
    );
    chestRotation.value = withSequence(
      withTiming(-4, { duration: 38 }),
      withTiming(4, { duration: 44 }),
      withTiming(-3, { duration: 42 }),
      withTiming(3, { duration: 44 }),
      withTiming(-2, { duration: 42 }),
      withTiming(0, { duration: 65 }),
    );
    glowOpacity.value = withSequence(
      withTiming(0.22, { duration: 90 }),
      withTiming(0.04, { duration: 90 }),
      withTiming(0.2, { duration: 90 }),
      withTiming(0.04, { duration: 90 }),
      withTiming(0.18, { duration: 90 }),
      withTiming(0, { duration: 180 }),
    );
    try {
      const result = await attemptMissionChestUpgrade(id);
      setChest(result.chest);
      setStatueReward(
        result.awardedStatue
          ? {
              artwork: result.awardedStatue,
              compensationPieces: result.compensatedPieces,
            }
          : null,
      );
      lidProgress.value = withSpring(
        result.finished ? 1 : result.succeeded ? 0.58 : 0,
        { damping: 12, stiffness: 170 },
      );
      glowOpacity.value = withSequence(
        withTiming(0.3, { duration: 100 }),
        withTiming(0, { duration: 460 }),
      );
      const usedSuperUpgrade =
        (result.chest.ruleSet ?? 1) >= 2 &&
        result.chest.superUpgrade &&
        result.chest.upgradeAttempts === 4;
      if (result.finished) {
        const statueName = result.awardedStatue
          ? result.awardedStatue.shortTitle ??
            result.awardedStatue.title.replace(/^Tượng\s+/, "")
          : "";
        const statueBonus = result.awardedStatue
          ? result.compensatedPieces > 0
            ? ` Tượng ${statueName} đã có sẵn; được bồi thường 20 mảnh ${
                fragmentRarityLabel(result.awardedStatue.rarity)
              }.`
            : ` Nhận thêm tượng ${statueName}.`
          : "";
        setMessage(
          result.succeeded
            ? `${usedSuperUpgrade ? "Nâng Cấp Siêu Việt thành công! " : ""}Rương đạt ${rarityDisplayLabel(result.chest.rarity)}! Bạn nhận ${result.awardedStone} Stone và ${fragmentRewardLabel(result.awardedFragments)}.${statueBonus}`
            : `Lần nâng cấp không thành công. Rương giữ phẩm chất ${rarityDisplayLabel(result.chest.rarity)}; bạn nhận ${result.awardedStone} Stone và ${fragmentRewardLabel(result.awardedFragments)}.${statueBonus}`,
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể mở rương.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={styles.content}
    >
      {error ? (
        <ErrorBanner message={error} onRetry={() => void load()} />
      ) : null}
      {loading ? <ActivityIndicator color={c.primary} /> : null}
      {!loading && chest ? (
        <>
          <View
            style={[
              styles.chestCard,
              {
                backgroundColor: c.card,
                borderColor:
                  chest.rarity === "legendary"
                    ? CHEST_RARITY_TEXT_COLORS.legendary
                    : CHEST_RARITY_COLORS[chest.rarity],
                position: "relative",
                shadowColor: c.shade,
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.18,
                shadowRadius: 10,
                elevation: 4,
              },
            ]}
          >
            <MaterialSheen radius={24} />
            <Pressable
              testID="tap-chest-art"
              accessibilityRole="button"
              accessibilityLabel={
                chest.opened
                  ? `Rương đã mở, phẩm chất ${rarityDisplayLabel(chest.rarity)}`
                  : `Chạm để nâng rương ${rarityDisplayLabel(chest.rarity)}. Còn ${remainingAttempts} lượt.`
              }
              accessibilityHint="Mỗi lần chạm là một lượt nâng cấp; hoạt ảnh không tạo thêm lượt."
              disabled={busy || chest.opened}
              onPress={() => void upgrade()}
              hitSlop={12}
              style={styles.chestArtPressable}
            >
              <Animated.View style={[styles.chestArt, chestMotionStyle]}>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.chestGlow,
                    { backgroundColor: CHEST_RARITY_COLORS[chest.rarity] },
                    glowStyle,
                  ]}
                />
                {chest.rarity === "legendary" ? (
                  <CorviChestArtwork size={128} />
                ) : (
                  <>
                    <View
                    style={[
                      styles.chestBody,
                      {
                        backgroundColor: CHEST_RARITY_COLORS[chest.rarity],
                        borderColor: CHEST_RARITY_TEXT_COLORS[chest.rarity],
                      },
                    ]}
                    >
                      <View
                        style={[
                          styles.chestStrap,
                          {
                            backgroundColor: CHEST_RARITY_ICON_COLORS[chest.rarity],
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.chestBaseBand,
                          {
                            backgroundColor: CHEST_RARITY_TEXT_COLORS[chest.rarity],
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.chestLock,
                          {
                            backgroundColor: CHEST_RARITY_TEXT_COLORS[chest.rarity],
                          },
                        ]}
                      >
                        <Feather
                          name={chest.opened ? "unlock" : "lock"}
                          size={16}
                          color={CHEST_RARITY_ICON_COLORS[chest.rarity]}
                        />
                      </View>
                    </View>
                    <Animated.View
                    style={[
                        styles.chestLid,
                        {
                          backgroundColor: CHEST_RARITY_COLORS[chest.rarity],
                          borderColor: CHEST_RARITY_TEXT_COLORS[chest.rarity],
                        },
                        lidStyle,
                    ]}
                    >
                      <View
                        style={[
                          styles.chestLidBand,
                          {
                            backgroundColor: CHEST_RARITY_ICON_COLORS[chest.rarity],
                          },
                        ]}
                      />
                    </Animated.View>
                  </>
                )}
              </Animated.View>
            </Pressable>
            {chest.opened ? (
              <Text style={[styles.chestTitle, { color: c.foreground }]}>
                Rương đã mở
              </Text>
            ) : null}
            <Text
              style={[
                styles.rarity,
                { color: CHEST_RARITY_TEXT_COLORS[chest.rarity] },
              ]}
            >
              Phẩm chất {rarityDisplayLabel(chest.rarity)}
            </Text>
            {!chest.opened ? (
              <Text
                testID="chest-tap-prompt"
                style={[styles.tapHint, { color: c.mutedForeground }]}
              >
                {specialAttempt
                  ? "Chạm vào rương để Nâng Cấp Siêu Việt"
                  : "Chạm vào rương để nâng cấp"}
              </Text>
            ) : (
              <Text style={[styles.detail, { color: c.mutedForeground }]}>
                Đã dùng {chest.upgradeAttempts}/{attemptLimit} lượt nâng cấp
              </Text>
            )}
            <View
              style={styles.attemptRow}
              accessibilityLabel={`Đã dùng ${chest.upgradeAttempts} trên ${attemptLimit} lượt nâng cấp`}
            >
              {Array.from({ length: attemptLimit }, (_, index) => index).map(
                (index) => (
                  <View
                    key={index}
                    style={[
                      styles.attemptDot,
                      {
                        backgroundColor:
                          index < chest.upgradeAttempts
                            ? CHEST_RARITY_COLORS[chest.rarity]
                            : c.muted,
                      },
                    ]}
                  />
                ),
              )}
            </View>
            {chest.opened ? (
              <Animated.View
                key={`${chest.rarity}-${chest.opened}`}
                entering={FadeIn.duration(220)}
                testID="chest-reward-preview"
                style={[
                  styles.rewardPreview,
                  { backgroundColor: c.background, borderColor: c.border },
                ]}
              >
                <View style={styles.rewardHeading}>
                  <Feather name="gift" size={16} color={c.accent} />
                  <Text style={[styles.rewardTitle, { color: c.foreground }]}>
                    Phần thưởng đã nhận
                  </Text>
                </View>
                <Text style={[styles.rewardLine, { color: c.foreground }]}>
                  {chest.finalStone} Stone · {fragmentRewardLabel(openedFragments)}
                </Text>
                {statueReward ? (
                  <Text
                    testID="corvi-statue-reward"
                    style={[styles.rewardLine, { color: c.primary }]}
                  >
                    Tượng thưởng:{" "}
                    {statueReward.artwork.shortTitle ??
                      statueReward.artwork.title.replace(/^Tượng\s+/, "")}
                  </Text>
                ) : null}
                {statueReward && statueReward.compensationPieces > 0 ? (
                  <Text
                    testID="corvi-duplicate-compensation"
                    style={[styles.rewardLine, { color: c.accent }]}
                  >
                    Tượng đã có sẵn · +20 mảnh{" "}
                    {fragmentRarityLabel(statueReward.artwork.rarity)}
                  </Text>
                ) : null}
              </Animated.View>
            ) : null}
          </View>

          {message ? (
            <Animated.View
              key={message}
              entering={FadeIn.duration(220)}
              testID="chest-result"
              accessibilityLiveRegion="polite"
              style={[
                styles.result,
                {
                  backgroundColor: chest.opened ? c.successSoft : c.card,
                  borderColor: chest.opened ? c.success : c.border,
                },
              ]}
            >
              <MaterialSheen radius={16} />
              <Feather
                name={chest.opened ? "check-circle" : "trending-up"}
                size={20}
                color={chest.opened ? c.success : c.primary}
              />
              <Text
                style={[
                  styles.resultText,
                  { color: chest.opened ? c.successText : c.foreground },
                ]}
              >
                {message}
              </Text>
            </Animated.View>
          ) : null}

          {!chest.opened ? (
            busy ? (
              <ActivityIndicator
                testID="chest-upgrade-loading"
                color={c.primary}
              />
            ) : null
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                isRewardFlow
                  ? router.back()
                  : router.replace("/(tabs)/blank")
              }
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: c.accent,
                  borderColor: c.buttonPressed,
                  opacity: pressed ? 0.88 : 1,
                  shadowColor: c.shade,
                  shadowOffset: { width: 0, height: pressed ? 1 : 4 },
                  shadowOpacity: pressed ? 0.06 : 0.2,
                  shadowRadius: pressed ? 2 : 7,
                  elevation: pressed ? 1 : 3,
                },
              ]}
            >
              <MaterialSheen tone="gold" radius={16} />
              <Feather name="arrow-left" size={19} color={c.buttonForeground} />
              <Text style={[styles.primaryText, { color: c.buttonForeground }]}>
                {isRewardFlow ? "Tiếp tục" : "Về Nhiệm Vụ"}
              </Text>
            </Pressable>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
    justifyContent: "center",
    paddingBottom: 30,
  },
  chestCard: {
    borderWidth: 2,
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    gap: 9,
  },
  chestArtPressable: {
    width: 148,
    height: 132,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  chestArt: {
    width: 138,
    height: 124,
    alignItems: "center",
    justifyContent: "flex-end",
    position: "relative",
  },
  chestGlow: {
    position: "absolute",
    width: 108,
    height: 108,
    borderRadius: 54,
    bottom: 1,
  },
  chestBody: {
    position: "absolute",
    bottom: 6,
    width: 100,
    height: 68,
    borderWidth: 3,
    borderRadius: 14,
    alignItems: "center",
    overflow: "hidden",
  },
  chestStrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "43%",
    width: 14,
    opacity: 0.55,
  },
  chestBaseBand: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 10,
    opacity: 0.8,
  },
  chestLock: {
    position: "absolute",
    top: 19,
    width: 28,
    height: 30,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  chestLid: {
    position: "absolute",
    top: 24,
    width: 110,
    height: 38,
    borderWidth: 3,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    zIndex: 2,
  },
  chestLidBand: { width: 14, height: "100%", opacity: 0.55 },
  chestTitle: { fontFamily: F.b, fontSize: 23, textAlign: "center" },
  rarity: { fontFamily: F.b, fontSize: 17 },
  tapHint: {
    fontFamily: F.s,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  detail: {
    fontFamily: F.r,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  attemptRow: { flexDirection: "row", gap: 10, marginVertical: 2 },
  attemptDot: { width: 13, height: 13, borderRadius: 7 },
  rewardPreview: {
    width: "100%",
    position: "relative",
    borderWidth: 1,
    borderRadius: 15,
    padding: 13,
    gap: 7,
  },
  rewardHeading: { flexDirection: "row", alignItems: "center", gap: 7 },
  rewardTitle: { fontFamily: F.b, fontSize: 13 },
  rewardLine: { fontFamily: F.b, fontSize: 14, lineHeight: 20 },
  result: {
    position: "relative",
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  resultText: { flex: 1, fontFamily: F.s, fontSize: 14, lineHeight: 21 },
  primaryButton: {
    position: "relative",
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 16,
  },
  primaryText: { fontFamily: F.b, fontSize: 16 },
});

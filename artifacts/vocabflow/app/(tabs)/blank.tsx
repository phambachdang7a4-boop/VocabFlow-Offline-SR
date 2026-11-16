import React, { useCallback, useEffect, useRef, useState } from "react";
import Animated, { SlideInLeft, SlideInRight } from "react-native-reanimated";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomPad } from "@/components/ScreenHeader";
import { ErrorBanner, F, MaterialSheen } from "@/components/ui";
import { MissionCollectionTabs } from "@/components/MissionCollectionTabs";
import { MissionShop } from "@/components/MissionShop";
import { ChestTierArtwork } from "@/components/ChestTierArtwork";
import { DailyMissionArtwork } from "@/components/DailyMissionArtwork";
import CollectionScreen from "../collection";
import {
  getDailyMissionOverview,
  type DailyMissionOverview,
} from "@/data/vocabulary";
import { DAILY_MISSION_CHEST_RARITY } from "@/domain/daily-missions";
import {
  CHEST_RARITY_COLORS,
  CHEST_RARITY_ICON_COLORS,
  CHEST_RARITY_LABELS,
  CHEST_RARITY_TEXT_COLORS,
  chestStoneReward,
  maxChestUpgradeAttempts,
  type MissionChest,
} from "@/domain/mission-chests";

export default function BlankScreen() {
  const c = useColors();
  const { panel } = useLocalSearchParams<{ panel?: string }>();
  const showingShop = panel === "shop";
  const showingCollection = panel === "collection";
  const previousCollectionState = useRef<boolean | null>(null);
  const shouldSlide =
    previousCollectionState.current !== null &&
    previousCollectionState.current !== showingCollection;
  const bottom = useBottomPad();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const missionArtworkSize = screenWidth < 360 ? 48 : screenWidth < 420 ? 62 : 70;
  const chestArtworkSize = screenWidth < 360 ? 56 : screenWidth < 420 ? 70 : 78;
  const top = Platform.OS === "web" ? 67 : insets.top;
  const [overview, setOverview] = useState<DailyMissionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    previousCollectionState.current = showingCollection;
  }, [showingCollection]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOverview(await getDailyMissionOverview());
      setError(null);
    } catch {
      setError(
        "Không thể tải nhiệm vụ hôm nay. Tiến độ vẫn được giữ trên thiết bị.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!showingShop && !showingCollection) void load();
    }, [load, showingCollection, showingShop]),
  );

  return (
    <View
      testID="missions-screen"
      style={[styles.flex, { backgroundColor: c.background }]}
    >
      <Animated.View
        key={showingCollection ? "collection-panel" : "mission-panel"}
        entering={
          shouldSlide
            ? showingCollection
              ? SlideInRight.duration(250)
              : SlideInLeft.duration(250)
            : undefined
        }
        style={styles.flex}
      >
        {showingCollection ? (
          <CollectionScreen />
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingTop: top + 12, paddingBottom: bottom },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {showingShop ? (
              <>
                <MissionCollectionTabs active="shop" />
                <MissionShop />
              </>
            ) : (
            <>
            <View style={styles.missionHeading}>
              <View style={styles.missionHeadingCopy}>
                <Text style={[styles.missionPageTitle, { color: c.foreground }]}>
                  Ba nhiệm vụ hôm nay
                </Text>
                <Text style={[styles.sectionHint, { color: c.mutedForeground }]}>
                  Mỗi ngày có nhiệm vụ mới
                </Text>
              </View>
              <View
                style={[
                  styles.missionStoneBadge,
                  { backgroundColor: c.headerButton, borderColor: c.border },
                ]}
                accessibilityLabel={`Số dư ${(overview?.stoneBalance ?? 0).toLocaleString("vi-VN")} Stone`}
              >
                <Feather name="award" size={16} color={c.accent} />
                <Text
                  testID="stone-balance"
                  style={[styles.missionStoneText, { color: c.foreground }]}
                >
                  {loading && !overview
                    ? "— Stone"
                    : `${(overview?.stoneBalance ?? 0).toLocaleString("vi-VN")} Stone`}
                </Text>
              </View>
            </View>
            <MissionCollectionTabs active="missions" />
            {error ? (
              <ErrorBanner message={error} onRetry={() => void load()} />
            ) : null}
            {loading && !overview ? (
              <View style={styles.loading}>
                <ActivityIndicator color={c.primary} />
                <Text
                  style={[styles.loadingText, { color: c.mutedForeground }]}
                >
                  Đang tải nhiệm vụ…
                </Text>
            </View>
            ) : (
              overview?.missions.map((mission) => {
                const finished = mission.rewarded;
                const rewardRarity = DAILY_MISSION_CHEST_RARITY[mission.level];
                const progressPercent = Math.min(
                  100,
                  (mission.progress / mission.target) * 100,
                );
                const displayProgressLabel =
                  mission.type === "time"
                    ? `${mission.progress}/${mission.target} phút`
                    : mission.type === "combo"
                      ? `${mission.progress}/${mission.target} câu`
                      : mission.type === "grade"
                        ? mission.completed
                          ? "Đạt"
                          : "Chưa đạt"
                        : `${mission.progress}/${mission.target} từ`;
                return (
                  <View
                    key={mission.id}
                    testID={`daily-mission-${mission.id}`}
                    accessibilityLabel={`${mission.title}. Tiến độ: ${displayProgressLabel}. Rương ${
                      CHEST_RARITY_LABELS[rewardRarity]
                    } khi hoàn thành. ${
                      finished
                        ? "Đã nhận phần thưởng."
                        : "Phần thưởng sắp nhận."
                    }`}
                    style={[
                      styles.missionCard,
                      {
                        backgroundColor: finished ? c.successSoft : c.card,
                        borderColor: finished ? c.success : c.border,
                        shadowColor: c.shade,
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.12,
                        shadowRadius: 6,
                        elevation: 2,
                        overflow: "hidden",
                      },
                    ]}
                  >
                    {!finished ? (
                      <LinearGradient
                        colors={
                          c.background === "#1E2130"
                            ? [c.headerButton, c.vocabCard, c.vocabCardPressed]
                            : [c.card, c.card, c.card]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    ) : null}
                    <MaterialSheen radius={20} />
                    <View style={styles.missionTop}>
                      <View
                        testID={`daily-mission-illustration-${mission.id}`}
                        style={[
                          styles.missionIcon,
                          {
                            width: missionArtworkSize,
                            height: missionArtworkSize,
                          },
                        ]}
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      >
                        <DailyMissionArtwork
                          type={mission.type}
                          size={missionArtworkSize}
                        />
                      </View>
                      <View style={styles.missionCopy}>
                        <Text
                          style={[
                            styles.level,
                            { color: finished ? c.successText : c.primary },
                          ]}
                        >
                          CẤP {mission.level}
                        </Text>
                        <Text
                          style={[
                            styles.missionTitle,
                            { color: finished ? c.successText : c.foreground },
                          ]}
                        >
                          {mission.title}
                        </Text>
                        <Text
                          style={[
                            styles.missionDescription,
                            { color: c.mutedForeground },
                          ]}
                        >
                          {mission.description}
                        </Text>
                        <Text
                          testID={`daily-mission-chest-${mission.id}`}
                          style={[
                            styles.missionChestLabel,
                            { color: CHEST_RARITY_TEXT_COLORS[rewardRarity] },
                          ]}
                        >
                          Rương {CHEST_RARITY_LABELS[rewardRarity]} khi hoàn
                          thành
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.rewardArtwork,
                          {
                            width: chestArtworkSize + 8,
                            height: chestArtworkSize,
                          },
                        ]}
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      >
                        <ChestTierArtwork
                          rarity={rewardRarity}
                          size={chestArtworkSize}
                        />
                        {finished ? (
                          <View
                            style={[
                              styles.rewardCheck,
                              {
                                backgroundColor: c.success,
                                borderColor: c.foreground,
                              },
                            ]}
                          >
                            <Feather name="check" size={12} color={c.foreground} />
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.progressRow}>
                      <View
                        style={[styles.track, { backgroundColor: c.muted }]}
                      >
                        <View
                          style={[
                            styles.fill,
                            {
                              width: `${progressPercent}%`,
                              backgroundColor: finished ? c.success : c.accent,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.progressText,
                          { color: finished ? c.successText : c.primary },
                        ]}
                      >
                        {displayProgressLabel}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
            {overview?.chests.length ? (
              <>
                <View style={styles.sectionHeading}>
                  <Text style={[styles.sectionTitle, { color: c.foreground }]}>
                    Rương chờ mở
                  </Text>
                  <Text
                    style={[styles.sectionHint, { color: c.mutedForeground }]}
                  >
                    Mỗi rương có tối đa 3 lượt nâng cấp
                  </Text>
                </View>
                {overview.chests.map((chest) => (
                  <ChestCard key={chest.chestId} chest={chest} colors={c} />
                ))}
              </>
            ) : null}
            <Text style={[styles.footerNote, { color: c.mutedForeground }]}>
              Stone, rương và tiến độ nhiệm vụ được lưu offline, rồi đồng bộ
              cùng dữ liệu tài khoản.
            </Text>
            </>
          )}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

function ChestCard({
  chest,
  colors,
}: {
  chest: MissionChest;
  colors: ReturnType<typeof useColors>;
}) {
  const rarityLabel =
    chest.rarity === "legendary"
      ? "Corvi · Hắc Diệu Thạch"
      : CHEST_RARITY_LABELS[chest.rarity];
  const attemptLimit = maxChestUpgradeAttempts(
    chest.ruleSet ?? 1,
    chest.superUpgrade ?? false,
  );
  const attemptsLeft = Math.max(0, attemptLimit - chest.upgradeAttempts);
  const currentStone = chestStoneReward(
    chest.baseStone,
    chest.rarity,
    chest.ruleSet ?? 1,
  );
  return (
    <View
      style={[
        styles.chestCard,
        {
          backgroundColor: colors.card,
          borderColor:
            chest.rarity === "legendary"
              ? colors.mutedForeground
              : colors.border,
          shadowColor: colors.shade,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.14,
          shadowRadius: 6,
          elevation: 3,
        },
      ]}
    >
      <MaterialSheen radius={17} />
      <View
        style={[
          styles.chestIcon,
          { backgroundColor: CHEST_RARITY_COLORS[chest.rarity] },
        ]}
      >
        <Feather
          name="gift"
          size={28}
          color={CHEST_RARITY_ICON_COLORS[chest.rarity]}
        />
      </View>
      <View style={styles.chestCopy}>
        <Text style={[styles.chestTitle, { color: colors.foreground }]}>
          Rương {rarityLabel}
        </Text>
        <Text
          style={[styles.chestDescription, { color: colors.mutedForeground }]}
        >
          Nếu chốt ở bậc này: {currentStone} Stone · Còn {attemptsLeft}/
          {attemptLimit} lượt nâng cấp
        </Text>
      </View>
      <Pressable
        testID={`open-chest-${chest.chestId}`}
        accessibilityRole="button"
        accessibilityLabel={`Mở rương ${rarityLabel}. Nếu chốt ở bậc này nhận ${currentStone} Stone. Còn ${attemptsLeft} trên ${attemptLimit} lượt nâng cấp.`}
        onPress={() =>
          router.push({
            pathname: "/chest/[chestId]",
            params: { chestId: chest.chestId },
          })
        }
        style={[
          styles.openChestButton,
          {
            backgroundColor: colors.accent,
            borderColor: colors.buttonPressed,
            shadowColor: colors.shade,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.17,
            shadowRadius: 5,
            elevation: 3,
          },
        ]}
      >
        <MaterialSheen tone="gold" radius={12} />
        <Text
          style={[styles.openChestText, { color: colors.buttonForeground }]}
        >
          Mở
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 12 },
  missionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 2,
    marginBottom: 1,
  },
  missionHeadingCopy: { flex: 1, minWidth: 0, gap: 3 },
  missionPageTitle: { fontFamily: F.b, fontSize: 21 },
  missionStoneBadge: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
    flexShrink: 0,
    borderWidth: 1,
    borderRadius: 17,
  },
  missionStoneText: { fontFamily: F.b, fontSize: 12 },
  sectionHeading: { gap: 2, marginTop: 6, marginBottom: 2 },
  sectionTitle: { fontFamily: F.b, fontSize: 20 },
  sectionHint: { fontFamily: F.r, fontSize: 13 },
  loading: { padding: 30, alignItems: "center", gap: 10 },
  loadingText: { fontFamily: F.r, fontSize: 14 },
  missionCard: {
    position: "relative",
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 13,
    minHeight: 172,
  },
  missionTop: { flexDirection: "row", alignItems: "center", gap: 9 },
  missionIcon: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  rewardArtwork: {
    flexShrink: 0,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  rewardCheck: {
    position: "absolute",
    right: 0,
    top: 2,
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  missionCopy: { flex: 1, minWidth: 0, gap: 3 },
  level: { fontFamily: F.s, fontSize: 10, letterSpacing: 1 },
  missionTitle: { fontFamily: F.b, fontSize: 17, lineHeight: 22 },
  missionDescription: { fontFamily: F.r, fontSize: 13, lineHeight: 18 },
  missionChestLabel: { fontFamily: F.s, fontSize: 12, lineHeight: 16 },
  chestCard: {
    position: "relative",
    borderWidth: 1,
    borderRadius: 17,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chestIcon: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: "#FFFFFF55",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  chestCopy: { flex: 1, gap: 3 },
  chestTitle: { fontFamily: F.b, fontSize: 14 },
  chestDescription: { fontFamily: F.r, fontSize: 11, lineHeight: 16 },
  openChestButton: {
    position: "relative",
    borderWidth: 1,
    borderRadius: 12,
    minWidth: 52,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  openChestText: { fontFamily: F.b, fontSize: 13 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  track: { flex: 1, height: 8, borderRadius: 5, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 5 },
  progressText: {
    minWidth: 58,
    textAlign: "right",
    fontFamily: F.b,
    fontSize: 12,
  },
  footerNote: {
    fontFamily: F.r,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
    marginBottom: 4,
  },
});

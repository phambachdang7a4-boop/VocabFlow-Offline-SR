import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomPad } from "@/components/ScreenHeader";
import { ErrorBanner, F, MaterialSheen } from "@/components/ui";
import {
  getDailyMissionOverview,
  type DailyMissionOverview,
} from "@/data/vocabulary";
import {
  CHEST_RARITY_COLORS,
  CHEST_RARITY_ICON_COLORS,
  CHEST_RARITY_LABELS,
  chestStoneReward,
  maxChestUpgradeAttempts,
  type MissionChest,
} from "@/domain/mission-chests";

export default function BlankScreen() {
  const c = useColors();
  const bottom = useBottomPad();
  const insets = useSafeAreaInsets();
  const top = Platform.OS === "web" ? 67 : insets.top;
  const [overview, setOverview] = useState<DailyMissionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      void load();
    }, [load]),
  );

  return (
    <View
      testID="missions-screen"
      style={[styles.flex, { backgroundColor: c.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: top + 12, paddingBottom: bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <ErrorBanner message={error} onRetry={() => void load()} />
        ) : null}
        <View
          style={[
            styles.walletCard,
            {
              backgroundColor: c.card,
              borderColor: c.border,
              shadowColor: c.shade,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.14,
              shadowRadius: 7,
              elevation: 3,
            },
          ]}
        >
          <MaterialSheen radius={20} />
          <View style={[styles.walletIcon, { backgroundColor: c.accent }]}>
            <Feather name="award" size={24} color={c.buttonForeground} />
          </View>
          <View style={styles.walletText}>
            <Text style={[styles.walletLabel, { color: c.mutedForeground }]}>
              SỐ DƯ
            </Text>
            {loading && !overview ? (
              <ActivityIndicator color={c.primary} />
            ) : (
              <Text
                testID="stone-balance"
                style={[styles.walletValue, { color: c.foreground }]}
              >
                {(overview?.stoneBalance ?? 0).toLocaleString("vi-VN")} Stone
              </Text>
            )}
          </View>
          <Text style={[styles.walletDate, { color: c.mutedForeground }]}>
            Hôm nay
          </Text>
        </View>

        <Pressable
          testID="open-collection"
          accessibilityRole="button"
          accessibilityLabel="Mở Bộ Sưu Tập mảnh ghép và tranh"
          onPress={() => router.push("/collection")}
          style={({ pressed }) => [
            styles.collectionButton,
            {
              backgroundColor: c.vocabCardAccent,
              opacity: pressed ? 0.88 : 1,
              shadowColor: c.shade,
              shadowOffset: { width: 0, height: pressed ? 1 : 3 },
              shadowOpacity: pressed ? 0.06 : 0.18,
              shadowRadius: 6,
              elevation: pressed ? 1 : 3,
            },
          ]}
        >
          <MaterialSheen tone="gold" radius={18} />
          <View style={[styles.collectionIcon, { backgroundColor: c.accent }]}>
            <Feather name="image" size={20} color={c.buttonForeground} />
          </View>
          <View style={styles.collectionCopy}>
            <Text
              style={[styles.collectionTitle, { color: c.buttonForeground }]}
            >
              Bộ Sưu Tập
            </Text>
            <Text
              style={[
                styles.collectionDescription,
                { color: c.buttonForeground },
              ]}
            >
              Mảnh ghép và tranh đã mở
            </Text>
          </View>
          <Feather name="chevron-right" size={21} color={c.primary} />
        </Pressable>

        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>
            Ba nhiệm vụ hôm nay
          </Text>
          <Text style={[styles.sectionHint, { color: c.mutedForeground }]}>
            Mỗi ngày có nhiệm vụ mới
          </Text>
        </View>

        {loading && !overview ? (
          <View style={styles.loading}>
            <ActivityIndicator color={c.primary} />
            <Text style={[styles.loadingText, { color: c.mutedForeground }]}>
              Đang tải nhiệm vụ…
            </Text>
          </View>
        ) : (
          overview?.missions.map((mission) => {
            const finished = mission.rewarded;
            const iconName =
              mission.type === "review"
                ? "layers"
                : mission.type === "add-words"
                  ? "plus-circle"
                  : "award";
            const progressPercent = Math.min(
              100,
              (mission.progress / mission.target) * 100,
            );
            return (
              <View
                key={mission.id}
                testID={`daily-mission-${mission.id}`}
                accessibilityLabel={`${mission.title}. ${mission.progress} trên ${mission.target}. ${finished ? "Đã nhận phần thưởng." : "Phần thưởng sắp nhận."}`}
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
                  },
                ]}
              >
                <MaterialSheen radius={20} />
                <View style={styles.missionTop}>
                  <View
                    style={[
                      styles.missionIcon,
                      {
                        backgroundColor: finished
                          ? c.success
                          : c.vocabCardAccent,
                      },
                    ]}
                  >
                    <Feather
                      name={finished ? "check" : iconName}
                      size={21}
                      color={finished ? "#FFFFFF" : c.buttonForeground}
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
                  </View>
                  <View
                    style={[
                      styles.rewardPill,
                      { backgroundColor: finished ? c.success : c.accent },
                    ]}
                  >
                    <Feather
                      name={finished ? "check" : "gift"}
                      size={finished ? 21 : 27}
                      color={finished ? "#FFFFFF" : c.buttonForeground}
                    />
                  </View>
                </View>
                <View style={styles.progressRow}>
                  <View style={[styles.track, { backgroundColor: c.muted }]}>
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
                    {mission.progress}/{mission.target}
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
              <Text style={[styles.sectionHint, { color: c.mutedForeground }]}>
                Mỗi rương có tối đa 3 lượt nâng cấp
              </Text>
            </View>
            {overview.chests.map((chest) => (
              <ChestCard key={chest.chestId} chest={chest} colors={c} />
            ))}
          </>
        ) : null}
        <Text style={[styles.footerNote, { color: c.mutedForeground }]}>
          Stone, rương và tiến độ nhiệm vụ được lưu offline, rồi đồng bộ cùng dữ
          liệu tài khoản.
        </Text>
      </ScrollView>
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
          {chestStoneReward(chest.baseStone, chest.rarity, chest.ruleSet ?? 1)}{" "}
          Stone khi mở · {chest.upgradeAttempts}/{attemptLimit} lượt đã dùng
        </Text>
      </View>
      <Pressable
        testID={`open-chest-${chest.chestId}`}
        accessibilityRole="button"
        accessibilityLabel={`Mở rương ${rarityLabel}, ${chestStoneReward(
          chest.baseStone,
          chest.rarity,
          chest.ruleSet ?? 1,
        )} Stone khi mở`}
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
  walletCard: {
    position: "relative",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  walletText: { flex: 1, gap: 3 },
  walletLabel: { fontFamily: F.s, fontSize: 10, letterSpacing: 1.2 },
  walletValue: { fontFamily: F.b, fontSize: 20 },
  walletDate: { fontFamily: F.m, fontSize: 12 },
  collectionButton: {
    position: "relative",
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  collectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  collectionCopy: { flex: 1, gap: 2 },
  collectionTitle: { fontFamily: F.b, fontSize: 15 },
  collectionDescription: { fontFamily: F.r, fontSize: 12 },
  sectionHeading: { gap: 2, marginTop: 6, marginBottom: 2 },
  sectionTitle: { fontFamily: F.b, fontSize: 20 },
  sectionHint: { fontFamily: F.r, fontSize: 13 },
  loading: { padding: 30, alignItems: "center", gap: 10 },
  loadingText: { fontFamily: F.r, fontSize: 14 },
  missionCard: {
    position: "relative",
    borderWidth: 1,
    borderRadius: 20,
    padding: 15,
    gap: 13,
  },
  missionTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  missionIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  missionCopy: { flex: 1, gap: 3 },
  level: { fontFamily: F.s, fontSize: 10, letterSpacing: 1 },
  missionTitle: { fontFamily: F.b, fontSize: 16, lineHeight: 21 },
  missionDescription: { fontFamily: F.r, fontSize: 12, lineHeight: 17 },
  rewardPill: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
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
    minWidth: 34,
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

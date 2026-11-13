import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useSegments } from "expo-router";
import { MaterialSheen, F } from "@/components/ui";
import {
  getDailyMissionOverview,
  getDatabaseScope,
  subscribeSyncChanges,
} from "@/data/vocabulary";
import {
  isMissionRewardQueueItem,
  reconcileMissionRewardQueue,
  type MissionRewardQueueItem,
} from "@/domain/mission-reward-queue";
import { useColors } from "@/hooks/useColors";

function readQueue(value: string | null): MissionRewardQueueItem[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isMissionRewardQueueItem) : [];
  } catch {
    return [];
  }
}

export function MissionRewardCoordinator() {
  const colors = useColors();
  const segments = useSegments();
  const chestRouteActive = (segments as readonly string[]).includes("chest");
  const databaseScope = getDatabaseScope();
  const storageKey = `vocabflow_mission_reward_queue_v1:${databaseScope ?? "guest"}`;
  const [queue, setQueue] = useState<MissionRewardQueueItem[]>([]);
  const [activeReward, setActiveReward] =
    useState<MissionRewardQueueItem | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const mounted = useRef(true);
  const refreshing = useRef(false);
  const refreshAgain = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshing.current) {
      refreshAgain.current = true;
      return;
    }
    refreshing.current = true;
    try {
      const overview = await getDailyMissionOverview();
      const saved = readQueue(await AsyncStorage.getItem(storageKey));
      const next = reconcileMissionRewardQueue(
        saved,
        overview.chests,
        overview.missions,
      );
      const serialized = JSON.stringify(next);
      if (serialized !== JSON.stringify(saved)) {
        await AsyncStorage.setItem(storageKey, serialized);
      }
      if (mounted.current) {
        setQueue((current) =>
          JSON.stringify(current) === serialized ? current : next,
        );
      }
    } catch (error) {
      console.warn("Could not refresh daily mission reward queue.", error);
    } finally {
      refreshing.current = false;
      if (refreshAgain.current) {
        refreshAgain.current = false;
        void refresh();
      }
    }
  }, [storageKey]);

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = subscribeSyncChanges(() => void refresh());
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    void refresh();
    return () => {
      mounted.current = false;
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [refresh]);

  const nextReward = queue[0];
  const nextChestId = nextReward?.chestId;
  useEffect(() => {
    if (!nextReward || chestRouteActive) {
      setActiveReward(null);
      return;
    }
    setActiveReward(nextReward);
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 1250,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (!finished || !mounted.current) return;
      setActiveReward(null);
      router.push({
        pathname: "/chest/[chestId]",
        params: { chestId: nextReward.chestId, rewardFlow: "1" },
      });
    });
    return () => animation.stop();
  }, [chestRouteActive, nextChestId, progress]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Modal
      visible={Boolean(activeReward) && !chestRouteActive}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View
        testID="mission-completion-popup"
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          accessibilityViewIsModal
        >
          <MaterialSheen radius={22} />
          <Text style={[styles.eyebrow, { color: colors.primary }]}>
            NHIỆM VỤ HOÀN THÀNH
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {activeReward?.title}
          </Text>
          <View
            style={[styles.track, { backgroundColor: colors.muted }]}
            accessibilityLabel="Tiến độ nhiệm vụ đang hoàn tất"
          >
            <Animated.View
              testID="mission-completion-progress"
              style={[
                styles.fill,
                {
                  width: progressWidth,
                  backgroundColor: colors.accent,
                },
              ]}
            />
          </View>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Chuẩn bị mở rương cấp {activeReward?.level}
          </Text>
          <Pressable
            testID="mission-completion-open-chest"
            accessibilityRole="button"
            accessibilityLabel="Mở rương nhiệm vụ"
            onPress={() => {
              if (!activeReward) return;
              progress.stopAnimation();
              setActiveReward(null);
              router.push({
                pathname: "/chest/[chestId]",
                params: {
                  chestId: activeReward.chestId,
                  rewardFlow: "1",
                },
              });
            }}
            style={({ pressed }) => [
              styles.openButton,
              {
                backgroundColor: colors.accent,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <Text style={[styles.openButtonText, { color: colors.foreground }]}>
              Mở rương ngay
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  card: {
    width: "100%",
    maxWidth: 390,
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
    gap: 15,
    overflow: "hidden",
    alignItems: "center",
  },
  eyebrow: {
    fontFamily: F.b,
    fontSize: 12,
    letterSpacing: 1.4,
  },
  title: {
    fontFamily: F.b,
    fontSize: 21,
    lineHeight: 28,
    textAlign: "center",
  },
  track: {
    height: 14,
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 8,
  },
  hint: {
    fontFamily: F.r,
    fontSize: 14,
    textAlign: "center",
  },
  openButton: {
    minHeight: 48,
    minWidth: 180,
    borderRadius: 14,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  openButtonText: {
    fontFamily: F.b,
    fontSize: 15,
  },
});

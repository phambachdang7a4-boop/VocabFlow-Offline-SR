import type { DailyMission, DailyMissionLevel } from "./daily-missions";
import type { MissionChest } from "./mission-chests";

export interface MissionRewardQueueItem {
  chestId: string;
  missionId: string;
  title: string;
  level: DailyMissionLevel;
}

export function isMissionRewardQueueItem(
  value: unknown,
): value is MissionRewardQueueItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MissionRewardQueueItem>;
  return (
    typeof item.chestId === "string" &&
    item.chestId.length > 0 &&
    typeof item.missionId === "string" &&
    item.missionId.length > 0 &&
    typeof item.title === "string" &&
    (item.level === 1 || item.level === 2 || item.level === 3)
  );
}

export function reconcileMissionRewardQueue(
  previous: readonly MissionRewardQueueItem[],
  unopenedChests: readonly MissionChest[],
  missions: readonly DailyMission[],
): MissionRewardQueueItem[] {
  const chestById = new Map(unopenedChests.map((chest) => [chest.chestId, chest]));
  const retained = previous.filter((item) => chestById.has(item.chestId));
  const queuedIds = new Set(retained.map((item) => item.chestId));
  const missionById = new Map(missions.map((mission) => [mission.id, mission]));
  const newItems = unopenedChests
    .filter((chest) => !queuedIds.has(chest.chestId))
    .map((chest): MissionRewardQueueItem => {
      const mission = missionById.get(chest.missionId);
      return {
        chestId: chest.chestId,
        missionId: chest.missionId,
        title: mission?.title ?? "Nhiệm vụ hoàn thành",
        level: mission?.level ?? 1,
      };
    })
    .sort(
      (a, b) =>
        a.level - b.level ||
        chestById.get(a.chestId)!.createdAt.localeCompare(
          chestById.get(b.chestId)!.createdAt,
        ) ||
        a.missionId.localeCompare(b.missionId),
    );

  return [...retained, ...newItems];
}

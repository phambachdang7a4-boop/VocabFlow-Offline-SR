export type DailyMissionType =
  "review" | "add-words" | "grade" | "time" | "combo";
export type DailyMissionLevel = 1 | 2 | 3;
export type DailyReviewGrade =
  "S+" | "S" | "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C";

export interface DailyMissionActivity {
  reviewedCount: number;
  addedWordCount: number;
  reviewSessions: {
    grade: DailyReviewGrade;
    reviewedCount: number;
    activeDurationMs: number;
    maxCombo: number;
  }[];
  reviewDurationMs: number;
}

export interface DailyMissionAward {
  missionDay: string;
  missionId: string;
  stone: number;
  completedAt: string;
}

export interface DailyMission {
  id: string;
  type: DailyMissionType;
  level: DailyMissionLevel;
  title: string;
  description: string;
  progress: number;
  target: number;
  stoneReward: number;
  completed: boolean;
  rewarded: boolean;
}

const MISSION_TYPES: DailyMissionType[] = [
  "review",
  "add-words",
  "grade",
  "time",
  "combo",
];
const LEVEL_REWARDS: Record<DailyMissionLevel, readonly [number, number]> = {
  1: [1, 5],
  2: [5, 10],
  3: [10, 20],
};
const REVIEW_TARGETS: Record<DailyMissionLevel, number> = {
  1: 30,
  2: 60,
  3: 90,
};
const ADD_TARGETS: Record<DailyMissionLevel, number> = {
  1: 5,
  2: 10,
  3: 15,
};
const GRADE_TARGETS: Record<DailyMissionLevel, DailyReviewGrade> = {
  1: "A-",
  2: "A",
  3: "A+",
};
const TIME_TARGETS: Record<DailyMissionLevel, number> = {
  1: 5,
  2: 10,
  3: 20,
};
const COMBO_TARGETS: Record<DailyMissionLevel, number> = {
  1: 5,
  2: 10,
  3: 25,
};
const GRADE_RANK: Record<DailyReviewGrade, number> = {
  "S+": 8,
  S: 7,
  "A+": 6,
  A: 5,
  "A-": 4,
  "B+": 3,
  B: 2,
  "B-": 1,
  C: 0,
};

function dayOrdinal(day: string): number {
  const parsed = new Date(`${day}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== day
  ) {
    throw new Error("Ngày nhiệm vụ không hợp lệ.");
  }
  return Math.floor(parsed.getTime() / 86_400_000);
}

function stableHash(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function rewardForDailyMission(
  day: string,
  missionId: string,
  level: DailyMissionLevel,
): number {
  dayOrdinal(day);
  const [minimum, maximum] = LEVEL_REWARDS[level];
  return (
    minimum +
    (stableHash(`${day}:${missionId}:${level}`) % (maximum - minimum + 1))
  );
}

export function isDailyReviewGradeQualified(
  grade: DailyReviewGrade,
  reviewedCount: number,
  requiredGrade: DailyReviewGrade,
): boolean {
  return (
    Number.isSafeInteger(reviewedCount) &&
    reviewedCount >= 30 &&
    GRADE_RANK[grade] >= GRADE_RANK[requiredGrade]
  );
}

export function evaluateDailyMissions(
  day: string,
  activity: DailyMissionActivity,
  awards: DailyMissionAward[],
): DailyMission[] {
  const ordinal = dayOrdinal(day);
  const rotation = ordinal % MISSION_TYPES.length;
  const todayTypes = [
    ...MISSION_TYPES.slice(rotation),
    ...MISSION_TYPES.slice(0, rotation),
  ].slice(0, 3);
  const awardedIds = new Set(
    awards
      .filter((award) => award.missionDay === day)
      .map((award) => award.missionId),
  );

  return todayTypes.map((type, index) => {
    const level = (index + 1) as DailyMissionLevel;
    const id = `${type}-${level}`;
    const specification = missionSpecification(type, level);
    let rawProgress = 0;
    if (type === "review") rawProgress = activity.reviewedCount;
    if (type === "add-words") rawProgress = activity.addedWordCount;
    if (type === "grade") {
      const requiredGrade = GRADE_TARGETS[level];
      rawProgress = activity.reviewSessions.some((session) =>
        isDailyReviewGradeQualified(
          session.grade,
          session.reviewedCount,
          requiredGrade,
        ),
      )
        ? 1
        : 0;
    }
    if (type === "time") {
      rawProgress = Math.floor(Math.max(0, activity.reviewDurationMs) / 60_000);
    }
    if (type === "combo") {
      rawProgress = Math.max(
        0,
        ...activity.reviewSessions.map((session) => session.maxCombo),
      );
    }
    const progress = Math.min(specification.target, Math.max(0, rawProgress));

    return {
      id,
      type,
      level,
      ...specification,
      progress,
      stoneReward: rewardForDailyMission(day, id, level),
      completed: progress >= specification.target,
      rewarded: awardedIds.has(id),
    };
  });
}

export function missionAwardIsEarned(mission: DailyMission): boolean {
  return mission.completed && !mission.rewarded;
}

function missionSpecification(
  type: DailyMissionType,
  level: DailyMissionLevel,
): Pick<DailyMission, "title" | "description" | "target"> {
  if (type === "review") {
    const target = REVIEW_TARGETS[level];
    return {
      title: `Ôn ${target} từ`,
      description: "Trả lời đủ số từ trong một hoặc nhiều lượt ôn hôm nay.",
      target,
    };
  }
  if (type === "add-words") {
    const target = ADD_TARGETS[level];
    return {
      title: `Thêm ${target} từ vào Sổ`,
      description: "Lưu từ mới vào Sổ từ trong hôm nay.",
      target,
    };
  }
  if (type === "grade") {
    const requiredGrade = GRADE_TARGETS[level];
    return {
      title: `Đạt hạng ${requiredGrade} trở lên`,
      description: `Đạt hạng ${requiredGrade} trở lên trong một phiên ôn ít nhất 30 từ.`,
      target: 1,
    };
  }
  if (type === "time") {
    const target = TIME_TARGETS[level];
    return {
      title: `Học ${target} phút`,
      description: "Cộng thời gian trong phiên Ôn tập; tạm dừng khi app ở nền.",
      target,
    };
  }
  const target = COMBO_TARGETS[level];
  return {
    title: `Combo ${target} câu liên tiếp`,
    description: `Trả lời đúng liên tiếp ${target} câu trong một phiên Ôn tập.`,
    target,
  };
}

const assert = require("node:assert/strict");
const { join } = require("node:path");
const { loadTs, missionChests } = require("./test-support.cjs");
const dailyMissions = loadTs(
  join(__dirname, "../domain/daily-missions.ts"),
);

const SvgElement = (name) => name;
const React = {
  createElement(type, props, ...children) {
    return {
      type,
      props: {
        ...props,
        children: children.length === 1 ? children[0] : children,
      },
    };
  },
};
const { DailyMissionArtwork } = loadTs(
  join(__dirname, "../components/DailyMissionArtwork.tsx"),
  {
    react: React,
    "react-native-svg": {
      default: SvgElement("Svg"),
      Svg: SvgElement("Svg"),
      Circle: SvgElement("Circle"),
      Path: SvgElement("Path"),
      Rect: SvgElement("Rect"),
    },
    "@/hooks/useColors": {
      useColors: () => ({
        vocabCard: "blue",
        headerButton: "light-blue",
        vocabCardAccent: "gold",
        vocabCardForeground: "paper",
        foreground: "outline",
      }),
    },
  },
);

const expectedArtwork = {
  review: {
    type: "Rect",
    props: { x: 12, y: 17, width: 52, height: 18 },
  },
  "add-words": {
    type: "Path",
    props: { d: "M8 18h23q7 0 9 6 2-6 9-6h23v43H49q-7 0-9 6-2-6-9-6H8z" },
  },
  grade: {
    type: "Path",
    props: { d: "m40 15 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2z" },
  },
  time: {
    type: "Circle",
    props: { cx: 40, cy: 43, r: 25 },
  },
  combo: {
    type: "Path",
    props: { d: "M12 56 46 12 41 37 69 21 34 70 39 46Z" },
  },
};
const missionTypes = Object.keys(expectedArtwork);
const collectElements = (node, result = []) => {
  if (Array.isArray(node)) {
    for (const child of node) collectElements(child, result);
  } else if (node && typeof node === "object") {
    result.push(node);
    collectElements(node.props?.children, result);
  }
  return result;
};

for (const missionType of missionTypes) {
  const tree = DailyMissionArtwork({ type: missionType, size: 62 });
  assert.equal(
    tree.type.default,
    "Svg",
    `${missionType} renders an SVG illustration.`,
  );
  assert.equal(tree.props.width, 62);
  assert.equal(tree.props.height, 62);
  assert.ok(
    collectElements(tree).some(
      (element) =>
        element.type === expectedArtwork[missionType].type &&
        Object.entries(expectedArtwork[missionType].props).every(
          ([key, value]) => String(element.props[key]) === String(value),
        ),
    ),
    `${missionType} renders its identifying illustration.`,
  );
}

const missionScreen = require("node:fs").readFileSync(
  join(__dirname, "../app/(tabs)/blank.tsx"),
  "utf8",
);
assert.match(
  missionScreen,
  /const compactLayout = screenWidth < 360/,
  "The mission cards use a compact layout below 360 pixels.",
);
assert.match(
  missionScreen,
  /const missionArtworkSize = compactLayout \? 48 : 64/,
  "Mission art scales down on compact screens.",
);
assert.match(
  missionScreen,
  /const chestArtworkSize = compactLayout \? 44 : 56/,
  "Chest art scales down on compact screens.",
);
assert.match(
  missionScreen,
  /testID="mission-scroll-view"/,
  "The mission list remains a scrollable viewport.",
);
assert.match(
  missionScreen,
  /const scrollBottom = Platform\.OS === "web" \? Math\.max\(bottom, 120\) : bottom/,
  "The web preview can scroll the last mission above its bottom navigation.",
);
assert.match(
  missionScreen,
  /<DailyMissionArtwork\s+type=\{mission\.type\}\s+size=\{missionArtworkSize\}\s*\/>/,
  "The missions screen passes each mission's own type to its illustration.",
);
assert.match(
  missionScreen,
  /const rewardRarity = DAILY_MISSION_CHEST_RARITY\[mission\.level\]/,
  "The chest illustration and label use the mission's level.",
);
assert.match(
  missionScreen,
  /Rương \{CHEST_RARITY_LABELS\[rewardRarity\]\} khi hoàn\s+thành/,
  "The card displays the chest tier that the mission will award.",
);
assert.match(
  missionScreen,
  /const finished = mission\.rewarded/,
  "The card's received state follows the stored reward status.",
);
assert.match(
  missionScreen,
  /finished \? \(\s*<View\s+testID=\{`daily-mission-rewarded-\$\{mission\.id\}`\}/,
  "A rewarded mission shows its received-reward indicator.",
);

const { evaluateDailyMissions, DAILY_MISSION_CHEST_RARITY } = dailyMissions;
const { CHEST_RARITY_LABELS } = missionChests;
const activity = Object.freeze({
  reviewedCount: 100,
  addedWordCount: 100,
  reviewSessions: Object.freeze([
    Object.freeze({
      grade: "S+",
      reviewedCount: 100,
      activeDurationMs: 20 * 60_000,
      maxCombo: 30,
    }),
  ]),
  reviewDurationMs: 20 * 60_000,
});
const awards = Object.freeze([]);
const dates = [
  "2026-11-10",
  "2026-11-11",
  "2026-11-12",
  "2026-11-13",
  "2026-11-14",
];
const missionByType = new Map();
for (const day of dates) {
  for (const mission of evaluateDailyMissions(day, activity, [...awards])) {
    if (!missionByType.has(mission.type)) {
      missionByType.set(mission.type, { day, mission });
    }
  }
}

assert.deepEqual(
  new Set(missionByType.keys()),
  new Set(missionTypes),
  "The fixture exercises all five daily mission types.",
);
for (const missionType of missionTypes) {
  const { day, mission } = missionByType.get(missionType);
  assert.equal(mission.completed, true, `${missionType} reaches its target.`);
  const rewardRarity = DAILY_MISSION_CHEST_RARITY[mission.level];
  assert.ok(rewardRarity, `${missionType} has a chest tier.`);
  assert.ok(
    CHEST_RARITY_LABELS[rewardRarity],
    `${missionType} has a visible chest label.`,
  );
  const awarded = evaluateDailyMissions(
    day,
    activity,
    [
      {
        missionDay: day,
        missionId: mission.id,
        stone: mission.stoneReward,
        completedAt: "2026-11-14T12:00:00.000Z",
      },
    ],
  ).find((item) => item.type === missionType);
  assert.equal(
    awarded.rewarded,
    true,
    `${missionType} reflects a recorded chest reward.`,
  );
}

assert.deepEqual(
  activity,
  {
    reviewedCount: 100,
    addedWordCount: 100,
    reviewSessions: [
      {
        grade: "S+",
        reviewedCount: 100,
        activeDurationMs: 20 * 60_000,
        maxCombo: 30,
      },
    ],
    reviewDurationMs: 20 * 60_000,
  },
  "Evaluating the mission examples does not change learner progress.",
);
assert.deepEqual(awards, [], "The check does not add or change rewards.");
for (const day of dates) {
  assert.deepEqual(
    evaluateDailyMissions(day, activity, [...awards]),
    evaluateDailyMissions(day, activity, [...awards]),
    "Repeated checks keep mission progress and reward values stable.",
  );
}

console.log("Daily mission artwork and chest-state checks passed.");

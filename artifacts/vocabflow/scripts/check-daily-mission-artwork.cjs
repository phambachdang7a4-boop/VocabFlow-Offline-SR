const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { loadTs, missionChests } = require("./test-support.cjs");
const dailyMissions = loadTs(
  join(__dirname, "../domain/daily-missions.ts"),
);
const colors = loadTs(join(__dirname, "../constants/colors.ts")).default;

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
    "react-native": {
      Image: SvgElement("Image"),
      Platform: { OS: "web" },
    },
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
    "../assets/images/icon-timer.png": "timer-image",
    "../assets/images/icon-combo.png": "combo-image",
    "../assets/images/icon-words.png": "words-image",
  },
);
let activeColors = colors.light;
const { ChestTierArtwork } = loadTs(
  join(__dirname, "../components/ChestTierArtwork.tsx"),
  {
    react: React,
    "react-native": {
      Image: SvgElement("Image"),
      Platform: { OS: "web" },
      View: SvgElement("View"),
    },
    "react-native-reanimated": {
      __esModule: true,
      default: { View: SvgElement("AnimatedView") },
      interpolate: () => 0,
      useAnimatedStyle: (callback) => callback(),
      useSharedValue: (value) => ({ value }),
    },
    "react-native-svg": {
      __esModule: true,
      default: SvgElement("Svg"),
      Svg: SvgElement("Svg"),
      Path: SvgElement("Path"),
      Rect: SvgElement("Rect"),
      Text: SvgElement("SvgText"),
    },
    "@/hooks/useColors": { useColors: () => activeColors },
    "../assets/images/chest-copper.png": "copper-chest-image",
    "../assets/images/chest-silver.png": "silver-chest-image",
    "../assets/images/chest-gold.png": "gold-chest-image",
    "../assets/images/chest-copper-lid.png": "copper-chest-lid-image",
    "../assets/images/chest-silver-lid.png": "silver-chest-lid-image",
    "../assets/images/chest-gold-lid.png": "gold-chest-lid-image",
  },
);

const expectedArtwork = {
  "add-words": {
    type: "Path",
    props: { d: "M8 18h23q7 0 9 6 2-6 9-6h23v43H49q-7 0-9 6-2-6-9-6H8z" },
  },
  grade: {
    type: "Path",
    props: { d: "m40 15 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2z" },
  },
};
const missionImageTypes = {
  time: "timer-image",
  combo: "combo-image",
  review: "words-image",
};
const missionTypes = ["review", "add-words", "grade", "time", "combo"];
const collectElements = (node, result = []) => {
  if (Array.isArray(node)) {
    for (const child of node) collectElements(child, result);
  } else if (node && typeof node === "object") {
    result.push(node);
    collectElements(node.props?.children, result);
  }
  return result;
};
const colorLuminance = (hex) => {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    .map((value) => parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};
const contrastRatio = (foreground, background) => {
  const values = [colorLuminance(foreground), colorLuminance(background)].sort(
    (a, b) => b - a,
  );
  return (values[0] + 0.05) / (values[1] + 0.05);
};

for (const missionType of missionTypes) {
  const tree = DailyMissionArtwork({ type: missionType, size: 62 });
  if (missionImageTypes[missionType]) {
    assert.equal(tree.type, "Image", `${missionType} uses the supplied image.`);
    assert.equal(tree.props.source, missionImageTypes[missionType]);
    assert.equal(tree.props.resizeMode, "contain");
    assert.equal(tree.props.resizeMethod, "scale");
    assert.equal(tree.props.style.width, 62);
    assert.equal(tree.props.style.height, 62);
    assert.equal(tree.props.style.imageRendering, "pixelated");
  } else {
    assert.equal(
      tree.type.default,
      "Svg",
      `${missionType} retains its existing SVG illustration.`,
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
      `${missionType} retains its identifying illustration.`,
    );
  }
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
  /const missionArtworkSize = 64/,
  "The mission icon image is displayed at 64 dp.",
);
assert.match(
  missionScreen,
  /const chestArtworkSize = 64/,
  "The chest image is displayed at 64 dp.",
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
  /`Rương \$\{CHEST_RARITY_LABELS\[rewardRarity\]\} khi hoàn thành`/,
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
assert.match(
  missionScreen,
  /const rewardLabelColor = finished\s*\?\s*c\.successText/,
  "Received rewards keep the existing success-label color.",
);
for (const tierColor of ["#C77B30", "#A9B4C2", "#E8B84A"]) {
  assert.ok(missionScreen.includes(tierColor), `The ${tierColor} tier label color is applied.`);
}
assert.match(
  missionScreen,
  /`Đã nhận · Rương \$\{CHEST_RARITY_LABELS\[rewardRarity\]\}`/,
  "The chest label names the received state as well as the tier.",
);
assert.match(
  missionScreen,
  /backgroundColor: c\.successSoft,\s*borderColor: c\.success/,
  "The received marker has a theme-aware surface and visible border.",
);
assert.match(
  missionScreen,
  /color=\{c\.successText\}/,
  "The received checkmark uses a high-contrast success color.",
);
assert.doesNotMatch(
  missionScreen,
  /styles\.rewardArtwork,[\s\S]{0,260}backgroundColor: c\.input/,
  "The chest artwork has no separate background tile.",
);
assert.match(
  missionScreen,
  /borderRadius: 24,[\s\S]{0,120}minHeight: 150/,
  "Mission cards use the requested rounded, compact size.",
);
assert.match(
  missionScreen,
  /backgroundColor: finished \? c\.successSoft : c\.card/,
  "Rewarded and unclaimed missions use their matching theme surfaces.",
);
assert.match(
  readFileSync(join(__dirname, "../components/ChestTierArtwork.tsx"), "utf8"),
  /rarity === "legendary" \? colors\.mutedForeground : palette\.outline/,
  "The darkest chest uses a theme-aware outline.",
);
for (const [rarity, source] of [
  ["common", "copper-chest-image"],
  ["uncommon", "silver-chest-image"],
  ["rare", "gold-chest-image"],
]) {
  const artwork = ChestTierArtwork({ rarity, size: 64 });
  const [bodyImage, animatedLid] = artwork.props.children;
  const lidImage = animatedLid.props.children;
  assert.equal(bodyImage.type, "Image");
  assert.equal(bodyImage.props.testID, "chest-body");
  assert.equal(bodyImage.props.source, source);
  assert.equal(animatedLid.type, "AnimatedView");
  assert.equal(animatedLid.props.testID, "chest-lid");
  assert.equal(animatedLid.props.pointerEvents, "none");
  assert.equal(lidImage.type, "Image");
  assert.equal(
    lidImage.props.source,
    source.replace("chest-image", "chest-lid-image"),
  );
  for (const image of [bodyImage, lidImage]) {
    assert.equal(image.props.resizeMode, "contain");
    assert.equal(image.props.resizeMethod, "scale");
    assert.equal(image.props.style.width, 64);
    assert.equal(image.props.style.height, 64);
    assert.equal(image.props.style.imageRendering, "pixelated");
  }
}

for (const [themeName, theme] of Object.entries(colors)) {
  if (themeName === "radius") continue;
  const rewardStates = [
    {
      name: "unclaimed",
      surface: theme.card,
      label: theme.foreground,
    },
    {
      name: "received",
      surface: theme.successSoft,
      label: theme.successText,
    },
  ];
  for (const state of rewardStates) {
    assert.ok(
      contrastRatio(state.label, state.surface) >= 4.5,
      `${themeName} ${state.name} chest labels are readable.`,
    );
  }
  assert.ok(
    contrastRatio(theme.mutedForeground, theme.input) >= 4.5,
    `${themeName} legendary artwork outlines remain visible on the chest surface.`,
  );

  activeColors = theme;
  const legendaryArtwork = ChestTierArtwork({ rarity: "legendary", size: 56 });
  assert.ok(
    collectElements(legendaryArtwork).some(
      (element) =>
        element.type === "Rect" && element.props.fill === theme.mutedForeground,
    ),
    `${themeName} legendary chest uses a contrasting body outline.`,
  );
  assert.ok(
    collectElements(legendaryArtwork).some(
      (element) =>
        element.type === "Path" && element.props.fill === theme.mutedForeground,
    ),
    `${themeName} legendary chest uses a contrasting lid outline.`,
  );
}

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

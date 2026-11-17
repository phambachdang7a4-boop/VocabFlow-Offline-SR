import React from "react";
import {
  Image,
  Platform,
  View,
  type ImageStyle,
  type ImageSourcePropType,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import { type ChestRarity } from "@/domain/mission-chests";

const CHEST_IMAGE_SOURCES: Partial<Record<ChestRarity, ImageSourcePropType>> = {
  common: require("../assets/images/chest-copper.png"),
  uncommon: require("../assets/images/chest-silver.png"),
  rare: require("../assets/images/chest-gold.png"),
};

type ChestPalette = {
  body: string;
  bodyLight: string;
  lid: string;
  lidLight: string;
  shadow: string;
  trim: string;
  gem: string;
  outline: string;
};

const PALETTES: Record<ChestRarity, ChestPalette> = {
  common: {
    body: "#985832",
    bodyLight: "#B97543",
    lid: "#A96337",
    lidLight: "#C7824C",
    shadow: "#4D2D22",
    trim: "#D9A263",
    gem: "#E7A45A",
    outline: "#42261D",
  },
  uncommon: {
    body: "#687B8B",
    bodyLight: "#8799A8",
    lid: "#778B9B",
    lidLight: "#A4B1BD",
    shadow: "#344552",
    trim: "#DCE5ED",
    gem: "#BFE3F2",
    outline: "#2F3B45",
  },
  rare: {
    body: "#75412F",
    bodyLight: "#A85F3A",
    lid: "#8C4D32",
    lidLight: "#B56A43",
    shadow: "#452622",
    trim: "#F7C94E",
    gem: "#C77DE0",
    outline: "#3A2020",
  },
  epic: {
    body: "#3F4F70",
    bodyLight: "#637BA0",
    lid: "#4C6088",
    lidLight: "#7890B5",
    shadow: "#20283B",
    trim: "#D7E5F6",
    gem: "#A997FF",
    outline: "#1E2639",
  },
  legendary: {
    body: "#171A20",
    bodyLight: "#292E37",
    lid: "#20242B",
    lidLight: "#383E49",
    shadow: "#08090B",
    trim: "#D7D9DE",
    gem: "#E9B949",
    outline: "#08090B",
  },
};

export function ChestTierArtwork({
  rarity,
  size,
  lidProgress,
  mark,
  sparkle = false,
}: {
  rarity: ChestRarity;
  size: number;
  lidProgress?: SharedValue<number>;
  mark?: string;
  sparkle?: boolean;
}) {
  const palette = PALETTES[rarity];
  const colors = useColors();
  const outlineColor =
    rarity === "legendary" ? colors.mutedForeground : palette.outline;
  const closedLidProgress = useSharedValue(0);
  const currentLidProgress = lidProgress ?? closedLidProgress;
  const lidStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(currentLidProgress.value, [0, 1], [0, -18]) },
      {
        rotateZ: `${interpolate(currentLidProgress.value, [0, 1], [0, -12])}deg`,
      },
    ],
  }));
  const chestImage = CHEST_IMAGE_SOURCES[rarity];

  if (chestImage) {
    const imageStyle = {
      width: size,
      height: size,
      ...(Platform.OS === "web" ? { imageRendering: "pixelated" } : {}),
    } as ImageStyle;

    return (
      <Animated.View style={[{ width: size, height: size }, lidStyle]}>
        <Image
          source={chestImage}
          resizeMode="contain"
          resizeMethod="scale"
          style={imageStyle}
        />
      </Animated.View>
    );
  }

  return (
    <View style={{ width: size, height: size * 0.92, position: "relative" }}>
      <Svg
        width={size}
        height={size * 0.92}
        viewBox="0 0 220 202"
      >
        <Rect
          x="36"
          y="168"
          width="148"
          height="12"
          fill={palette.shadow}
          opacity="0.72"
        />
        <Rect
          x="28"
          y="86"
          width="164"
          height="82"
          fill={outlineColor}
        />
        <Rect
          x="34"
          y="92"
          width="152"
          height="68"
          fill={palette.body}
        />
        <Rect
          x="40"
          y="96"
          width="140"
          height="12"
          fill={palette.bodyLight}
        />
        <Rect
          x="40"
          y="112"
          width="140"
          height="10"
          fill={palette.body}
        />
        <Rect
          x="40"
          y="126"
          width="140"
          height="12"
          fill={palette.bodyLight}
        />
        <Rect
          x="40"
          y="142"
          width="140"
          height="12"
          fill={palette.body}
        />
        <Rect x="60" y="94" width="5" height="64" fill={palette.shadow} opacity="0.55" />
        <Rect x="154" y="94" width="5" height="64" fill={palette.shadow} opacity="0.55" />
        <Rect x="70" y="88" width="15" height="76" fill={palette.trim} />
        <Rect x="73" y="94" width="5" height="64" fill={palette.lidLight} />
        <Rect x="135" y="88" width="15" height="76" fill={palette.trim} />
        <Rect x="140" y="94" width="5" height="64" fill={palette.lidLight} />
        <Rect x="34" y="156" width="152" height="10" fill={palette.trim} />
        <Rect x="40" y="159" width="140" height="4" fill={palette.lidLight} />
        <Rect x="42" y="112" width="8" height="8" fill={palette.trim} />
        <Rect x="170" y="112" width="8" height="8" fill={palette.trim} />
        <Rect x="42" y="138" width="8" height="8" fill={palette.trim} />
        <Rect x="170" y="138" width="8" height="8" fill={palette.trim} />

        <Rect
          x="94"
          y="117"
          width="32"
          height="34"
          fill={palette.shadow}
        />
        <Rect
          x="98"
          y="121"
          width="24"
          height="27"
          fill={palette.trim}
        />
        <Rect x="103" y="125" width="14" height="18" fill={palette.lidLight} />
        <Rect x="108" y="129" width="5" height="9" fill={palette.shadow} />
        <Rect x="106" y="137" width="9" height="6" fill={palette.shadow} />
        {mark ? (
          <SvgText
            x="110"
            y="137"
            textAnchor="middle"
            fontSize="10"
            fontWeight="900"
            fill={palette.outline}
          >
            {mark}
          </SvgText>
        ) : null}

        <Rect x="44" y="78" width="10" height="10" fill={palette.gem} />
        <Rect x="166" y="78" width="10" height="10" fill={palette.gem} />
        {sparkle ? (
          <>
            <Path
              d="M15 49h5v-5h5v5h5v5h-5v5h-5v-5h-5zm170-19h5v-5h5v5h5v5h-5v5h-5v-5h-5z"
              fill={palette.trim}
              opacity="0.9"
            />
            <Path
              d="M194 63h3v-4h3v4h4v3h-4v4h-3v-4h-3z"
              fill={palette.gem}
              opacity="0.85"
            />
          </>
        ) : null}
      </Svg>

      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            width: size,
            height: size * 0.53,
            zIndex: 2,
          },
          lidStyle,
        ]}
      >
        <Svg width={size} height={size * 0.53} viewBox="0 0 220 116">
          <Path
            d="M27 100V70H33V52H42V37H52V25H68V16H152V25H168V37H178V52H187V70H193V100Z"
            fill={outlineColor}
          />
          <Path
            d="M34 94V68H40V50H49V39H58V29H71V22H149V29H162V39H171V50H180V68H186V94Z"
            fill={palette.lid}
          />
          <Path
            d="M46 66V51H54V41H65V33H155V41H166V51H174V66Z"
            fill={palette.lidLight}
          />
          <Rect x="70" y="22" width="14" height="74" fill={palette.trim} />
          <Rect x="74" y="27" width="5" height="63" fill={palette.lidLight} />
          <Rect x="136" y="22" width="14" height="74" fill={palette.trim} />
          <Rect x="140" y="27" width="5" height="63" fill={palette.lidLight} />
          <Rect x="34" y="88" width="152" height="10" fill={palette.trim} />
          <Rect x="41" y="91" width="138" height="4" fill={palette.lidLight} />
          <Rect x="44" y="69" width="8" height="8" fill={palette.gem} />
          <Rect x="168" y="69" width="8" height="8" fill={palette.gem} />
          <Rect x="103" y="67" width="14" height="14" fill={palette.trim} />
        </Svg>
      </Animated.View>
    </View>
  );
}


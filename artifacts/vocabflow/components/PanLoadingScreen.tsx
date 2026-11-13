import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppearance } from "@/contexts/AppearanceContext";

const panArtworkLight = require("../assets/images/pan-loading-light.png");
const panArtworkDark = require("../assets/images/pan-loading-dark.png");

export function PanLoadingScreen() {
  const colors = useColors();
  const { mode } = useAppearance();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const panArtwork = mode === "dark" ? panArtworkDark : panArtworkLight;
  const useNativeDriver = Platform.OS !== "web";
  const [reduceMotion, setReduceMotion] = useState(false);
  const sweep = useRef(new Animated.Value(0)).current;
  const squareSize = Math.max(
    220,
    Math.min(360, width - 40, height - insets.top - insets.bottom - 230),
  );
  const panArtworkHeight = Math.min(190, Math.max(148, squareSize * 0.54));
  const panTranslateX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-7, 7],
  });
  const panRotate = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: ["-1.5deg", "1.5deg"],
  });
  const dustTranslateX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-squareSize * 0.15, squareSize * 0.15],
  });
  const dustOpacity = sweep.interpolate({
    inputRange: [0, 0.2, 0.5, 0.8, 1],
    outputRange: [0.12, 0.82, 0.3, 0.82, 0.12],
  });

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    sweep.setValue(0);
    if (reduceMotion) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1,
          duration: 280,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver,
        }),
        Animated.timing(sweep, {
          toValue: 0,
          duration: 280,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, sweep]);

  return (
    <View
      testID="pan-loading-screen"
      accessibilityLabel="Đang quét dọn"
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <View
          testID="pan-loading-square"
          style={[
            styles.artFrame,
            {
              width: squareSize,
              height: squareSize,
              borderColor: colors.border,
            },
          ]}
        >
          <ImageBackground
            source={panArtwork}
            resizeMode="cover"
            blurRadius={18}
            style={StyleSheet.absoluteFill}
          >
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.overlay },
              ]}
            />
          </ImageBackground>
          <Animated.View
            testID="pan-loading-sweep-motion"
            style={{
              transform: [
                { translateX: panTranslateX },
                { rotate: panRotate },
              ],
            }}
          >
            <Image
              testID="pan-loading-figure"
              source={panArtwork}
              resizeMode="contain"
              accessibilityLabel="Cừu Pan đang quét dọn"
              style={{
                width: panArtworkHeight * (704 / 1524),
                height: panArtworkHeight,
              }}
            />
          </Animated.View>
          {!reduceMotion ? (
            <Animated.View
              testID="pan-loading-sweep-dust"
              pointerEvents="none"
              style={[
                styles.sweepTrail,
                {
                  width: squareSize * 0.34,
                  bottom: squareSize * 0.19,
                  backgroundColor: colors.button,
                  opacity: dustOpacity,
                  transform: [{ translateX: dustTranslateX }],
                },
              ]}
            >
              <View style={[styles.dustDot, styles.dustDotNear]} />
              <View style={[styles.dustDot, styles.dustDotFar]} />
            </Animated.View>
          ) : null}
        </View>
        <Text
          testID="pan-loading-caption"
          accessibilityRole="text"
          style={[
            styles.caption,
            {
              color: colors.headerForeground,
              backgroundColor: `${colors.header}E8`,
              borderColor: `${colors.headerForeground}66`,
              marginTop: 18,
            },
          ]}
        >
          Đang quét dọn
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    paddingHorizontal: 20,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  artFrame: {
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  sweepTrail: {
    position: "absolute",
    left: "33%",
    height: 3,
    borderRadius: 3,
  },
  dustDot: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#F7E2A2",
  },
  dustDotNear: { left: "18%", top: -6 },
  dustDotFar: { right: "16%", top: 5, width: 3, height: 3 },
  caption: {
    overflow: "hidden",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 11,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    letterSpacing: 0.1,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.28)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

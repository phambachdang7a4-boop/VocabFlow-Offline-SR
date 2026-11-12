import React from "react";
import { ImageBackground, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const panArtwork = require("../assets/images/pan-loading.png");

export function PanLoadingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID="pan-loading-screen"
      accessibilityLabel="Đang quét dọn"
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <ImageBackground
        source={panArtwork}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
        imageStyle={styles.image}
      >
        <View
          pointerEvents="none"
          style={[
            styles.captionWrap,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
          ]}
        >
          <Text
            testID="pan-loading-caption"
            accessibilityRole="text"
            style={[
              styles.caption,
              {
                color: colors.headerForeground,
                backgroundColor: `${colors.header}E8`,
                borderColor: `${colors.headerForeground}66`,
              },
            ]}
          >
            Đang quét dọn
          </Text>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  captionWrap: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 24,
  },
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

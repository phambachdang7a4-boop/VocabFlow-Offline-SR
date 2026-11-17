import React from "react";
import { Image, Platform, type ImageStyle } from "react-native";

interface CorviChestArtworkProps {
  size: number;
  testID?: string;
}

const pixelatedImageStyle =
  Platform.OS === "web"
    ? ({ imageRendering: "pixelated" } as unknown as ImageStyle)
    : null;

/** The supplied pixel-art chest used for Corvi's legendary chest. */
export function CorviChestArtwork({ size, testID }: CorviChestArtworkProps) {
  return (
    <Image
      testID={testID}
      source={require("../assets/images/corvi-chest.png")}
      accessible
      accessibilityLabel="Rương Corvi · Hắc Diệu Thạch"
      resizeMode="contain"
      resizeMethod="scale"
      style={[
        { width: size, height: size },
        pixelatedImageStyle,
      ]}
    />
  );
}

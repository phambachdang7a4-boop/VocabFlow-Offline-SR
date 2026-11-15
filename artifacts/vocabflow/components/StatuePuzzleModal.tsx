import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { F, MaterialSheen } from "@/components/ui";
import {
  createStatuePuzzle,
  isStatuePuzzleSolved,
  swapStatuePuzzleTiles,
} from "@/domain/statue-puzzle";

type Props = {
  craftId: string;
  title: string;
  rarityLabel: string;
  image: ImageSourcePropType;
  onComplete: () => void;
  onSkip: () => void;
};

export function StatuePuzzleModal({
  craftId,
  title,
  rarityLabel,
  image,
  onComplete,
  onSkip,
}: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const boardSize = Math.min(340, Math.max(210, width - 76));
  const tileSize = (boardSize - 4) / 3;
  const [tiles, setTiles] = useState<number[]>(() => createStatuePuzzle());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<"rolling" | "puzzle" | "solved">("rolling");
  const spin = useSharedValue(0);
  const solvedCount = useMemo(
    () => tiles.reduce((count, tile, index) => count + Number(tile === index), 0),
    [tiles],
  );

  useEffect(() => {
    setTiles(createStatuePuzzle());
    setSelectedIndex(null);
    setPhase("rolling");
    spin.value = 0;
    spin.value = withTiming(1, {
      duration: 1250,
      easing: Easing.out(Easing.cubic),
    });
    const timer = setTimeout(() => setPhase("puzzle"), 1250);
    return () => {
      clearTimeout(timer);
      cancelAnimation(spin);
    };
  }, [craftId]);

  useEffect(() => {
    if (phase !== "solved") return;
    const timer = setTimeout(onComplete, 700);
    return () => clearTimeout(timer);
  }, [onComplete, phase]);

  const rollStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, spin.value * 1.8),
    transform: [
      { perspective: 800 },
      { rotateY: `${(1 - spin.value) * 540}deg` },
      { scale: 0.76 + spin.value * 0.24 },
    ],
  }));

  const handleTilePress = (index: number) => {
    if (phase !== "puzzle") return;
    if (selectedIndex === null) {
      setSelectedIndex(index);
      return;
    }
    if (selectedIndex === index) {
      setSelectedIndex(null);
      return;
    }
    const next = swapStatuePuzzleTiles(tiles, selectedIndex, index);
    setTiles(next);
    setSelectedIndex(null);
    if (isStatuePuzzleSolved(next)) setPhase("solved");
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onSkip}
    >
      <View
        testID="statue-puzzle-modal"
        style={[
          styles.backdrop,
          {
            backgroundColor: c.overlay,
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: c.card, borderColor: c.border },
          ]}
          accessibilityViewIsModal
        >
          <MaterialSheen tone="gold" radius={24} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.eyebrow, { color: c.primary }]}>
                TƯỢNG {rarityLabel.toLocaleUpperCase("vi-VN")}
              </Text>
              <Text style={[styles.title, { color: c.foreground }]}>
                {phase === "rolling"
                  ? "Đang quay tượng"
                  : phase === "solved"
                    ? "Ghép thành công"
                    : "Ghép tượng"}
              </Text>
            </View>
            <MaterialCommunityIcons
              name={phase === "rolling" ? "dice-multiple" : "puzzle"}
              size={26}
              color={c.accent}
            />
          </View>

          {phase === "rolling" ? (
            <View style={styles.rollStage} testID="statue-roll-animation">
              <Animated.View style={rollStyle}>
                <Image
                  accessibilityLabel="Tượng vừa được quay"
                  source={image}
                  resizeMode="cover"
                  style={[
                    styles.rollArtwork,
                    { backgroundColor: c.muted },
                  ]}
                />
              </Animated.View>
              <Text style={[styles.hint, { color: c.mutedForeground }]}>
                Corvi đang chọn một tượng mới…
              </Text>
            </View>
          ) : phase === "solved" ? (
            <Animated.View
              entering={FadeInUp.duration(500)}
              style={styles.solvedStage}
              testID="statue-puzzle-solved"
            >
              <Image
                accessibilityLabel={title}
                source={image}
                resizeMode="cover"
                style={[styles.solvedArtwork, { backgroundColor: c.muted }]}
              />
              <Text style={[styles.solvedTitle, { color: c.successText }]}>
                {title}
              </Text>
              <Text style={[styles.hint, { color: c.mutedForeground }]}>
                Tượng đã được thêm vào Bộ Sưu Tập.
              </Text>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.duration(350)} style={styles.game}>
              <View style={styles.gameInstructions}>
                <Text style={[styles.hint, { color: c.mutedForeground }]}>
                  Chạm một mảnh, rồi chạm ô muốn đổi chỗ.
                </Text>
                <Text
                  testID="statue-puzzle-progress"
                  style={[styles.progress, { color: c.primary }]}
                >
                  {solvedCount}/9
                </Text>
              </View>
              <View
                testID="statue-puzzle-board"
                style={[
                  styles.board,
                  { width: boardSize, height: boardSize, backgroundColor: c.muted },
                ]}
              >
                {tiles.map((tile, index) => {
                  const row = Math.floor(tile / 3);
                  const column = tile % 3;
                  const isSelected = selectedIndex === index;
                  return (
                    <Pressable
                      key={`${craftId}-${index}`}
                      testID={`statue-puzzle-tile-${index}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Mảnh ${tile + 1}, ô ${index + 1}`}
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => handleTilePress(index)}
                      style={[
                        styles.tile,
                        {
                          width: tileSize,
                          height: tileSize,
                          borderColor: isSelected ? c.accent : c.card,
                        },
                      ]}
                    >
                      <Image
                        source={image}
                        resizeMode="cover"
                        style={[
                          styles.tileImage,
                          {
                            width: tileSize * 3,
                            height: tileSize * 3,
                            left: -column * tileSize,
                            top: -row * tileSize,
                          },
                        ]}
                      />
                      {isSelected ? (
                        <View
                          pointerEvents="none"
                          style={[
                            styles.selectedTileOverlay,
                            { borderColor: c.accent },
                          ]}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          )}

          <Pressable
            testID="statue-puzzle-skip"
            accessibilityRole="button"
            accessibilityLabel="Bỏ qua trò ghép và nhận tượng"
            onPress={onSkip}
            style={({ pressed }) => [
              styles.skipButton,
              {
                borderColor: c.border,
                backgroundColor: c.card,
                opacity: pressed ? 0.78 : 1,
              },
            ]}
          >
            <Feather name="skip-forward" size={16} color={c.mutedForeground} />
            <Text style={[styles.skipLabel, { color: c.foreground }]}>
              Bỏ qua, nhận tượng
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
    paddingHorizontal: 16,
  },
  card: {
    width: "100%",
    maxWidth: 390,
    maxHeight: "96%",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    overflow: "hidden",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCopy: { flex: 1, gap: 4 },
  eyebrow: { fontFamily: F.b, fontSize: 10, letterSpacing: 1.2 },
  title: { fontFamily: F.b, fontSize: 21 },
  hint: { fontFamily: F.r, fontSize: 13, lineHeight: 18, textAlign: "center" },
  rollStage: { alignItems: "center", gap: 12, paddingVertical: 6 },
  rollArtwork: { width: 210, height: 210, borderRadius: 18 },
  game: { width: "100%", alignItems: "center", gap: 10 },
  gameInstructions: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  progress: { fontFamily: F.b, fontSize: 13 },
  board: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    padding: 0,
    overflow: "hidden",
    borderRadius: 12,
  },
  tile: {
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderRadius: 4,
  },
  tileImage: { position: "absolute" },
  selectedTileOverlay: {
    ...StyleSheet.absoluteFill,
    borderWidth: 3,
    borderRadius: 4,
  },
  solvedStage: { alignItems: "center", gap: 9, paddingVertical: 4 },
  solvedArtwork: { width: 176, height: 176, borderRadius: 18 },
  solvedTitle: { fontFamily: F.b, fontSize: 17, textAlign: "center" },
  skipButton: {
    minHeight: 44,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
  },
  skipLabel: { fontFamily: F.b, fontSize: 13 },
});

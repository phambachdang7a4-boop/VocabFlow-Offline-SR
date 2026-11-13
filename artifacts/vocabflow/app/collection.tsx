import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { ErrorBanner, F, MaterialSheen } from "@/components/ui";
import {
  craftCollectionArtwork,
  getMissionCollectionOverview,
  type MissionCollectionOverview,
} from "@/data/vocabulary";
import {
  COLLECTION_ARTWORKS,
  type CollectionArtwork,
  type CollectionCraft,
} from "@/domain/collection-artworks";
import {
  CHEST_RARITIES,
  CHEST_RARITY_COLORS,
  CHEST_RARITY_ICON_COLORS,
  CHEST_RARITY_LABELS,
  CHEST_RARITY_TEXT_COLORS,
  type ChestRarity,
} from "@/domain/mission-chests";

const RARITY_ORDER: ChestRarity[] = [...CHEST_RARITIES];
const ARTWORK_IMAGE_SOURCES: Record<string, ImageSourcePropType> = {
  "ho-chi-minh-marble": require("../assets/images/ho-chi-minh-marble.png"),
  "alexander-marble": require("../assets/images/alexander-marble.png"),
  "leonardo-marble": require("../assets/images/leonardo-marble.png"),
  "kant-marble": require("../assets/images/kant-marble.png"),
  "marcus-aurelius-marble": require("../assets/images/marcus-aurelius-marble.png"),
  "benjamin-franklin-marble": require("../assets/images/benjamin-franklin-marble.png"),
  "napoleon-marble": require("../assets/images/napoleon-marble.png"),
};

function rarityDisplayLabel(rarity: ChestRarity): string {
  return rarity === "legendary" ? "Legendary" : CHEST_RARITY_LABELS[rarity];
}

export default function CollectionScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [overview, setOverview] = useState<MissionCollectionOverview | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [crafting, setCrafting] = useState<ChestRarity | null>(null);
  const [newCraft, setNewCraft] = useState<CollectionCraft | null>(null);
  const [selectedStatue, setSelectedStatue] =
    useState<CollectionArtwork | null>(null);
  const [showEnglishBiography, setShowEnglishBiography] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const newCraftArtwork = newCraft
    ? COLLECTION_ARTWORKS.find((item) => item.id === newCraft.artworkId)
    : undefined;
  const newCraftImage = newCraftArtwork?.imageAssetKey
    ? ARTWORK_IMAGE_SOURCES[newCraftArtwork.imageAssetKey]
    : undefined;
  const unlockedStatues = overview
    ? COLLECTION_ARTWORKS.filter(
        (statue) =>
          statue.unlockMode === "automatic" ||
          overview.crafts.some((craft) => craft.artworkId === statue.id),
      )
    : [];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOverview(await getMissionCollectionOverview());
      setError(null);
    } catch {
      setError("Không thể tải Bộ Sưu Tập. Dữ liệu vẫn được giữ trên thiết bị.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const craft = async (rarity: ChestRarity) => {
    setCrafting(rarity);
    try {
      setNewCraft(await craftCollectionArtwork(rarity));
      setError(null);
      setOverview(await getMissionCollectionOverview());
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Chưa ghép được tượng.",
      );
    } finally {
      setCrafting(null);
    }
  };

  const closeStatueDetails = () => {
    setSelectedStatue(null);
    setShowEnglishBiography(false);
  };

  return (
    <>
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(30, insets.bottom + 24) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.intro, { color: c.mutedForeground }]}>
        Tất cả tượng hiện có đã được mở khóa sẵn. Chạm vào tượng để xem thông
        tin và tiểu sử song ngữ.
      </Text>
      {error ? (
        <ErrorBanner message={error} onRetry={() => void load()} />
      ) : null}
      {newCraft ? (
        <View
          testID="new-collection-artwork"
          accessibilityLiveRegion="polite"
          style={[
            styles.reveal,
            {
              backgroundColor: CHEST_RARITY_COLORS[newCraft.rarity],
              shadowColor: c.shade,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 8,
              elevation: 4,
            },
          ]}
        >
          <MaterialSheen tone="gold" radius={16} />
          {newCraftImage ? (
            <Image
              accessibilityLabel={newCraftArtwork?.title}
              source={newCraftImage}
              style={styles.revealArtwork}
              resizeMode="cover"
            />
          ) : (
            <Feather
              name="award"
              size={24}
              color={CHEST_RARITY_ICON_COLORS[newCraft.rarity]}
            />
          )}
          <View style={styles.revealText}>
            <Text
              style={[
                styles.revealTitle,
                { color: CHEST_RARITY_ICON_COLORS[newCraft.rarity] },
              ]}
            >
              Đã mở tượng mới!
            </Text>
            <Text
              style={[
                styles.revealSubtitle,
                { color: CHEST_RARITY_ICON_COLORS[newCraft.rarity] },
              ]}
            >
              {newCraftArtwork?.title ?? "Tượng"} ·{" "}
              {rarityDisplayLabel(newCraft.rarity)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng thông báo tượng mới"
            onPress={() => setNewCraft(null)}
            hitSlop={10}
          >
            <Feather
              name="x"
              size={20}
              color={CHEST_RARITY_ICON_COLORS[newCraft.rarity]}
            />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.heading}>
        <Text style={[styles.title, { color: c.foreground }]}>Mảnh ghép</Text>
        <Text style={[styles.caption, { color: c.mutedForeground }]}>
          Các tượng hiện có đều đã mở khóa sẵn.
        </Text>
      </View>

      {loading && !overview ? <ActivityIndicator color={c.primary} /> : null}
      {overview ? (
        <View style={styles.rarityGrid}>
          {RARITY_ORDER.map((rarity) => {
            const fragments = overview.fragments[rarity];
            const hasStatue = COLLECTION_ARTWORKS.some(
              (item) => item.rarity === rarity,
            );
            const hasCraftableStatue = COLLECTION_ARTWORKS.some(
              (item) =>
                item.rarity === rarity && item.unlockMode !== "automatic",
            );
            const canCraft =
              hasCraftableStatue && fragments >= 100 && crafting === null;
            const tileLabel = rarityDisplayLabel(rarity);
            const status = !hasStatue
              ? "Chưa có tượng ở phẩm chất này."
              : !hasCraftableStatue
                ? "Tượng đã mở khóa sẵn."
                : canCraft
                  ? "Chạm để ghép tượng."
                  : "Cần đủ 100 mảnh để ghép tượng.";
            return (
              <Pressable
                key={rarity}
                testID={`collection-rarity-${rarity}`}
                accessibilityRole="button"
                accessibilityLabel={`${tileLabel}: ${fragments} mảnh. ${status}`}
                accessibilityState={{ disabled: !canCraft }}
                disabled={!canCraft}
                onPress={() => void craft(rarity)}
                style={({ pressed }) => [
                  styles.rarityTile,
                  {
                    backgroundColor: c.card,
                    borderColor: c.border,
                    shadowColor: c.shade,
                    shadowOffset: { width: 0, height: pressed ? 1 : 3 },
                    shadowOpacity: pressed ? 0.08 : 0.14,
                    shadowRadius: 6,
                    elevation: pressed ? 1 : 3,
                    opacity: !hasStatue ? 0.58 : pressed ? 0.86 : 1,
                  },
                ]}
              >
                <MaterialSheen radius={15} />
                <View
                  style={[
                    styles.rarityIcon,
                    { backgroundColor: CHEST_RARITY_COLORS[rarity] },
                  ]}
                >
                  {crafting === rarity ? (
                    <ActivityIndicator
                      size="small"
                      color={CHEST_RARITY_ICON_COLORS[rarity]}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name="puzzle"
                      size={24}
                      color={CHEST_RARITY_ICON_COLORS[rarity]}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.rarityName,
                    { color: CHEST_RARITY_TEXT_COLORS[rarity] },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {tileLabel}
                </Text>
                <Text
                  style={[styles.fragmentCount, { color: c.mutedForeground }]}
                >
                  {fragments} mảnh
                </Text>
                {status ? (
                  <Text
                    style={[styles.unavailable, { color: c.mutedForeground }]}
                  >
                    {!hasStatue
                      ? "Chưa có tượng"
                      : !hasCraftableStatue
                        ? "Đã mở khóa sẵn"
                        : canCraft
                          ? "Có thể ghép"
                          : "Cần 100 mảnh"}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={[styles.heading, styles.galleryHeading]}>
        <Text style={[styles.title, { color: c.foreground }]}>
          Tượng đã mở khóa
        </Text>
        <Text style={[styles.caption, { color: c.mutedForeground }]}>
          {unlockedStatues.length} tượng
        </Text>
      </View>
      {unlockedStatues.length ? (
        <View style={styles.gallery}>
          {unlockedStatues.map((statue) => {
            const artworkImage = statue.imageAssetKey
              ? ARTWORK_IMAGE_SOURCES[statue.imageAssetKey]
              : undefined;
            return (
              <Pressable
                key={statue.id}
                accessibilityRole="button"
                accessibilityLabel={`Xem thông tin ${statue.title}`}
                onPress={() => {
                  setSelectedStatue(statue);
                  setShowEnglishBiography(false);
                }}
                style={[
                  styles.artCard,
                  {
                    backgroundColor: c.card,
                    borderColor: c.border,
                    shadowColor: c.shade,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.14,
                    shadowRadius: 7,
                    elevation: 3,
                  },
                ]}
              >
                <MaterialSheen radius={16} />
                <View
                  style={[
                    styles.artImage,
                    { backgroundColor: CHEST_RARITY_COLORS[statue.rarity] },
                  ]}
                >
                  {artworkImage ? (
                    <Image
                      accessibilityLabel={statue.title}
                      source={artworkImage}
                      style={styles.artArtwork}
                      resizeMode="cover"
                    />
                  ) : (
                    <Feather
                      name={statue.icon as keyof typeof Feather.glyphMap}
                      size={34}
                      color={CHEST_RARITY_ICON_COLORS[statue.rarity]}
                    />
                  )}
                </View>
                <Text
                  style={[styles.artTitle, { color: c.foreground }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {statue.shortTitle ?? statue.title}
                </Text>
                <Text
                  style={[
                    styles.artRarity,
                    { color: CHEST_RARITY_TEXT_COLORS[statue.rarity] },
                  ]}
                >
                  {rarityDisplayLabel(statue.rarity)}
                </Text>
                <Text style={[styles.artStatus, { color: c.primary }]}>
                  Đã mở khóa
                </Text>
                <Text style={[styles.detailHint, { color: c.mutedForeground }]}>
                  Chạm để xem
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: c.card,
              borderColor: c.border,
              shadowColor: c.shade,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.12,
              shadowRadius: 6,
              elevation: 2,
            },
          ]}
        >
          <MaterialSheen radius={18} />
          <Feather name="award" size={24} color={c.mutedForeground} />
          <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
            Chưa có tượng nào. Mở rương để nhận mảnh ghép.
          </Text>
        </View>
      )}
    </ScrollView>
    <Modal
      visible={selectedStatue !== null}
      transparent
      animationType="fade"
      onRequestClose={closeStatueDetails}
    >
      <View
        style={[
          styles.detailOverlay,
          { backgroundColor: c.overlay },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng thông tin tượng"
          onPress={closeStatueDetails}
          style={StyleSheet.absoluteFill}
        />
        {selectedStatue ? (
          <View
            accessibilityViewIsModal
            style={[
              styles.detailModal,
              {
                backgroundColor: c.card,
                borderColor: c.border,
                shadowColor: c.shade,
              },
            ]}
          >
            <View style={styles.detailHeader}>
              <Text
                style={[styles.detailEyebrow, { color: c.mutedForeground }]}
              >
                THÔNG TIN TƯỢNG
              </Text>
              <View style={styles.detailHeaderActions}>
                {selectedStatue.biographyEn ? (
                  <Pressable
                    testID="statue-translation-toggle"
                    accessibilityRole="button"
                    accessibilityLabel={
                      showEnglishBiography
                        ? "Hiện tiểu sử bằng tiếng Việt"
                        : "Dịch tiểu sử sang tiếng Anh"
                    }
                    accessibilityState={{ selected: showEnglishBiography }}
                    onPress={() =>
                      setShowEnglishBiography((visible) => !visible)
                    }
                    hitSlop={10}
                  >
                    <MaterialCommunityIcons
                      name="translate"
                      size={22}
                      color={c.primary}
                    />
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Đóng thông tin tượng"
                  onPress={closeStatueDetails}
                  hitSlop={10}
                  style={[
                    styles.detailClose,
                    { backgroundColor: c.background },
                  ]}
                >
                  <Feather name="x" size={20} color={c.foreground} />
                </Pressable>
              </View>
            </View>
            <ScrollView
              style={styles.detailScroll}
              contentContainerStyle={styles.detailContent}
              showsVerticalScrollIndicator
            >
              {selectedStatue.imageAssetKey &&
              ARTWORK_IMAGE_SOURCES[selectedStatue.imageAssetKey] ? (
                <Image
                  accessibilityLabel={selectedStatue.title}
                  source={ARTWORK_IMAGE_SOURCES[selectedStatue.imageAssetKey]}
                  style={styles.detailArtwork}
                  resizeMode="cover"
                />
              ) : null}
              <Text style={[styles.detailTitle, { color: c.foreground }]}>
                {selectedStatue.title}
              </Text>
              <Text
                style={[
                  styles.detailRarity,
                  { color: CHEST_RARITY_TEXT_COLORS[selectedStatue.rarity] },
                ]}
              >
                {rarityDisplayLabel(selectedStatue.rarity)}
                {selectedStatue.material
                  ? ` · ${selectedStatue.material}`
                  : ""}
              </Text>
              {selectedStatue.quote ? (
                <View
                  style={[
                    styles.quoteCard,
                    { borderLeftColor: c.primary, backgroundColor: c.background },
                  ]}
                >
                  <Text style={[styles.quoteText, { color: c.foreground }]}>
                    “{selectedStatue.quote}”
                  </Text>
                  <Text
                    style={[styles.quoteAttribution, { color: c.mutedForeground }]}
                  >
                    — Chủ tịch Hồ Chí Minh
                  </Text>
                </View>
              ) : null}
              <Text
                testID={
                  showEnglishBiography && selectedStatue.biographyEn
                    ? "statue-biography-english"
                    : "statue-biography-vietnamese"
                }
                style={[styles.biography, { color: c.foreground }]}
              >
                {showEnglishBiography && selectedStatue.biographyEn
                  ? selectedStatue.biographyEn
                  : selectedStatue.biography ??
                    selectedStatue.description ??
                    "Chưa có thông tin."}
              </Text>
              {selectedStatue.sourceLabel ? (
                <Text
                  style={[styles.sourceLabel, { color: c.mutedForeground }]}
                >
                  Nguồn tham khảo: {selectedStatue.sourceLabel}
                </Text>
              ) : null}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 12, paddingBottom: 30 },
  intro: { fontFamily: F.r, fontSize: 13, lineHeight: 19, marginBottom: 2 },
  heading: { gap: 3, marginTop: 8, marginBottom: 2 },
  galleryHeading: { marginTop: 14 },
  title: { fontFamily: F.b, fontSize: 20 },
  caption: { fontFamily: F.r, fontSize: 13, lineHeight: 18 },
  rarityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  rarityTile: {
    position: "relative",
    borderWidth: 1,
    borderRadius: 15,
    width: "31%",
    aspectRatio: 1,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  rarityIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rarityName: { fontFamily: F.b, fontSize: 13, textAlign: "center" },
  fragmentCount: { fontFamily: F.r, fontSize: 12 },
  unavailable: { fontFamily: F.r, fontSize: 10, textAlign: "center" },
  reveal: {
    position: "relative",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  revealArtwork: { width: 54, height: 42, borderRadius: 8 },
  revealText: { flex: 1, gap: 2 },
  revealTitle: { fontFamily: F.b, fontSize: 15 },
  revealSubtitle: { fontFamily: F.r, fontSize: 13 },
  gallery: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  artCard: {
    position: "relative",
    width: "23%",
    flexGrow: 0,
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
    gap: 4,
  },
  artImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  artArtwork: { width: "100%", height: "100%" },
  artTitle: { fontFamily: F.s, fontSize: 11, textAlign: "center" },
  artRarity: { fontFamily: F.r, fontSize: 9, textAlign: "center" },
  artStatus: { fontFamily: F.s, fontSize: 9, textAlign: "center" },
  detailHint: { fontFamily: F.r, fontSize: 9, textAlign: "center" },
  detailOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  detailModal: {
    width: "100%",
    maxHeight: "88%",
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  detailEyebrow: {
    fontFamily: F.b,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  detailClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  detailScroll: { flexShrink: 1 },
  detailContent: { gap: 10, paddingBottom: 8 },
  detailArtwork: {
    width: 128,
    height: 128,
    borderRadius: 16,
    alignSelf: "center",
    marginBottom: 2,
  },
  detailTitle: {
    fontFamily: F.b,
    fontSize: 20,
    textAlign: "center",
  },
  detailRarity: {
    fontFamily: F.s,
    fontSize: 13,
    textAlign: "center",
  },
  quoteCard: {
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 2,
    gap: 4,
  },
  quoteText: {
    fontFamily: F.b,
    fontSize: 16,
    lineHeight: 24,
    fontStyle: "italic",
  },
  quoteAttribution: {
    fontFamily: F.s,
    fontSize: 12,
    textAlign: "right",
  },
  biography: { fontFamily: F.r, fontSize: 14, lineHeight: 22, marginTop: 4 },
  sourceLabel: { fontFamily: F.r, fontSize: 12, lineHeight: 18, marginTop: 6 },
  emptyCard: {
    position: "relative",
    borderWidth: 1,
    borderRadius: 18,
    minHeight: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    padding: 18,
  },
  emptyText: {
    fontFamily: F.r,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});

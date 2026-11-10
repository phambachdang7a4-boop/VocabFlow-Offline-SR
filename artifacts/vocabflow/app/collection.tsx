import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
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
  "epic-repose": require("../assets/images/epic-repose.png"),
  "epic-study": require("../assets/images/epic-study.png"),
  "legendary-crossing": require("../assets/images/legendary-crossing.png"),
};

function rarityDisplayLabel(rarity: ChestRarity): string {
  return rarity === "legendary"
    ? "Corvi · Hắc Diệu Thạch"
    : CHEST_RARITY_LABELS[rarity];
}

export default function CollectionScreen() {
  const c = useColors();
  const [overview, setOverview] = useState<MissionCollectionOverview | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [crafting, setCrafting] = useState<ChestRarity | null>(null);
  const [newCraft, setNewCraft] = useState<CollectionCraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const newCraftArtwork = newCraft
    ? COLLECTION_ARTWORKS.find((item) => item.id === newCraft.artworkId)
    : undefined;
  const newCraftImage = newCraftArtwork?.imageAssetKey
    ? ARTWORK_IMAGE_SOURCES[newCraftArtwork.imageAssetKey]
    : undefined;

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
        cause instanceof Error ? cause.message : "Chưa ghép được tranh.",
      );
    } finally {
      setCrafting(null);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.intro, { color: c.mutedForeground }]}>
        Mỗi bức tranh cần 100 mảnh cùng phẩm chất. Mảnh được lưu offline và đồng
        bộ cùng tài khoản.
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
              Đã ghép tranh mới!
            </Text>
            <Text
              style={[
                styles.revealSubtitle,
                { color: CHEST_RARITY_ICON_COLORS[newCraft.rarity] },
              ]}
            >
              {newCraftArtwork?.title ?? "Bức tranh"} ·{" "}
              {rarityDisplayLabel(newCraft.rarity)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng thông báo tranh mới"
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
          Ghép 100 mảnh để mở một bức tranh ngẫu nhiên.
        </Text>
      </View>

      {loading && !overview ? <ActivityIndicator color={c.primary} /> : null}
      {overview ? (
        <View style={styles.rarityGrid}>
          {RARITY_ORDER.map((rarity) => {
            const fragments = overview.fragments[rarity];
            const canCraft = fragments >= 100 && crafting === null;
            const tileLabel =
              rarity === "legendary" ? "Corvi" : rarityDisplayLabel(rarity);
            return (
              <Pressable
                key={rarity}
                testID={`collection-rarity-${rarity}`}
                accessibilityRole="button"
                accessibilityLabel={`${rarityDisplayLabel(rarity)}: ${fragments} mảnh. ${canCraft ? "Chạm để ghép tranh." : "Cần đủ 100 mảnh để ghép tranh."}`}
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
                    opacity: pressed ? 0.86 : 1,
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
                  {fragments}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={[styles.heading, styles.galleryHeading]}>
        <Text style={[styles.title, { color: c.foreground }]}>
          Tranh đã ghép
        </Text>
        <Text style={[styles.caption, { color: c.mutedForeground }]}>
          {overview?.crafts.length ?? 0} bức tranh
        </Text>
      </View>
      {overview?.crafts.length ? (
        <View style={styles.gallery}>
          {overview.crafts.map((craft) => {
            const artwork = COLLECTION_ARTWORKS.find(
              (item) => item.id === craft.artworkId,
            );
            if (!artwork) return null;
            const artworkImage = artwork.imageAssetKey
              ? ARTWORK_IMAGE_SOURCES[artwork.imageAssetKey]
              : undefined;
            return (
              <View
                key={craft.craftId}
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
                    { backgroundColor: CHEST_RARITY_COLORS[craft.rarity] },
                  ]}
                >
                  {artworkImage ? (
                    <Image
                      accessibilityLabel={artwork.title}
                      source={artworkImage}
                      style={styles.artArtwork}
                      resizeMode="cover"
                    />
                  ) : (
                    <Feather
                      name={artwork.icon as keyof typeof Feather.glyphMap}
                      size={34}
                      color={CHEST_RARITY_ICON_COLORS[craft.rarity]}
                    />
                  )}
                </View>
                <Text
                  style={[styles.artTitle, { color: c.foreground }]}
                  numberOfLines={2}
                >
                  {artwork.title}
                </Text>
                <Text
                  style={[
                    styles.artRarity,
                    { color: CHEST_RARITY_TEXT_COLORS[craft.rarity] },
                  ]}
                >
                  {rarityDisplayLabel(craft.rarity)}
                </Text>
              </View>
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
          <Feather name="image" size={24} color={c.mutedForeground} />
          <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
            Chưa có tranh nào. Mở rương để nhận mảnh ghép.
          </Text>
        </View>
      )}
    </ScrollView>
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
  gallery: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  artCard: {
    position: "relative",
    width: "47%",
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    gap: 6,
  },
  artImage: {
    height: 110,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  artArtwork: { width: "100%", height: "100%" },
  artTitle: { fontFamily: F.s, fontSize: 14 },
  artRarity: { fontFamily: F.r, fontSize: 12 },
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

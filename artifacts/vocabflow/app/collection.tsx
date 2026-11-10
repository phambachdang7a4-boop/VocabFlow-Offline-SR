import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { ErrorBanner, F, MaterialSheen } from '@/components/ui';
import { craftCollectionArtwork, getMissionCollectionOverview, type MissionCollectionOverview } from '@/data/vocabulary';
import { COLLECTION_ARTWORKS, type CollectionCraft } from '@/domain/collection-artworks';
import {
  CHEST_RARITIES,
  CHEST_RARITY_COLORS,
  CHEST_RARITY_ICON_COLORS,
  CHEST_RARITY_LABELS,
  CHEST_RARITY_TEXT_COLORS,
  type ChestRarity,
} from '@/domain/mission-chests';

const RARITY_ORDER: ChestRarity[] = [...CHEST_RARITIES];
const ARTWORK_IMAGE_SOURCES: Record<string, ImageSourcePropType> = {
  'epic-repose': require('../assets/images/epic-repose.png'),
  'epic-study': require('../assets/images/epic-study.png'),
  'legendary-crossing': require('../assets/images/legendary-crossing.png'),
};

function rarityDisplayLabel(rarity: ChestRarity): string {
  return rarity === 'legendary' ? 'Corvi · Hắc Diệu Thạch' : CHEST_RARITY_LABELS[rarity];
}

export default function CollectionScreen() {
  const c = useColors();
  const [overview, setOverview] = useState<MissionCollectionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [crafting, setCrafting] = useState<ChestRarity | null>(null);
  const [newCraft, setNewCraft] = useState<CollectionCraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const newCraftArtwork = newCraft ? COLLECTION_ARTWORKS.find((item) => item.id === newCraft.artworkId) : undefined;
  const newCraftImage = newCraftArtwork?.imageAssetKey ? ARTWORK_IMAGE_SOURCES[newCraftArtwork.imageAssetKey] : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOverview(await getMissionCollectionOverview());
      setError(null);
    } catch {
      setError('Không thể tải Bộ Sưu Tập. Dữ liệu vẫn được giữ trên thiết bị.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const craft = async (rarity: ChestRarity) => {
    setCrafting(rarity);
    try {
      setNewCraft(await craftCollectionArtwork(rarity));
      setError(null);
      setOverview(await getMissionCollectionOverview());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa ghép được tranh.');
    } finally {
      setCrafting(null);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.intro, { color: c.mutedForeground }]}>
        Mỗi bức tranh cần 20 mảnh cùng phẩm chất. Mảnh được lưu offline và đồng bộ cùng tài khoản.
      </Text>
      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}
      {newCraft ? (
        <View
          testID="new-collection-artwork"
          accessibilityLiveRegion="polite"
          style={[styles.reveal, {
            backgroundColor: CHEST_RARITY_COLORS[newCraft.rarity],
            shadowColor: c.shade, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18, shadowRadius: 8, elevation: 4,
          }]}
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
            <Feather name="award" size={24} color={CHEST_RARITY_ICON_COLORS[newCraft.rarity]} />
          )}
          <View style={styles.revealText}>
            <Text style={[styles.revealTitle, { color: CHEST_RARITY_ICON_COLORS[newCraft.rarity] }]}>Đã ghép tranh mới!</Text>
            <Text style={[styles.revealSubtitle, { color: CHEST_RARITY_ICON_COLORS[newCraft.rarity] }]}>
              {newCraftArtwork?.title ?? 'Bức tranh'} · {rarityDisplayLabel(newCraft.rarity)}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo tranh mới" onPress={() => setNewCraft(null)} hitSlop={10}>
            <Feather name="x" size={20} color={CHEST_RARITY_ICON_COLORS[newCraft.rarity]} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.heading}>
        <Text style={[styles.title, { color: c.foreground }]}>Mảnh ghép</Text>
        <Text style={[styles.caption, { color: c.mutedForeground }]}>Ghép 20 mảnh để mở một bức tranh ngẫu nhiên.</Text>
      </View>

      {loading && !overview ? <ActivityIndicator color={c.primary} /> : null}
      {overview ? RARITY_ORDER.map((rarity) => {
        const fragments = overview.fragments[rarity];
        const progress = Math.min(100, (fragments / 20) * 100);
        return (
          <View key={rarity} testID={`collection-rarity-${rarity}`} style={[
            styles.rarityCard,
            {
              backgroundColor: c.card, borderColor: c.border,
              shadowColor: c.shade, shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.14, shadowRadius: 7, elevation: 3,
            },
          ]}>
            <MaterialSheen radius={18} />
            <View style={styles.rarityTop}>
              <View style={[styles.rarityIcon, { backgroundColor: CHEST_RARITY_COLORS[rarity] }]}>
                <Feather name="layers" size={20} color={CHEST_RARITY_ICON_COLORS[rarity]} />
              </View>
              <View style={styles.rarityText}>
                <Text style={[styles.rarityName, { color: CHEST_RARITY_TEXT_COLORS[rarity] }]}>{rarityDisplayLabel(rarity)}</Text>
                <Text style={[styles.fragmentCount, { color: c.mutedForeground }]}>{fragments}/20 mảnh</Text>
              </View>
              <Text style={[styles.progressNumber, { color: CHEST_RARITY_TEXT_COLORS[rarity] }]}>{Math.round(progress)}%</Text>
            </View>
            <View style={[styles.track, { backgroundColor: c.muted }]}>
              <View style={[
                styles.fill,
                {
                  width: `${progress}%`,
                  backgroundColor: rarity === 'legendary' ? CHEST_RARITY_TEXT_COLORS.legendary : CHEST_RARITY_COLORS[rarity],
                },
              ]} />
            </View>
            <Pressable
              testID={`craft-artwork-${rarity}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: fragments < 20 || crafting !== null }}
              disabled={fragments < 20 || crafting !== null}
              onPress={() => void craft(rarity)}
              style={({ pressed }) => [
                styles.craftButton,
                {
                  backgroundColor: fragments >= 20 ? c.accent : c.muted,
                  borderColor: fragments >= 20 ? c.buttonPressed : c.border,
                  opacity: crafting && crafting !== rarity ? 0.6 : pressed ? 0.86 : 1,
                  shadowColor: c.shade, shadowOffset: { width: 0, height: pressed ? 1 : 3 },
                  shadowOpacity: pressed ? 0.06 : fragments >= 20 ? 0.18 : 0,
                  shadowRadius: pressed ? 2 : 6, elevation: pressed ? 1 : fragments >= 20 ? 3 : 0,
                },
              ]}
            >
              {fragments >= 20 ? <MaterialSheen tone="gold" radius={13} /> : null}
              {crafting === rarity ? <ActivityIndicator color={c.buttonForeground} /> : <Feather name="image" size={17} color={c.buttonForeground} />}
              <Text style={[styles.craftText, { color: c.buttonForeground }]}>
                {crafting === rarity ? 'Đang ghép…' : fragments >= 20 ? 'Ghép tranh' : 'Cần thêm mảnh'}
              </Text>
            </Pressable>
          </View>
        );
      }) : null}

      <View style={[styles.heading, styles.galleryHeading]}>
        <Text style={[styles.title, { color: c.foreground }]}>Tranh đã ghép</Text>
        <Text style={[styles.caption, { color: c.mutedForeground }]}>{overview?.crafts.length ?? 0} bức tranh</Text>
      </View>
      {overview?.crafts.length ? (
        <View style={styles.gallery}>
          {overview.crafts.map((craft) => {
            const artwork = COLLECTION_ARTWORKS.find((item) => item.id === craft.artworkId);
            if (!artwork) return null;
            const artworkImage = artwork.imageAssetKey ? ARTWORK_IMAGE_SOURCES[artwork.imageAssetKey] : undefined;
            return (
              <View key={craft.craftId} style={[
                styles.artCard,
                {
                  backgroundColor: c.card, borderColor: c.border,
                  shadowColor: c.shade, shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.14, shadowRadius: 7, elevation: 3,
                },
              ]}>
                <MaterialSheen radius={16} />
                <View style={[styles.artImage, { backgroundColor: CHEST_RARITY_COLORS[craft.rarity] }]}>
                  {artworkImage ? (
                    <Image accessibilityLabel={artwork.title} source={artworkImage} style={styles.artArtwork} resizeMode="cover" />
                  ) : (
                    <Feather name={artwork.icon as keyof typeof Feather.glyphMap} size={34} color={CHEST_RARITY_ICON_COLORS[craft.rarity]} />
                  )}
                </View>
                <Text style={[styles.artTitle, { color: c.foreground }]} numberOfLines={2}>{artwork.title}</Text>
                <Text style={[styles.artRarity, { color: CHEST_RARITY_TEXT_COLORS[craft.rarity] }]}>{rarityDisplayLabel(craft.rarity)}</Text>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={[
          styles.emptyCard,
          {
            backgroundColor: c.card, borderColor: c.border,
            shadowColor: c.shade, shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.12, shadowRadius: 6, elevation: 2,
          },
        ]}>
          <MaterialSheen radius={18} />
          <Feather name="image" size={24} color={c.mutedForeground} />
          <Text style={[styles.emptyText, { color: c.mutedForeground }]}>Chưa có tranh nào. Mở rương để nhận mảnh ghép.</Text>
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
  rarityCard: { position: 'relative', borderWidth: 1, borderRadius: 18, padding: 14, gap: 12 },
  rarityTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  rarityIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rarityText: { flex: 1, gap: 3 },
  rarityName: { fontFamily: F.b, fontSize: 16 },
  fragmentCount: { fontFamily: F.r, fontSize: 13 },
  progressNumber: { fontFamily: F.b, fontSize: 13 },
  track: { height: 8, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  craftButton: { position: 'relative', minHeight: 44, borderWidth: 1, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  craftText: { fontFamily: F.s, fontSize: 14 },
  reveal: { position: 'relative', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  revealArtwork: { width: 54, height: 42, borderRadius: 8 },
  revealText: { flex: 1, gap: 2 },
  revealTitle: { fontFamily: F.b, fontSize: 15 },
  revealSubtitle: { fontFamily: F.r, fontSize: 13 },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  artCard: { position: 'relative', width: '47%', flexGrow: 1, borderWidth: 1, borderRadius: 16, padding: 10, gap: 6 },
  artImage: { height: 110, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  artArtwork: { width: '100%', height: '100%' },
  artTitle: { fontFamily: F.s, fontSize: 14 },
  artRarity: { fontFamily: F.r, fontSize: 12 },
  emptyCard: { position: 'relative', borderWidth: 1, borderRadius: 18, minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 9, padding: 18 },
  emptyText: { fontFamily: F.r, fontSize: 13, textAlign: 'center', lineHeight: 18 },
});

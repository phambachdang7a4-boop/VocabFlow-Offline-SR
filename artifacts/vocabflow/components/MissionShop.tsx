import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { ErrorBanner, F, MaterialSheen } from "@/components/ui";
import { StoneInvestmentSection } from "@/components/StoneInvestmentSection";
import {
  getMissionShopOverview,
  purchaseMissionShopOffer,
  type MissionShopOverview,
} from "@/data/vocabulary";
import {
  CHEST_RARITY_COLORS,
  CHEST_RARITY_ICON_COLORS,
  CHEST_RARITY_TEXT_COLORS,
} from "@/domain/mission-chests";
import type { MissionShopRarity } from "@/domain/mission-shop";

const RARITY_LABELS: Record<MissionShopRarity, string> = {
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export function MissionShop() {
  const c = useColors();
  const [overview, setOverview] = useState<MissionShopOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyingSlot, setBuyingSlot] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOverview(await getMissionShopOverview());
      setError(null);
    } catch {
      setError("Không thể tải cửa hàng. Dữ liệu vẫn được giữ trên thiết bị.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const buy = async (slot: number) => {
    setBuyingSlot(slot);
    setError(null);
    try {
      await purchaseMissionShopOffer(slot);
      setOverview(await getMissionShopOverview());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể mua mảnh lúc này. Hãy thử lại.",
      );
    } finally {
      setBuyingSlot(null);
    }
  };

  return (
    <View testID="mission-shop-screen" style={styles.content}>
      <View style={styles.intro}>
        <Text style={[styles.title, { color: c.foreground }]}>Cửa hàng của Corvi</Text>
        <Text style={[styles.hint, { color: c.mutedForeground }]}>
          Ưu đãi mới mỗi ngày
        </Text>
      </View>

      <View
        testID="mission-shop-corvi-hero"
        style={[
          styles.heroCard,
          {
            backgroundColor: c.vocabCard,
            borderColor: c.navigationBorder,
            shadowColor: c.shade,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4,
          },
        ]}
      >
        <View style={styles.heroCopy}>
          <Text style={[styles.heroEyebrow, { color: c.vocabCardMuted }]}>
            GÓC CỦA CORVI
          </Text>
          <Text style={[styles.heroTitle, { color: c.vocabCardForeground }]}>
            Đổi Stone, nhận mảnh tượng
          </Text>
          <Text style={[styles.heroDescription, { color: c.vocabCardMuted }]}>
            Mua ưu đãi hôm nay hoặc bắt đầu Thương Vụ.
          </Text>
        </View>
        <Image
          source={require("../assets/images/corvi-shop-counter.png")}
          accessibilityLabel="Corvi đứng sau quầy hàng trong thư viện"
          resizeMode="contain"
          style={styles.heroImage}
        />
      </View>

      <View
        style={[
          styles.walletCard,
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
        <MaterialSheen radius={18} />
        <View style={[styles.walletIcon, { backgroundColor: c.accent }]}>
          <Feather name="award" size={22} color={c.buttonForeground} />
        </View>
        <View style={styles.walletCopy}>
          <Text style={[styles.walletLabel, { color: c.mutedForeground }]}>
            SỐ DƯ
          </Text>
          {loading && !overview ? (
            <ActivityIndicator color={c.primary} />
          ) : (
            <Text
              testID="shop-stone-balance"
              style={[styles.walletValue, { color: c.foreground }]}
            >
              {(overview?.stoneBalance ?? 0).toLocaleString("vi-VN")} Stone
            </Text>
          )}
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>
          Đổi Stone lấy mảnh tượng
        </Text>
        <Text style={[styles.hint, { color: c.mutedForeground }]}>
          Mỗi món mua được một lần trong ngày.
        </Text>
      </View>

      {error ? (
        <ErrorBanner message={error} onRetry={() => void load()} />
      ) : null}

      {loading && !overview ? (
        <View style={styles.loading}>
          <ActivityIndicator color={c.primary} />
          <Text style={[styles.hint, { color: c.mutedForeground }]}>
            Đang tải ưu đãi…
          </Text>
        </View>
      ) : (
        overview?.offers.map((offer) => {
          const rarityLabel = RARITY_LABELS[offer.rarity];
          const canAfford = overview.stoneBalance >= offer.price;
          const disabled = offer.purchased || !canAfford || buyingSlot !== null;
          return (
            <View
              key={offer.slot}
              testID={`mission-shop-offer-${offer.rarity}`}
              style={[
                styles.offerCard,
                {
                  backgroundColor: c.card,
                  borderColor: c.border,
                  shadowColor: c.shade,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.12,
                  shadowRadius: 5,
                  elevation: 2,
                },
              ]}
            >
              <MaterialSheen radius={18} />
              <View
                style={[
                  styles.fragmentIcon,
                  { backgroundColor: CHEST_RARITY_COLORS[offer.rarity] },
                ]}
              >
                <Feather
                  name="grid"
                  size={22}
                  color={CHEST_RARITY_ICON_COLORS[offer.rarity]}
                />
              </View>
              <View style={styles.offerCopy}>
                <View style={styles.offerTitleRow}>
                  <Text
                    style={[
                      styles.offerTitle,
                      { color: CHEST_RARITY_TEXT_COLORS[offer.rarity] },
                    ]}
                  >
                    Mảnh {rarityLabel}
                  </Text>
                  {offer.discountPercent > 0 ? (
                    <Text style={[styles.discount, { color: c.successText }]}>
                      −{offer.discountPercent}%
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.offerMeta, { color: c.mutedForeground }]}>
                  Đang có: {overview.fragments[offer.rarity]} mảnh
                </Text>
                <View style={styles.priceRow}>
                  {offer.discountPercent > 0 ? (
                    <Text
                      style={[styles.oldPrice, { color: c.mutedForeground }]}
                    >
                      {offer.basePrice.toLocaleString("vi-VN")}
                    </Text>
                  ) : null}
                  <Text style={[styles.price, { color: c.foreground }]}>
                    {offer.price.toLocaleString("vi-VN")} Stone
                  </Text>
                </View>
              </View>
              <Pressable
                testID={`mission-shop-buy-${offer.rarity}`}
                accessibilityRole="button"
                accessibilityLabel={
                  offer.purchased
                    ? `Đã mua mảnh ${rarityLabel} hôm nay`
                    : `Mua một mảnh ${rarityLabel} với giá ${offer.price} Stone`
                }
                accessibilityState={{ disabled }}
                disabled={disabled}
                onPress={() => void buy(offer.slot)}
                style={({ pressed }) => [
                  styles.buyButton,
                  {
                    backgroundColor: disabled ? c.muted : c.accent,
                    borderColor: disabled ? c.border : c.buttonPressed,
                    opacity: pressed && !disabled ? 0.84 : 1,
                  },
                ]}
              >
                {buyingSlot === offer.slot ? (
                  <ActivityIndicator color={c.buttonForeground} />
                ) : (
                  <Text
                    style={[
                      styles.buyLabel,
                      {
                        color: offer.purchased
                          ? c.mutedForeground
                          : c.buttonForeground,
                      },
                    ]}
                  >
                    {offer.purchased
                      ? "Đã mua"
                      : canAfford
                        ? "Mua"
                        : "Thiếu Stone"}
                  </Text>
                )}
              </Pressable>
            </View>
          );
        })
      )}

      <Text style={[styles.footer, { color: c.mutedForeground }]}>
        Mảnh đã mua không thể đổi ngược lại thành Stone. Ưu đãi được lưu offline
        và đồng bộ khi có mạng.
      </Text>
      <StoneInvestmentSection />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  intro: { gap: 4, marginTop: 3 },
  title: { fontFamily: F.b, fontSize: 21 },
  hint: { fontFamily: F.r, fontSize: 13, lineHeight: 19 },
  heroCard: {
    minHeight: 174,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  heroCopy: { flex: 1, minWidth: 0, gap: 7 },
  heroEyebrow: { fontFamily: F.s, fontSize: 9, letterSpacing: 1 },
  heroTitle: { fontFamily: F.b, fontSize: 16, lineHeight: 21 },
  heroDescription: { fontFamily: F.r, fontSize: 12, lineHeight: 17 },
  heroImage: { width: "46%", aspectRatio: 540 / 502, flexShrink: 0 },
  walletCard: {
    position: "relative",
    borderWidth: 1,
    borderRadius: 19,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  walletIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  walletCopy: { flex: 1, gap: 3 },
  walletLabel: { fontFamily: F.s, fontSize: 10, letterSpacing: 1.2 },
  walletValue: { fontFamily: F.b, fontSize: 20 },
  sectionHeading: { gap: 2, marginTop: 5 },
  sectionTitle: { fontFamily: F.b, fontSize: 18 },
  loading: { padding: 28, alignItems: "center", gap: 9 },
  offerCard: {
    position: "relative",
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fragmentIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  offerCopy: { flex: 1, gap: 3 },
  offerTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  offerTitle: { fontFamily: F.b, fontSize: 14 },
  discount: { fontFamily: F.b, fontSize: 12 },
  offerMeta: { fontFamily: F.r, fontSize: 11 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  oldPrice: {
    fontFamily: F.r,
    fontSize: 11,
    textDecorationLine: "line-through",
  },
  price: { fontFamily: F.b, fontSize: 13 },
  buyButton: {
    minWidth: 84,
    minHeight: 40,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buyLabel: { fontFamily: F.b, fontSize: 12, textAlign: "center" },
  footer: { fontFamily: F.r, fontSize: 11, lineHeight: 16, marginTop: 2 },
});

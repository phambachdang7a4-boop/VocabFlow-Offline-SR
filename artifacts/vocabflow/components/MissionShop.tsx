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
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
import {
  MISSION_SHOP_PRODUCTS,
  type MissionShopProductId,
} from "@/domain/mission-shop";

const PRODUCT_ICONS: Record<MissionShopProductId, React.ComponentProps<typeof Feather>["name"]> = {
  rare: "grid",
  epic: "grid",
  legendary: "grid",
  low_insurance: "shield",
  collateral_asset: "briefcase",
  low_capital_invite: "trending-up",
  high_capital_invite: "trending-up",
};

export function MissionShop() {
  const c = useColors();
  const [overview, setOverview] = useState<MissionShopOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyingSlot, setBuyingSlot] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inventoryRevision, setInventoryRevision] = useState(0);

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
  const refreshShopOverview = useCallback(() => {
    void load();
  }, [load]);

  const buy = async (slot: number) => {
    setBuyingSlot(slot);
    setError(null);
    try {
      await purchaseMissionShopOffer(slot);
      setOverview(await getMissionShopOverview());
      setInventoryRevision((revision) => revision + 1);
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
          Mỗi ngày chọn ngẫu nhiên 3 trong 7 món. Cả ba ô có thể được giảm giá.
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
        <Image
          source={require("../assets/images/corvi-shop-counter.png")}
          accessibilityLabel="Corvi đứng sau quầy hàng trong thư viện"
          resizeMode="cover"
          style={styles.heroImage}
        />
        <View
          testID="shop-stone-balance-badge"
          style={[
            styles.balanceBadge,
            { backgroundColor: c.background, borderColor: c.border },
          ]}
        >
          <MaterialCommunityIcons
            name="diamond-stone"
            size={18}
            color={c.accent}
          />
          {loading && !overview ? (
            <ActivityIndicator testID="shop-stone-balance-loading" color={c.primary} />
          ) : (
            <Text
              testID="shop-stone-balance"
              style={[styles.balanceValue, { color: c.foreground }]}
            >
              {(overview?.stoneBalance ?? 0).toLocaleString("vi-VN")}
            </Text>
          )}
          <Text style={[styles.balanceUnit, { color: c.mutedForeground }]}>
            Stone
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>
          Ưu đãi hôm nay
        </Text>
        <Text style={[styles.hint, { color: c.mutedForeground }]}>
          Giảm ngẫu nhiên 10–60%. Mỗi mảnh có 3–5 lượt mua; vật phẩm khác có 1.
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
        <View testID="mission-shop-offers" style={styles.offerGrid}>
          {overview?.offers.map((offer) => {
            const product = MISSION_SHOP_PRODUCTS[offer.productId];
            const productId = offer.productId;
            const ownedCount = overview.inventory[productId];
            const canAfford = overview.stoneBalance >= offer.price;
            const disabled =
              offer.remainingStock <= 0 || !canAfford || buyingSlot !== null;
            const fragmentColor = product.fragmentRarity
              ? CHEST_RARITY_COLORS[product.fragmentRarity]
              : c.secondary;
            return (
              <View
                key={offer.slot}
                testID={`mission-shop-offer-${productId}`}
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
                <MaterialSheen radius={16} />
                <View
                  style={[
                    styles.fragmentIcon,
                    { backgroundColor: fragmentColor },
                  ]}
                >
                  <Feather
                    name={PRODUCT_ICONS[productId]}
                    size={20}
                    color={
                      product.fragmentRarity
                        ? CHEST_RARITY_ICON_COLORS[product.fragmentRarity]
                        : c.primary
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.offerTitle,
                    {
                      color: product.fragmentRarity
                        ? CHEST_RARITY_TEXT_COLORS[product.fragmentRarity]
                        : c.foreground,
                    },
                  ]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                >
                  {product.title}
                </Text>
                <Text
                  style={[styles.offerMeta, { color: c.mutedForeground }]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                >
                  {product.description}
                </Text>
                <Text
                  style={[styles.offerMeta, { color: c.mutedForeground }]}
                  numberOfLines={1}
                >
                  Có {ownedCount}
                  {product.fragmentRarity ? " mảnh" : " món"} · Còn{" "}
                  {Math.max(0, offer.remainingStock)}/{offer.stock}
                </Text>
                <View
                  style={[
                    styles.discountBadge,
                    { backgroundColor: c.successSoft },
                  ]}
                >
                  <Text style={[styles.discount, { color: c.successText }]}>
                    −{offer.discountPercent}%
                  </Text>
                </View>
                <View style={styles.priceColumn}>
                  {offer.discountPercent > 0 ? (
                    <Text
                      style={[styles.oldPrice, { color: c.mutedForeground }]}
                      numberOfLines={1}
                    >
                      {offer.basePrice.toLocaleString("vi-VN")}
                    </Text>
                  ) : (
                    <View style={styles.discountPlaceholder} />
                  )}
                  <Text
                    style={[styles.price, { color: c.foreground }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {offer.price.toLocaleString("vi-VN")} Stone
                  </Text>
                </View>
                <Pressable
                  testID={`mission-shop-buy-${productId}`}
                  accessibilityRole="button"
                  accessibilityLabel={
                    offer.remainingStock <= 0
                      ? `${product.title} đã hết hàng hôm nay`
                      : `Mua ${product.title} với giá ${offer.price} Stone`
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
                          color: offer.remainingStock <= 0
                            ? c.mutedForeground
                            : c.buttonForeground,
                        },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {offer.remainingStock <= 0
                        ? "Hết hàng"
                        : canAfford
                          ? "Mua"
                          : "Thiếu Stone"}
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <Text style={[styles.footer, { color: c.mutedForeground }]}>
        Mảnh không đổi ngược thành Stone. Bảo hiểm và thư góp vốn được dùng khi
        bắt đầu đầu tư; Tài Sản Thế Chấp chỉ tiêu hao khi dùng để cứu khoản rủi ro
        đã thất bại. Giao dịch được lưu offline và đồng bộ khi có mạng.
      </Text>
      <StoneInvestmentSection
        inventoryRevision={inventoryRevision}
        onInventoryChange={refreshShopOverview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  intro: { gap: 4, marginTop: 3 },
  title: { fontFamily: F.b, fontSize: 21 },
  hint: { fontFamily: F.r, fontSize: 13, lineHeight: 19 },
  heroCard: {
    width: "100%",
    aspectRatio: 540 / 502,
    position: "relative",
    borderWidth: 1,
    borderRadius: 22,
    overflow: "hidden",
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
  },
  balanceBadge: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 6,
    marginTop: 10,
    marginRight: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 999,
  },
  balanceValue: { fontFamily: F.b, fontSize: 14 },
  balanceUnit: { fontFamily: F.s, fontSize: 11 },
  sectionHeading: { gap: 2, marginTop: 5 },
  sectionTitle: { fontFamily: F.b, fontSize: 18 },
  loading: { padding: 28, alignItems: "center", gap: 9 },
  offerGrid: { flexDirection: "row", gap: 8 },
  offerCard: {
    position: "relative",
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 16,
    padding: 9,
    alignItems: "center",
    gap: 6,
  },
  fragmentIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  offerTitle: {
    minHeight: 30,
    fontFamily: F.b,
    fontSize: 11,
    lineHeight: 14,
    textAlign: "center",
  },
  offerMeta: { fontFamily: F.r, fontSize: 9, lineHeight: 13, textAlign: "center" },
  discountBadge: {
    minHeight: 18,
    paddingHorizontal: 7,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  discountPlaceholder: { minHeight: 18 },
  priceColumn: { minHeight: 34, alignItems: "center", justifyContent: "center" },
  discount: { fontFamily: F.b, fontSize: 10 },
  oldPrice: {
    fontFamily: F.r,
    fontSize: 9,
    textDecorationLine: "line-through",
  },
  price: { fontFamily: F.b, fontSize: 10, textAlign: "center" },
  buyButton: {
    width: "100%",
    minHeight: 36,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buyLabel: { fontFamily: F.b, fontSize: 12, textAlign: "center" },
  footer: { fontFamily: F.r, fontSize: 11, lineHeight: 16, marginTop: 2 },
});

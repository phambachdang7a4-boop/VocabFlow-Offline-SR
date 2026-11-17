import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { ErrorBanner, F } from "@/components/ui";
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
  const { width: windowWidth } = useWindowDimensions();
  const compactOffers = windowWidth < 360;
  const heroWidth = Math.min(windowWidth - 36, 420);
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
          Ưu đãi hôm nay: chọn 3 trong 7 món, giảm ngẫu nhiên 10–60%.
        </Text>
      </View>

      <View
        testID="mission-shop-corvi-hero"
        style={[
          styles.heroCard,
          {
            width: heroWidth,
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
          source={require("../assets/images/baron-trade-full.png")}
          accessibilityLabel="Quầy The Baron Trade với ba khung ưu đãi"
          resizeMode="contain"
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
        {loading && !overview ? (
          <View style={styles.offerLoading}>
            <ActivityIndicator color={c.primary} />
            <Text style={[styles.offerMeta, { color: c.foreground }]}>
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
                    compactOffers ? styles.offerCardCompact : null,
                    { backgroundColor: c.background, borderColor: c.accent },
                  ]}
                >
                  <View
                    style={[
                      styles.fragmentIcon,
                      compactOffers ? styles.fragmentIconCompact : null,
                      { backgroundColor: fragmentColor },
                    ]}
                  >
                    <Feather
                      name={PRODUCT_ICONS[productId]}
                      size={18}
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
                      compactOffers ? styles.offerTitleCompact : null,
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
                    style={[
                      styles.offerDescription,
                      compactOffers ? styles.offerDescriptionCompact : null,
                      { color: c.mutedForeground },
                    ]}
                    numberOfLines={3}
                    adjustsFontSizeToFit
                  >
                    {product.description}
                  </Text>
                  <Text
                    style={[
                      styles.offerMeta,
                      compactOffers ? styles.offerMetaCompact : null,
                      { color: c.mutedForeground },
                    ]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
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
                  <View
                    style={[
                      styles.priceColumn,
                      compactOffers ? styles.priceColumnCompact : null,
                    ]}
                  >
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
                            color: disabled
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
      </View>

      {error ? (
        <ErrorBanner message={error} onRetry={() => void load()} />
      ) : null}

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
    aspectRatio: 704 / 1524,
    alignSelf: "center",
    position: "relative",
    borderWidth: 1,
    borderRadius: 22,
    overflow: "hidden",
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
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
  offerLoading: {
    position: "absolute",
    left: "2%",
    right: "2%",
    top: "60%",
    bottom: "2%",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  offerGrid: {
    position: "absolute",
    left: "2%",
    right: "2%",
    top: "60%",
    bottom: "2%",
    flexDirection: "row",
    gap: 4,
  },
  offerCard: {
    position: "relative",
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    paddingHorizontal: 5,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 3,
  },
  offerCardCompact: { paddingVertical: 4 },
  fragmentIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  fragmentIconCompact: { width: 28, height: 28 },
  offerTitle: {
    height: 28,
    width: "100%",
    fontFamily: F.b,
    fontSize: 10,
    lineHeight: 12,
    textAlign: "center",
    textAlignVertical: "center",
  },
  offerTitleCompact: { height: 24 },
  offerDescription: {
    height: 38,
    width: "100%",
    fontFamily: F.r,
    fontSize: 8,
    lineHeight: 10,
    textAlign: "center",
    textAlignVertical: "center",
  },
  offerDescriptionCompact: { height: 34 },
  offerMeta: {
    height: 22,
    width: "100%",
    fontFamily: F.r,
    fontSize: 8,
    lineHeight: 10,
    textAlign: "center",
    textAlignVertical: "center",
  },
  offerMetaCompact: { height: 20 },
  discountBadge: {
    height: 18,
    minWidth: 43,
    paddingHorizontal: 7,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  discountPlaceholder: { height: 18 },
  priceColumn: {
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  priceColumnCompact: { height: 26 },
  discount: { fontFamily: F.b, fontSize: 9 },
  oldPrice: {
    fontFamily: F.r,
    fontSize: 8,
    textDecorationLine: "line-through",
  },
  price: { fontFamily: F.b, fontSize: 9, textAlign: "center" },
  buyButton: {
    width: "100%",
    minHeight: 36,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buyLabel: { fontFamily: F.b, fontSize: 10, textAlign: "center" },
  footer: { fontFamily: F.r, fontSize: 11, lineHeight: 16, marginTop: 2 },
});

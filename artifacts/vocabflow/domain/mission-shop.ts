export const MISSION_SHOP_PRODUCT_IDS = [
  "rare",
  "epic",
  "legendary",
  "low_insurance",
  "collateral_asset",
  "low_capital_invite",
  "high_capital_invite",
] as const;

export type MissionShopProductId = (typeof MISSION_SHOP_PRODUCT_IDS)[number];
export type MissionShopRarity = "rare" | "epic" | "legendary";
export type CapitalInvite = "low" | "high";

export interface MissionShopProduct {
  id: MissionShopProductId;
  title: string;
  description: string;
  basePrice: number;
  fragmentRarity: MissionShopRarity | null;
  stockRange: readonly [number, number];
}

export interface MissionShopOffer {
  day: string;
  slot: 0 | 1 | 2;
  productId: MissionShopProductId;
  basePrice: number;
  discountPercent: number;
  price: number;
  stock: number;
}

export interface MissionShopPurchase {
  purchaseId: string;
  day: string;
  slot: number;
  rarity: MissionShopProductId;
  stoneCost: number;
  discountPercent: number;
  purchasedAt: string;
}

export const MISSION_SHOP_PRODUCTS: Record<
  MissionShopProductId,
  MissionShopProduct
> = {
  rare: {
    id: "rare",
    title: "Mảnh Rare",
    description: "Một mảnh tượng Rare.",
    basePrice: 200,
    fragmentRarity: "rare",
    stockRange: [3, 5],
  },
  epic: {
    id: "epic",
    title: "Mảnh Epic",
    description: "Một mảnh tượng Epic.",
    basePrice: 400,
    fragmentRarity: "epic",
    stockRange: [3, 5],
  },
  legendary: {
    id: "legendary",
    title: "Mảnh Legendary",
    description: "Một mảnh tượng Legendary.",
    basePrice: 1000,
    fragmentRarity: "legendary",
    stockRange: [3, 5],
  },
  low_insurance: {
    id: "low_insurance",
    title: "Bảo Hiểm cấp thấp",
    description: "Hoàn vốn nếu lỡ một ngày của gói rủi ro.",
    basePrice: 200,
    fragmentRarity: null,
    stockRange: [1, 1],
  },
  collateral_asset: {
    id: "collateral_asset",
    title: "Tài Sản Thế Chấp",
    description: "Có thể dùng sau thất bại để hoàn lại vốn gói rủi ro.",
    basePrice: 2000,
    fragmentRarity: null,
    stockRange: [1, 1],
  },
  low_capital_invite: {
    id: "low_capital_invite",
    title: "Thư mời Góp Vốn Thấp",
    description: "Tăng lãi 15%; mức lỗ khi thất bại tăng 30%.",
    basePrice: 300,
    fragmentRarity: null,
    stockRange: [1, 1],
  },
  high_capital_invite: {
    id: "high_capital_invite",
    title: "Thư mời Góp Vốn Cao",
    description: "Tăng lãi 30%; mức lỗ khi thất bại tăng 40%.",
    basePrice: 750,
    fragmentRarity: null,
    stockRange: [1, 1],
  },
};

export const MISSION_SHOP_FRAGMENT_PRICES: Record<MissionShopRarity, number> = {
  rare: MISSION_SHOP_PRODUCTS.rare.basePrice,
  epic: MISSION_SHOP_PRODUCTS.epic.basePrice,
  legendary: MISSION_SHOP_PRODUCTS.legendary.basePrice,
};

export function missionShopOffersForDay(day: string): MissionShopOffer[] {
  if (!isDay(day)) throw new Error("Ngày cửa hàng không hợp lệ.");

  const products = [...MISSION_SHOP_PRODUCT_IDS];
  for (let index = products.length - 1; index > 0; index -= 1) {
    const other = hash(`mission-shop-order-v2:${day}:${index}`) % (index + 1);
    [products[index], products[other]] = [products[other]!, products[index]!];
  }

  return products.slice(0, 3).map((productId, index) => {
    const slot = index as 0 | 1 | 2;
    const product = MISSION_SHOP_PRODUCTS[productId];
    const discountPercent =
      10 + (hash(`mission-shop-discount-v2:${day}:${slot}`) % 51);
    const stock =
      product.stockRange[0] +
      (hash(`mission-shop-stock-v2:${day}:${slot}`) %
        (product.stockRange[1] - product.stockRange[0] + 1));
    return {
      day,
      slot,
      productId,
      basePrice: product.basePrice,
      discountPercent,
      price: Math.round(
        (product.basePrice * (100 - discountPercent)) / 100,
      ),
      stock,
    };
  });
}

export function missionShopPurchaseId(
  day: string,
  slot: number,
  purchaseIndex = 1,
  purchaseNonce = "",
): string {
  if (
    !isDay(day) ||
    !Number.isInteger(slot) ||
    slot < 0 ||
    slot > 2 ||
    !Number.isInteger(purchaseIndex) ||
    purchaseIndex < 1 ||
    (purchaseNonce !== "" && !/^[a-z0-9-]{1,40}$/i.test(purchaseNonce))
  ) {
    throw new Error("Món cửa hàng không hợp lệ.");
  }
  return `shop:${day}:${slot}:${purchaseIndex}${
    purchaseNonce ? `:${purchaseNonce}` : ""
  }`;
}

export function missionShopPurchaseIndex(purchaseId: string): number {
  const match =
    /^shop:\d{4}-\d{2}-\d{2}:\d:([1-9]\d*)(?::[a-z0-9-]{1,40})?$/i.exec(
      purchaseId,
    );
  return match ? Number(match[1]) : 1;
}

export function isValidMissionShopPurchase(
  value: unknown,
): value is MissionShopPurchase {
  if (!isRecord(value)) return false;
  const { day, slot, purchaseId, purchasedAt } = value;
  if (
    typeof day !== "string" ||
    !isDay(day) ||
    typeof slot !== "number" ||
    !Number.isInteger(slot) ||
    slot < 0 ||
    slot > 2 ||
    typeof purchaseId !== "string" ||
    typeof purchasedAt !== "string" ||
    !Number.isFinite(Date.parse(purchasedAt)) ||
    typeof value.stoneCost !== "number" ||
    !Number.isSafeInteger(value.stoneCost) ||
    typeof value.discountPercent !== "number" ||
    !Number.isInteger(value.discountPercent) ||
    value.discountPercent < 0 ||
    value.discountPercent > 60
  ) {
    return false;
  }

  const offer = missionShopOffersForDay(day)[slot];
  const legacyPurchaseId = `shop:${day}:${slot}`;
  if (purchaseId === legacyPurchaseId) {
    return (
      isFragmentRarity(value.rarity) &&
      value.stoneCost >= 0 &&
      value.stoneCost <= 1000
    );
  }
  const index = missionShopPurchaseIndex(purchaseId);
  const idMatch =
    /^shop:\d{4}-\d{2}-\d{2}:\d:([1-9]\d*)(?::([a-z0-9-]{1,40}))?$/i.exec(
      purchaseId,
    );
  return (
    idMatch !== null &&
    purchaseId === missionShopPurchaseId(day, slot, index, idMatch?.[2] ?? "") &&
    index <= offer.stock &&
    value.rarity === offer.productId &&
    value.stoneCost === offer.price &&
    value.discountPercent === offer.discountPercent
  );
}

export function isMissionShopProductId(
  value: unknown,
): value is MissionShopProductId {
  return (
    typeof value === "string" &&
    (MISSION_SHOP_PRODUCT_IDS as readonly string[]).includes(value)
  );
}

function isFragmentRarity(value: unknown): value is MissionShopRarity {
  return value === "rare" || value === "epic" || value === "legendary";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function hash(value: string): number {
  let result = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16_777_619);
  }
  return result >>> 0;
}

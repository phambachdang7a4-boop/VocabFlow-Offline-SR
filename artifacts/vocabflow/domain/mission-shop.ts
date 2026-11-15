export type MissionShopRarity = "rare" | "epic" | "legendary";

export interface MissionShopOffer {
  day: string;
  slot: 0 | 1 | 2;
  rarity: MissionShopRarity;
  basePrice: number;
  discountPercent: number;
  price: number;
}

export interface MissionShopPurchase {
  purchaseId: string;
  day: string;
  slot: number;
  rarity: MissionShopRarity;
  stoneCost: number;
  discountPercent: number;
  purchasedAt: string;
}

export const MISSION_SHOP_FRAGMENT_PRICES: Record<MissionShopRarity, number> = {
  rare: 200,
  epic: 400,
  legendary: 1000,
};

export function missionShopOffersForDay(day: string): MissionShopOffer[] {
  if (!isDay(day)) throw new Error("Ngày cửa hàng không hợp lệ.");

  const rarities: MissionShopRarity[] = ["rare", "epic", "legendary"];
  for (let index = rarities.length - 1; index > 0; index -= 1) {
    const other = hash(`mission-shop-order:${day}:${index}`) % (index + 1);
    [rarities[index], rarities[other]] = [rarities[other]!, rarities[index]!];
  }
  const discountPercent = 10 + (hash(`mission-shop-discount:${day}`) % 51);

  return rarities.map((rarity, index) => {
    const slot = index as 0 | 1 | 2;
    const discounted = slot === 2;
    const basePrice = MISSION_SHOP_FRAGMENT_PRICES[rarity];
    const appliedDiscount = discounted ? discountPercent : 0;
    return {
      day,
      slot,
      rarity,
      basePrice,
      discountPercent: appliedDiscount,
      price: Math.round((basePrice * (100 - appliedDiscount)) / 100),
    };
  });
}

export function missionShopPurchaseId(day: string, slot: number): string {
  if (!isDay(day) || !Number.isInteger(slot) || slot < 0 || slot > 2) {
    throw new Error("Món cửa hàng không hợp lệ.");
  }
  return `shop:${day}:${slot}`;
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
    purchaseId !== missionShopPurchaseId(day, slot) ||
    typeof purchasedAt !== "string" ||
    !Number.isFinite(Date.parse(purchasedAt))
  ) {
    return false;
  }
  const offer = missionShopOffersForDay(day)[slot];
  return (
    value.rarity === offer.rarity &&
    value.stoneCost === offer.price &&
    value.discountPercent === offer.discountPercent
  );
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

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { loadTs } = require("./test-support.cjs");

const shop = loadTs(join(__dirname, "../domain/mission-shop.ts"));
const expectedPrices = {
  rare: 200,
  epic: 400,
  legendary: 1000,
  low_insurance: 200,
  collateral_asset: 2000,
  low_capital_invite: 300,
  high_capital_invite: 750,
};

for (const day of ["2026-11-15", "2026-11-16", "2026-12-01", "2027-01-01"]) {
  const offers = shop.missionShopOffersForDay(day);
  assert.equal(offers.length, 3);
  assert.deepEqual(
    new Set(offers.map((offer) => offer.productId)).size,
    3,
    "Daily offers contain three distinct products.",
  );
  assert.deepEqual(
    offers,
    shop.missionShopOffersForDay(day),
    "Offer order and prices remain stable throughout the same day.",
  );
  for (const offer of offers) {
    assert.equal(offer.basePrice, expectedPrices[offer.productId]);
    assert.ok(offer.discountPercent >= 10 && offer.discountPercent <= 60);
    assert.equal(
      offer.price,
      Math.round((offer.basePrice * (100 - offer.discountPercent)) / 100),
    );
    assert.ok(
      ["rare", "epic", "legendary"].includes(offer.productId)
        ? offer.stock >= 3 && offer.stock <= 5
        : offer.stock === 1,
      "Fragment offers have 3–5 units; other products have one.",
    );
  }
}

const day = "2026-11-15";
const offer = shop.missionShopOffersForDay(day)[0];
const purchase = {
  purchaseId: shop.missionShopPurchaseId(day, offer.slot, 1, "test-id"),
  day,
  slot: offer.slot,
  rarity: offer.productId,
  stoneCost: offer.price,
  discountPercent: offer.discountPercent,
  purchasedAt: `${day}T12:00:00.000Z`,
};
assert.equal(shop.isValidMissionShopPurchase(purchase), true);
assert.equal(
  shop.isValidMissionShopPurchase({ ...purchase, stoneCost: offer.price + 1 }),
  false,
  "Purchase records with altered prices are rejected.",
);
assert.equal(
  shop.isValidMissionShopPurchase({ ...purchase, slot: 9 }),
  false,
  "Purchase records cannot reference an unknown daily slot.",
);
assert.equal(
  shop.isValidMissionShopPurchase({
    ...purchase,
    purchaseId: shop.missionShopPurchaseId(day, offer.slot, offer.stock + 1),
  }),
  false,
  "Purchase records cannot exceed the stock limit.",
);
assert.equal(
  shop.missionShopOffersForDay(day).map((item) => item.productId).every(
    (id) => Object.hasOwn(shop.MISSION_SHOP_PRODUCTS, id),
  ),
  true,
);

const tabs = readFileSync(
  join(__dirname, "../components/MissionCollectionTabs.tsx"),
  "utf8",
);
const missionScreen = readFileSync(
  join(__dirname, "../app/(tabs)/blank.tsx"),
  "utf8",
);
const storeScreen = readFileSync(
  join(__dirname, "../components/MissionShop.tsx"),
  "utf8",
);
const investmentScreen = readFileSync(
  join(__dirname, "../components/StoneInvestmentSection.tsx"),
  "utf8",
);
const rootTabs = readFileSync(
  join(__dirname, "../app/(tabs)/_layout.tsx"),
  "utf8",
);
assert.match(tabs, /id: "shop", label: "Cửa Hàng"/);
assert.match(tabs, /params: \{ panel: "shop" \}/);
assert.match(missionScreen, /<MissionShop \/>/);
assert.match(storeScreen, /Mảnh không đổi ngược thành Stone/);
assert.match(storeScreen, /Mỗi ngày chọn ngẫu nhiên 3 trong 7 món/);
assert.match(storeScreen, /testID="mission-shop-corvi-hero"/);
assert.match(storeScreen, /testID="shop-stone-balance-badge"/);
assert.equal(
  (storeScreen.match(/testID="shop-stone-balance"/g) ?? []).length,
  1,
  "The current Stone balance is shown once in the hero image badge.",
);
assert.match(storeScreen, /testID="mission-shop-offers" style=\{styles\.offerGrid\}/);
assert.match(storeScreen, /offerGrid:\s*\{\s*flexDirection:\s*"row"/);
assert.doesNotMatch(
  investmentScreen,
  /Số dư:\s*\{\(overview\?\.stoneBalance/,
  "The investment section no longer repeats the current balance.",
);
assert.match(
  storeScreen,
  /require\("\.\.\/assets\/images\/corvi-shop-counter\.png"\)/,
  "The shop hero uses the cropped Corvi illustration, not the full screenshot.",
);
assert.equal(
  [...rootTabs.matchAll(/<NativeTabs\.Trigger name=/g)].length,
  5,
  "Adding the shop does not add a sixth bottom tab.",
);
console.log("Daily mission shop offers, validation, and navigation passed.");

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { loadTs } = require("./test-support.cjs");

const shop = loadTs(join(__dirname, "../domain/mission-shop.ts"));
const expectedPrices = { rare: 200, epic: 400, legendary: 1000 };

for (const day of ["2026-11-15", "2026-11-16", "2026-12-01", "2027-01-01"]) {
  const offers = shop.missionShopOffersForDay(day);
  assert.equal(offers.length, 3);
  assert.deepEqual(
    new Set(offers.map((offer) => offer.rarity)),
    new Set(["rare", "epic", "legendary"]),
    "Every day includes one fragment offer for each supported rarity.",
  );
  assert.deepEqual(
    offers,
    shop.missionShopOffersForDay(day),
    "Offer order and prices remain stable throughout the same day.",
  );
  for (const offer of offers) {
    assert.equal(offer.basePrice, expectedPrices[offer.rarity]);
    if (offer.slot === 2) {
      assert.ok(offer.discountPercent >= 10 && offer.discountPercent <= 60);
      assert.equal(
        offer.price,
        Math.round((offer.basePrice * (100 - offer.discountPercent)) / 100),
      );
    } else {
      assert.equal(offer.discountPercent, 0);
      assert.equal(offer.price, offer.basePrice);
    }
  }
}

const day = "2026-11-15";
const offer = shop.missionShopOffersForDay(day)[2];
const purchase = {
  purchaseId: shop.missionShopPurchaseId(day, offer.slot),
  day,
  slot: offer.slot,
  rarity: offer.rarity,
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
const rootTabs = readFileSync(
  join(__dirname, "../app/(tabs)/_layout.tsx"),
  "utf8",
);
assert.match(tabs, /id: "shop", label: "Cửa Hàng"/);
assert.match(tabs, /params: \{ panel: "shop" \}/);
assert.match(missionScreen, /<MissionShop \/>/);
assert.match(storeScreen, /Mảnh đã mua không thể đổi ngược lại thành Stone/);
assert.match(storeScreen, /testID="mission-shop-corvi-hero"/);
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

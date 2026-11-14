const assert = require("node:assert/strict");
const { collectionArtworks } = require("./test-support.cjs");

const artworksByImageKey = new Map(
  collectionArtworks.COLLECTION_ARTWORKS.map((artwork) => [
    artwork.imageAssetKey,
    artwork,
  ]),
);

const uncertainPortraits = [
  "archimedes-marble",
  "confucius-marble",
  "pythagoras-marble",
  "hippocrates-marble",
  "homer-marble",
  "hannibal-marble",
  "euclid-marble",
  "seneca-marble",
  "ptolemy-marble",
  "sun-tzu-marble",
  "hai-ba-trung-marble",
  "tran-hung-dao-marble",
  "nguyen-trai-marble",
  "le-thanh-tong-marble",
  "nguyen-binh-khiem-marble",
  "nguyen-du-marble",
  "ho-xuan-huong-marble",
  "phan-chau-trinh-marble",
  "vo-nguyen-giap-marble",
  "thich-nhat-hanh-marble",
];

for (const imageKey of uncertainPortraits) {
  assert.equal(
    artworksByImageKey.get(imageKey)?.portraitSourceType,
    "uncertain-likeness",
    `${imageKey} should be identified as a conventional or idealized likeness`,
  );
}

const sourcedPortraits = [
  "julius-caesar-marble",
  "aristotle-marble",
  "cleopatra-vii-marble",
  "augustus-marble",
  "demosthenes-marble",
];

for (const imageKey of sourcedPortraits) {
  assert.notEqual(
    artworksByImageKey.get(imageKey)?.portraitSourceType,
    "uncertain-likeness",
    `${imageKey} should not receive an uncertainty warning`,
  );
}

console.log(
  `Verified uncertainty labels for ${uncertainPortraits.length} figures and no warning for ${sourcedPortraits.length} sourced portraits.`,
);

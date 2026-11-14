const assert = require("node:assert/strict");
const { collectionArtworks } = require("./test-support.cjs");

const artworksByImageKey = new Map(
  collectionArtworks.COLLECTION_ARTWORKS.map((artwork) => [
    artwork.imageAssetKey,
    artwork,
  ]),
);

const uncertainAncientPortraits = [
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
];

for (const imageKey of uncertainAncientPortraits) {
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
  `Verified uncertainty labels for ${uncertainAncientPortraits.length} ancient figures and no warning for ${sourcedPortraits.length} sourced portraits.`,
);

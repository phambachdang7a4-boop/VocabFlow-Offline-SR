const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { collectionArtworks, loadTs } = require("./test-support.cjs");

const expansions = loadTs(
  join(__dirname, "../domain/collection-biography-expansions.ts"),
).COLLECTION_BIOGRAPHY_EXPANSIONS;
const artworks = collectionArtworks.COLLECTION_ARTWORKS;

function wordCount(value) {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

assert.equal(artworks.length, 111, "The collection should contain 111 statues.");
assert.equal(
  Object.keys(expansions).length,
  94,
  "All 94 shorter historical biographies should receive a context section.",
);

for (const artwork of artworks) {
  assert.ok(artwork.biography?.trim(), `${artwork.id} needs a Vietnamese biography.`);
  assert.ok(artwork.biographyEn?.trim(), `${artwork.id} needs an English biography.`);

  const viWords = wordCount(artwork.biography);
  const enWords = wordCount(artwork.biographyEn);
  assert.ok(viWords >= 100, `${artwork.id} Vietnamese biography is too short (${viWords}).`);
  assert.ok(enWords >= 100, `${artwork.id} English biography is too short (${enWords}).`);
  assert.ok(
    enWords / viWords >= 0.5 && enWords / viWords <= 1.6,
    `${artwork.id} biographies differ substantially in length (VI ${viWords}, EN ${enWords}).`,
  );

  const expansion = expansions[artwork.id];
  if (expansion) {
    assert.ok(
      artwork.biography.includes(expansion.vi),
      `${artwork.id} should include its Vietnamese context section.`,
    );
    assert.ok(
      artwork.biographyEn.includes(expansion.en),
      `${artwork.id} should include its English context section.`,
    );
    assert.equal(
      (expansion.vi.match(/^• /gm) || []).length,
      (expansion.en.match(/^• /gm) || []).length,
      `${artwork.id} should have a matching number of bilingual points.`,
    );
  }
}

for (const id of Object.keys(expansions)) {
  assert.ok(
    artworks.some((artwork) => artwork.id === id),
    `Biography expansion refers to an unknown statue: ${id}`,
  );
}

const uncertainAccounts = [
  ["epic-socrates-marble", /không hoàn toàn giống nhau/u, /do not fully agree/u],
  ["epic-archimedes-marble", /không được xác nhận chắc chắn/u, /not firmly verified/u],
  ["epic-cleopatra-vii-marble", /tuyên truyền hoặc huyền thoại/u, /propaganda and legend/u],
  ["rare-pythagoras-marble", /khó tách đóng góp cá nhân/u, /difficult to separate his personal work/u],
  ["rare-hippocrates-marble", /tư liệu về chính cuộc đời ông rất ít/u, /evidence about his personal life is sparse/u],
  ["rare-homer-marble", /Không có tiểu sử đáng tin cậy/u, /No reliable biography/u],
  ["common-euclid-marble", /không thể kiểm chứng đầy đủ/u, /cannot be fully verified/u],
  ["common-seneca-marble", /bị nghi liên quan/u, /alleged involvement/u],
  ["common-sun-tzu-marble", /không có tiểu sử đương thời đủ chắc chắn/u, /no contemporary biography securely confirms/u],
];
for (const [id, viPattern, enPattern] of uncertainAccounts) {
  const artwork = artworks.find((item) => item.id === id);
  assert.ok(artwork, `Expected uncertainty review for ${id}.`);
  assert.match(artwork.biography, viPattern, `${id} needs cautious Vietnamese wording.`);
  assert.match(artwork.biographyEn, enPattern, `${id} needs cautious English wording.`);
}

const collectionScreen = readFileSync(
  join(__dirname, "../app/collection.tsx"),
  "utf8",
);
assert.match(collectionScreen, /setShowEnglishBiography\(\(visible\) => !visible\)/);
assert.match(collectionScreen, /selectedStatue\.biographyEn/);
assert.match(collectionScreen, /<ScrollView\s+style=\{styles\.detailScroll\}/);
assert.match(collectionScreen, /contentContainerStyle=\{styles\.detailContent\}/);

console.log(
  `Verified bilingual biographies for all ${artworks.length} statues, ${Object.keys(expansions).length} added context sections, and the language-toggle/scroll view.`,
);

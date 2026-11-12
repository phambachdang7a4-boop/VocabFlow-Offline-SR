const assert = require("node:assert/strict");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { createRepository } = require("./test-support.cjs");

const root = mkdtempSync(join(tmpdir(), "vocabflow-example-repair-"));
const seed = createRepository(root, "2026-01-01T12:00:00");
let repaired;
let repeat;

(async () => {
  await seed.repo.listWords();
  await seed.repo.saveWord({
    term: "terrific",
    meaning: "Hoàn hảo, kỳ diệu.",
    ipa: "/təˈrɪfɪk/",
    example: "Grudge terrific",
    note: "Giữ nguyên ghi chú.",
  });
  await seed.repo.saveWord({
    term: "terrific",
    meaning: "Cực kỳ lớn.",
    ipa: "/təˈrɪfɪk/",
    example: "A terrific storm hit the coast.",
    note: "",
  });
  const target = (await seed.repo.listWords()).find(
    (word) => word.meaning === "Hoàn hảo, kỳ diệu.",
  );
  await seed.repo.recordReview(target.id, true, 0);
  const before = (await seed.repo.listWords()).find(
    (word) => word.id === target.id,
  );
  seed.db.exec("UPDATE sync_state SET value = '0' WHERE key = 'pending'");
  const generationBefore = Number(
    seed.db.prepare("SELECT value FROM sync_state WHERE key = 'generation'").get().value,
  );
  seed.db.close();

  repaired = createRepository(root, "2026-01-03T12:00:00");
  const after = (await repaired.repo.listWords()).find(
    (word) => word.id === target.id,
  );
  assert.equal(after.example, "The meal was terrific and fresh.");
  assert.equal(after.meaning, before.meaning);
  assert.equal(after.note, before.note);
  assert.equal(after.level, before.level);
  assert.equal(after.reviewCount, before.reviewCount);
  assert.equal(after.nextReviewOn, before.nextReviewOn);
  assert.equal(after.createdAt, before.createdAt);
  assert.equal(after.updatedAt, "2026-01-03T12:00:00.000Z");
  assert.equal(
    repaired.db.prepare("SELECT value FROM sync_state WHERE key = 'pending'").get().value,
    "1",
    "The corrected word is queued for the app's existing account sync.",
  );
  assert.equal(
    Number(repaired.db.prepare("SELECT value FROM sync_state WHERE key = 'generation'").get().value),
    generationBefore + 1,
  );
  assert.equal(
    (await repaired.repo.listWords()).find((word) => word.meaning === "Cực kỳ lớn.").example,
    "A terrific storm hit the coast.",
    "A different sense and its example remain unchanged.",
  );
  const generationAfter = Number(
    repaired.db.prepare("SELECT value FROM sync_state WHERE key = 'generation'").get().value,
  );
  repaired.db.close();

  repeat = createRepository(root, "2026-01-04T12:00:00");
  await repeat.repo.listWords();
  assert.equal(
    Number(repeat.db.prepare("SELECT value FROM sync_state WHERE key = 'generation'").get().value),
    generationAfter,
    "The correction is idempotent.",
  );
  console.log("PASS: repaired only the exact Mắt Quạ fragment; SRS, meaning, and notes stay unchanged; sync is notified.");
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    for (const item of [seed, repaired, repeat]) {
      try { item?.db?.close(); } catch {}
    }
    rmSync(root, { recursive: true, force: true });
  });

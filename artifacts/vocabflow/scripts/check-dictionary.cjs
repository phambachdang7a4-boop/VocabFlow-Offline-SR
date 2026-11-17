const assert = require("node:assert/strict");
const { DatabaseSync, backup } = require("node:sqlite");
const { readFileSync, mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { tmpdir } = require("node:os");
const { createHash } = require("node:crypto");
const { createRepository, loadTs, loadDictionaryDomain, loadLocalDictionaryAdditions, srs } = require("./test-support.cjs");
const sqliteConnection = loadTs(
  join(__dirname, "../data/sqlite-connection.ts"),
);
const root = mkdtempSync(join(tmpdir(), "vocabflow-dictionary-"));
const source = resolve(
  __dirname,
  "../../../generated-artifacts/dictionary/dictionary_en_vi.db",
);
const handles = new Set();
const regionalIpaByTerm = new Map();
let personal;

function adapter(filename, readOnly = false) {
  const handle = new DatabaseSync(filename, { readOnly });
  handles.add(handle);
  return {
    handle,
    filename,
    execAsync: async (sql) => handle.exec(sql),
    getFirstAsync: async (sql, ...params) => handle.prepare(sql).get(...params),
    getAllAsync: async (sql, ...params) => handle.prepare(sql).all(...params),
    runAsync: async (sql, ...params) => {
      const result = handle.prepare(sql).run(...params);
      return {
        ...result,
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },
    closeAsync: async () => {
      handles.delete(handle);
      handle.close();
    },
    withTransactionAsync: async (operation) => {
      handle.exec("BEGIN");
      try {
        await operation();
        handle.exec("COMMIT");
      } catch (error) {
        handle.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

(async () => {
  const domain = loadDictionaryDomain();
  const download = loadTs(join(__dirname, "../domain/dictionary-download.ts"), {
    "./dictionary": domain,
  });
  const importer = loadTs(join(__dirname, "../domain/dictionary-import.ts"));
  const familyExamples = require("../data/basic-family-example-overrides.json");
  const exampleUpdates = loadTs(
    join(__dirname, "../domain/dictionary-example-updates.ts"),
    {
      "../data/basic-family-example-overrides.json": familyExamples,
    },
  );
  const localAdditionData = loadLocalDictionaryAdditions();
  const localAdditions = loadTs(
    join(__dirname, "../data/dictionary-local-additions.ts"),
    { "../domain/dictionary-local-additions": localAdditionData },
  );
  const spelling = loadTs(
    join(__dirname, "../domain/dictionary-suggestions.ts"),
  );
  assert.equal(spelling.spellingDistance("recieve", "receive"), 1);
  assert.equal(spelling.spellingDistance("sincth", "since"), 2);
  assert.equal(spelling.suggestionTerm("  HÉLLO  "), "hello");
  assert.ok(
    spelling.spellingVariants("a".repeat(32)).length <=
      spelling.SPELLING_VARIANT_LIMIT,
  );
  const publicUrl = `https://raw.githubusercontent.com/skypediacode/english-vietnamese-dictionary/${domain.DICTIONARY.commit}/dictionary_en_vi.db`;
  assert.equal(
    download.dictionaryDownloadUrl(),
    publicUrl,
    "Public data must not require preview login or an API domain",
  );
  const { DICTIONARY, DICTIONARY_PAGE_SIZE } = domain;
  const inflections = loadTs(
    join(__dirname, "../domain/dictionary-inflections.ts"),
  );
  const expectedDownloadChunks = Math.ceil(
    DICTIONARY.bytes / (8 * 1024 * 1024),
  );
  function rangeResponse(source, options, includeContentRange = true) {
    const match = /^bytes=(\d+)-(\d+)$/.exec(options?.headers?.Range ?? "");
    assert.ok(match, "Dictionary downloads request a single byte range");
    const start = Number(match[1]);
    const end = Number(match[2]);
    const headers = {
      "content-length": String(end - start + 1),
    };
    if (includeContentRange) {
      headers["content-range"] =
        `bytes ${start}-${end}/${source.byteLength}`;
    }
    return new Response(source.subarray(start, end + 1), {
      status: 206,
      headers,
    });
  }
  for (const [tag, expected] of [
    ["N", "noun"],
    ["noun", "noun"],
    ["V", "verb"],
    ["A", "adjective"],
    ["D", "adverb"],
    ["adv", "adverb"],
    ["E", "preposition"],
    ["prep", "preposition"],
    ["M", "determiner"],
    ["det", "determiner"],
    ["C", "conjunction"],
    ["idiom", "idiom"],
    ["name", "noun"],
    ["pron", "other"],
    [null, "other"],
    ["", "other"],
    ["unknown", "other"],
  ]) {
    assert.equal(domain.dictionaryPartOfSpeech(tag), expected);
  }
  assert.equal(domain.dictionaryPartOfSpeechLabel("E"), "Preposition");
  assert.equal(domain.dictionaryPartOfSpeechLabel("M", "vi"), "Từ hạn định");
  assert.equal(domain.dictionaryPartOfSpeechLabel(null), "Others");
  assert.equal(
    domain.dictionaryDraft(
      { id: 1, term: "unknown-entry", pronunciations: [] },
      { id: 1, definition: "nghĩa thử", pos: null, subPos: null, example: null },
    ).meaning,
    "(Others) nghĩa thử",
    "Empty source labels remain visible as Others rather than dropping a sense label.",
  );
  const bytes = readFileSync(source);
  assert.equal(bytes.length, DICTIONARY.bytes);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    DICTIONARY.sha256,
  );
  const queries = loadTs(join(__dirname, "../data/dictionary-queries.ts"), {
    "../domain/dictionary": domain,
    "../domain/dictionary-suggestions": spelling,
    "../domain/dictionary-inflections": inflections,
  });
  const reference = adapter(source, true);
  assert.equal(
    reference.handle.prepare("SELECT count(*) AS n FROM words").get().n,
    DICTIONARY.wordCount,
  );
  assert.equal(
    reference.handle.prepare("SELECT count(*) AS n FROM definitions").get().n,
    DICTIONARY.definitionCount,
  );
  assert.equal(
    reference.handle.prepare("SELECT count(*) AS n FROM word_definitions").get()
      .n,
    DICTIONARY.linkCount,
  );
  assert.equal(exampleUpdates.DICTIONARY_EXAMPLE_UPDATES.length, 36);
  for (const update of exampleUpdates.DICTIONARY_EXAMPLE_UPDATES) {
    assert.equal(
      familyExamples[update.lessonId]?.[update.term],
      update.example,
    );
    const source = reference.handle
      .prepare(
        `
      SELECT w.word AS term FROM words w
      JOIN word_definitions wd ON wd.word_id = w.id
      WHERE wd.id = ? AND wd.word_id = ?
    `,
      )
      .get(update.senseId, update.entryId);
    assert.equal(
      source?.term,
      update.term,
      `Không tìm thấy đúng mục gốc cho ${update.term}.`,
    );
  }
  const result = await queries.searchInDictionary(reference, "  HELLO ");
  const hello = result.items.find((row) => row.term === "hello");
  assert.ok(hello);
  assert.ok(hello.meaning.length);
  const recommended = await queries.randomUnlearnedInDictionary(
    reference,
    new Set(["hello"]),
  );
  assert.ok(recommended, "An unsaved word with a definition is suggested.");
  assert.ok(recommended.meaning);
  assert.notEqual(
    recommended.term.toLocaleLowerCase("en"),
    "hello",
    "The suggested word excludes a word already in the learner's notebook.",
  );
  assert.deepEqual(await queries.searchInDictionary(reference, ""), {
    items: [],
    hasMore: false,
  });
  assert.equal(
    (await queries.searchInDictionary(reference, "' OR 1=1--")).items.length,
    0,
  );
  assert.ok(
    (await queries.searchInDictionary(reference, "%")).items.every((row) =>
      row.term.startsWith("%"),
    ),
  );
  assert.ok(
    (await queries.searchInDictionary(reference, "_")).items.every((row) =>
      row.term.startsWith("_"),
    ),
  );
  await assert.rejects(
    queries.searchInDictionary(reference, "a", -1),
    /không hợp lệ/,
  );
  await assert.rejects(
    queries.searchInDictionary(reference, "a".repeat(201)),
    /200/,
  );
  const first = await queries.searchInDictionary(reference, "a");
  const next = await queries.searchInDictionary(
    reference,
    "a",
    DICTIONARY_PAGE_SIZE,
  );
  assert.equal(first.items.length, DICTIONARY_PAGE_SIZE);
  assert.equal(first.hasMore, true);
  assert.ok(
    next.items.every((row) => !first.items.some((old) => old.id === row.id)),
  );
  const entry = await queries.entryInDictionary(reference, hello.id);
  assert.ok(entry.partsOfSpeech.length > 0);
  const lookupWordId = (term) =>
    reference.handle
      .prepare("SELECT id FROM words WHERE word = ? ORDER BY id LIMIT 1")
      .get(term)?.id;
  const unfoldedRoots = await queries.inflectionRootsInDictionary(
    reference,
    lookupWordId("unfolded"),
  );
  assert.deepEqual(
    unfoldedRoots.map((root) => root.term),
    ["unfold"],
    "An explicit past-tense definition links unfolded to its local root entry.",
  );
  const studiesRoots = await queries.inflectionRootsInDictionary(
    reference,
    lookupWordId("studies"),
  );
  assert.ok(
    studiesRoots.some((root) => root.term === "study"),
    "An explicit third-person singular definition links studies to study.",
  );
  const axesRoots = await queries.inflectionRootsInDictionary(
    reference,
    lookupWordId("axes"),
  );
  for (const root of ["axe", "ax", "axis"]) {
    assert.ok(
      axesRoots.some((candidate) => candidate.term === root),
      `The explicit plural definition links axes to ${root}.`,
    );
  }
  assert.deepEqual(
    await queries.inflectionRootsInDictionary(reference, lookupWordId("news")),
    [],
    "A matching suffix without a grammatical-form definition does not create a root link.",
  );
  const multi = reference.handle
    .prepare(
      `SELECT wd.word_id AS id, COUNT(*) AS n
    FROM word_definitions wd JOIN definitions d ON d.id=wd.definition_id
    GROUP BY wd.word_id HAVING COUNT(*) > 30 AND COUNT(DISTINCT d.pos) > 1
    ORDER BY n DESC LIMIT 1`,
    )
    .get();
  assert.ok(multi);
  const rawSenses = reference.handle
    .prepare(
      `SELECT wd.id,d.pos FROM word_definitions wd
    JOIN definitions d ON d.id=wd.definition_id WHERE wd.word_id=? ORDER BY wd.id`,
    )
    .all(multi.id);
  const expectedParts = [
    ...new Set(rawSenses.map((row) => domain.dictionaryPartOfSpeech(row.pos))),
  ].sort();
  const firstType = domain.dictionaryPartOfSpeech(rawSenses[0].pos);
  const firstPage = await queries.entryInDictionary(
    reference,
    multi.id,
    0,
    "first",
  );
  assert.equal(firstPage.partsOfSpeech[0], firstType);
  const firstIds = rawSenses
    .filter((row) => domain.dictionaryPartOfSpeech(row.pos) === firstType)
    .map((row) => row.id);
  assert.deepEqual(
    firstPage.senses.map((row) => row.id),
    firstIds.slice(0, DICTIONARY_PAGE_SIZE),
    "Auto default must filter before LIMIT, using the earliest source sense",
  );
  const since = (
    await queries.searchInDictionary(reference, "since")
  ).items.find((row) => row.term === "since");
  assert.ok(since);
  const sinceDefault = await queries.entryInDictionary(
    reference,
    since.id,
    0,
    "first",
  );
  assert.equal(sinceDefault.partsOfSpeech[0], "adverb");
  assert.ok(
    sinceDefault.senses.every(
      (row) => domain.dictionaryPartOfSpeech(row.pos) === "adverb",
    ),
  );
  const prepositionId = lookupWordId("in");
  const prepositionEntry = await queries.entryInDictionary(
    reference,
    prepositionId,
    0,
    ["preposition"],
  );
  assert.ok(prepositionEntry.partsOfSpeech.includes("preposition"));
  assert.ok(prepositionEntry.senses.length);
  assert.ok(
    prepositionEntry.senses.every(
      (row) => domain.dictionaryPartOfSpeech(row.pos) === "preposition",
    ),
    "Filtering a headword with multiple senses returns only its preposition senses.",
  );
  const determinerId = lookupWordId("one");
  const determinerEntry = await queries.entryInDictionary(
    reference,
    determinerId,
    0,
    ["determiner"],
  );
  assert.ok(determinerEntry.partsOfSpeech.includes("determiner"));
  const numeralSense = determinerEntry.senses.find(
    (row) => row.pos?.trim().toLowerCase() === "m",
  );
  assert.ok(numeralSense, "Numeral source senses are included in the determiner group.");
  const determinerDraft = await queries.draftInDictionary(
    reference,
    determinerId,
    numeralSense.id,
  );
  assert.ok(
    determinerDraft.meaning.startsWith("(Determiner) "),
    "Saved meanings use the same normalized type label as the filter.",
  );
  for (const selected of [
    ["verb"],
    ["noun", "verb"],
    ["adverb"],
    ["idiom"],
    ["other"],
  ]) {
    const expectedIds = rawSenses
      .filter((row) =>
        selected.includes(domain.dictionaryPartOfSpeech(row.pos)),
      )
      .map((row) => row.id);
    const received = [];
    let page;
    do {
      page = await queries.entryInDictionary(
        reference,
        multi.id,
        received.length,
        selected,
      );
      assert.deepEqual(
        [...page.partsOfSpeech].sort(),
        expectedParts,
        "Choices must include types from every page, not just selected results",
      );
      received.push(...page.senses.map((row) => row.id));
      assert.ok(!page.hasMore || page.senses.length === DICTIONARY_PAGE_SIZE);
    } while (page.hasMore);
    assert.deepEqual(
      received,
      expectedIds,
      "Pagination must happen after the union of selected POS filters",
    );
  }
  const absentType = domain.DICTIONARY_PARTS.find(
    (part) => !entry.partsOfSpeech.includes(part.id),
  );
  assert.ok(absentType);
  const emptyFiltered = await queries.entryInDictionary(
    reference,
    hello.id,
    0,
    [absentType.id],
  );
  assert.equal(emptyFiltered.senses.length, 0);
  assert.equal(emptyFiltered.hasMore, false);
  assert.deepEqual(emptyFiltered.partsOfSpeech, entry.partsOfSpeech);
  await assert.rejects(
    queries.entryInDictionary(reference, hello.id, 0, ["invalid"]),
    /Bộ lọc/,
  );
  assert.ok(entry.pronunciations.length && entry.senses.length);
  const sense = entry.senses.at(-1);
  const draft = await queries.draftInDictionary(reference, hello.id, sense.id);
  assert.equal(draft.term, hello.term);
  assert.ok(draft.meaning.includes(sense.definition));
  assert.equal(draft.example, sense.example ?? "");
  assert.equal(draft.ipa, domain.formatDictionaryPronunciations(entry.pronunciations));
  assert.ok(draft.note.includes("CC BY-SA"));
  await assert.rejects(
    queries.draftInDictionary(reference, hello.id, 1),
    /Không tìm thấy/,
  );
  await assert.rejects(
    queries.entryInDictionary(reference, -1),
    /không hợp lệ/,
  );

  personal = createRepository(root);
  assert.equal(
    (await personal.repo.listWords()).length,
    0,
    "Lookup/draft must never auto-save",
  );
  await personal.repo.saveWord(draft);
  const [word] = await personal.repo.listWords();
  assert.equal(word.term, draft.term);
  assert.equal(word.meaning, draft.meaning);
  assert.equal(word.level, 1);
  assert.equal(srs.isDue(word, "2026-01-01"), true);
  await personal.repo.recordReview(word.id, true, 0);
  await personal.repo.setWordFrozen(word.id, true);
  const snapshot = (await personal.repo.listWords())[0];
  await assert.rejects(
    personal.repo.saveWord({ ...draft, term: " HELLO " }),
    /đã có/,
  );
  assert.deepEqual(
    (await personal.repo.listWords())[0],
    snapshot,
    "Duplicate import cannot reset content, progress, or freeze",
  );

  // Exercise production initialization, backed by real Node SQLite.
  const { sha256 } = await import("@noble/hashes/sha2.js");
  let downloads = 0;
  const deleted = [];
  const sqlite = {
    openDatabaseAsync: async (filename) => adapter(join(root, filename)),
    deserializeDatabaseAsync: async (data) => {
      assert.equal(
        data[18],
        1,
        "Memory import must not retain a WAL write-format header",
      );
      assert.equal(
        data[19],
        1,
        "Memory import must not retain a WAL read-format header",
      );
      const filename = join(root, "import-source.db");
      writeFileSync(filename, data);
      return adapter(filename);
    },
    backupDatabaseAsync: async ({ sourceDatabase, destDatabase }) =>
      backup(sourceDatabase.handle, destDatabase.filename),
    deleteDatabaseAsync: async (filename) => {
      deleted.push(filename);
      assert.ok(
        filename.startsWith("vocabflow-dictionary-"),
        "Never delete personal storage",
      );
      rmSync(join(root, filename), { force: true });
    },
  };
  function repository(fetch, pageOrigin) {
    const isWeb = Boolean(pageOrigin);
    const files = new Map();
    const pathFor = (parts) =>
      parts
        .map((part) =>
          typeof part === "object" && part !== null ? part.path : String(part),
        )
        .join("/");
    class MockDirectory {
      constructor(...parts) {
        this.path = pathFor(parts);
      }
      get exists() {
        return true;
      }
      create() {}
    }
    class MockFile {
      constructor(...parts) {
        if (isWeb) {
          throw new Error("expo-file-system is not supported on web");
        }
        this.path = pathFor(parts);
      }
      get uri() {
        return this.path;
      }
      get exists() {
        return files.has(this.path);
      }
      get size() {
        return files.get(this.path)?.byteLength ?? 0;
      }
      delete() {
        files.delete(this.path);
      }
      create() {
        files.set(this.path, Buffer.alloc(0));
      }
      open(mode) {
        const data = files.get(this.path);
        return {
          readBytes: async (length) => new Uint8Array(data.subarray(0, length)),
          writeBytes: async (chunk) => {
            const current = files.get(this.path);
            files.set(
              this.path,
              Buffer.concat([current, Buffer.from(chunk)]),
            );
          },
          close() {},
        };
      }
      async digest() {
        return createHash("sha256").update(files.get(this.path)).digest("hex");
      }
    }
    MockFile.downloadFileAsync = async (url, destination, options) => {
      const response = await fetch(url, { signal: options?.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      files.set(destination.path, Buffer.from(await response.arrayBuffer()));
      options?.onProgress?.({
        bytesWritten: files.get(destination.path).byteLength,
        totalBytes: files.get(destination.path).byteLength,
      });
      return new MockFile(destination.path);
    };
    const fileSystem = {
      File: MockFile,
      Directory: MockDirectory,
      FileMode: { ReadOnly: "r", WriteOnly: "w" },
      Paths: {
        cache: new MockDirectory("cache"),
        document: new MockDirectory("document"),
      },
    };
    return loadTs(
      join(__dirname, "../data/dictionary.ts"),
      {
        "expo-sqlite": sqlite,
        "expo-file-system": fileSystem,
        "@noble/hashes/sha2.js": { sha256 },
        "../domain/dictionary": domain,
        "../domain/dictionary-download": download,
        "../domain/dictionary-import": importer,
        "../domain/dictionary-example-updates": exampleUpdates,
        "../domain/dictionary-local-additions": localAdditionData,
        "./dictionary-local-additions": localAdditions,
        "./offline-regional-pronunciations": {
          getRegionalIpaForTerm: async () => [],
          getRegionalIpaForTerms: async (terms) =>
            new Map(
              terms
                .filter((term) => regionalIpaByTerm.has(term))
                .map((term) => [term, regionalIpaByTerm.get(term)]),
            ),
          installOfflineRegionalIpa: async () => ({ entryCount: 0, usCount: 0, ukCount: 0 }),
        },
        "./dictionary-queries": queries,
        "./sqlite-connection": sqliteConnection,
        "react-native": { Platform: { OS: isWeb ? "web" : "android" } },
      },
      {
        fetch,
        process: { env: { EXPO_PUBLIC_DOMAIN: "unused.invalid" } },
        document: pageOrigin ? {} : undefined,
        globalThis: pageOrigin
          ? { location: { origin: pageOrigin } }
          : globalThis,
      },
    );
  }
  const stages = [];
  let repo = repository(async (url, options) => {
    assert.equal(
      url,
      publicUrl,
      "Browser must bypass private development-host authentication for public data",
    );
    assert.equal(
      options.credentials,
      "omit",
      "Public browser dictionary downloads do not send account cookies",
    );
    downloads++;
    const response = rangeResponse(bytes, options, false);
    assert.equal(
      response.headers.get("content-range"),
      null,
      "Browser responses can hide Content-Range when the host does not expose it to CORS",
    );
    return response;
  }, "https://phone.expo.example");
  const waiting = [];
  assert.deepEqual(
    await repo.getOfflineDictionaryStatus(),
    { state: "missing", bytes: 0 },
    "Browser status checks use SQLite and never construct unsupported Expo File objects",
  );
  assert.equal(downloads, 0, "Checking browser status does not download");
  await assert.rejects(
    repo.openDictionary((stage) => waiting.push(stage)),
    /Cần xác nhận/,
  );
  assert.deepEqual(waiting, ["checking", "awaiting-consent"]);
  assert.equal(
    downloads,
    0,
    "Opening a dictionary screen must not spend mobile data",
  );
  await assert.rejects(repo.searchDictionary("hello"), /Cần xác nhận/);
  await assert.rejects(repo.getDictionaryEntry(hello.id), /Cần xác nhận/);
  await assert.rejects(
    repo.getDictionaryDraft(hello.id, sense.id),
    /Cần xác nhận/,
  );
  await assert.rejects(repo.suggestDictionary("helo"), /Cần xác nhận/);
  regionalIpaByTerm.set("regional-only", [
    { ipa: "/ˈriːdʒənəl/", region: "BrE" },
  ]);
  assert.equal(
    (await repo.getDictionaryPronunciationsForTerms(["regional-only"])).get(
      "regional-only",
    ),
    "Anh-Anh: /ˈriːdʒənəl/",
    "Bulk pronunciation lookup can use installed regional IPA without downloading the main dictionary.",
  );
  regionalIpaByTerm.clear();
  assert.equal(
    downloads,
    0,
    "Deep links and background readers cannot bypass consent",
  );
  assert.equal(
    deleted.length,
    0,
    "Waiting for permission does not delete any cache",
  );
  const loaded = await repo.openDictionary((stage) => stages.push(stage), {
    allowDownload: true,
  });
  assert.deepEqual(stages, [
    "checking",
    "downloading",
    "verifying",
    "importing",
    "ready",
  ]);
  assert.equal(downloads, expectedDownloadChunks);
  assert.deepEqual(
    await repo.getOfflineDictionaryStatus(),
    { state: "installed", bytes: DICTIONARY.bytes },
    "An installed browser SQLite dictionary is recognized without FileSystem",
  );
  const pronunciationProgress = [];
  const bulkPronunciations = await repo.getDictionaryPronunciationsForTerms(
    ["hello", "water"],
    (completed, total) => pronunciationProgress.push({ completed, total }),
  );
  assert.ok(bulkPronunciations.get("hello"));
  assert.ok(bulkPronunciations.get("water"));
  assert.deepEqual(pronunciationProgress.at(-1), { completed: 2, total: 2 });
  for (const update of exampleUpdates.DICTIONARY_EXAMPLE_UPDATES) {
    const stored = await loaded.getFirstAsync(
      "SELECT example FROM word_definitions WHERE id = ? AND word_id = ?",
      update.senseId,
      update.entryId,
    );
    assert.equal(
      stored?.example,
      update.example,
      `Ví dụ ${update.term} phải được lưu trong từ điển offline.`,
    );
  }
  for (const [typo, expected] of [
    ["sincth", "since"],
    ["helo", "hello"],
    ["recieve", "receive"],
    ["langauge", "language"],
    ["xello", "hello"],
  ]) {
    let reads = 0;
    const results = await queries.suggestInDictionary(
      {
        getAllAsync: async (sql, ...parameters) => {
          reads++;
          return loaded.getAllAsync(sql, ...parameters);
        },
      },
      typo,
    );
    assert.ok(
      results.some((item) => item.term.toLowerCase() === expected),
      `${typo} should suggest ${expected}: ${results.map((item) => item.term).join(", ")}`,
    );
    assert.ok(results.length <= 10);
    assert.equal(
      new Set(results.map((item) => item.term.toLowerCase())).size,
      results.length,
    );
    assert.ok(
      reads <= Math.ceil(spelling.SPELLING_VARIANT_LIMIT / 160) + 2,
      "Every fuzzy lookup has a bounded number of indexed probes",
    );
  }
  assert.match(
    loaded.handle
      .prepare(
        "EXPLAIN QUERY PLAN SELECT id,word FROM words WHERE word COLLATE NOCASE IN (?)",
      )
      .all("hello")
      .map((row) => row.detail)
      .join(" "),
    /SEARCH.*idx_vocabflow_words_nocase/i,
  );
  for (const query of [
    "",
    "%",
    "_",
    "' OR 1=1--",
    "a".repeat(33),
    "zzzzzzzz",
  ]) {
    assert.deepEqual(await repo.suggestDictionary(query), []);
  }
  assert.match(
    loaded.handle
      .prepare(
        "EXPLAIN QUERY PLAN SELECT id FROM words WHERE word LIKE ? ORDER BY word COLLATE NOCASE,id",
      )
      .all("a%")
      .map((row) => row.detail)
      .join(" "),
    /idx_vocabflow_words_nocase/,
  );
  await assert.rejects(loaded.runAsync("DELETE FROM words"), /readonly/);
  await loaded.closeAsync();

  // Exercise the Expo Go file-writing path: each range is appended before
  // integrity verification and SQLite import.
  const nativeCacheName = `vocabflow-dictionary-${DICTIONARY.sha256.slice(0, 16)}.db`;
  rmSync(join(root, nativeCacheName), { force: true });
  let nativeRangeRequests = 0;
  repo = repository(async (url, options) => {
    assert.equal(url, publicUrl);
    assert.equal(options.credentials, "omit");
    nativeRangeRequests++;
    return rangeResponse(bytes, options);
  });
  const nativeStages = [];
  const nativeDictionary = await repo.openDictionary(
    (stage) => nativeStages.push(stage),
    { allowDownload: true },
  );
  assert.deepEqual(nativeStages, [
    "checking",
    "downloading",
    "verifying",
    "importing",
    "ready",
  ]);
  assert.equal(nativeRangeRequests, expectedDownloadChunks);
  const baseTerms = new Set(
    reference.handle
      .prepare("SELECT word FROM words WHERE lang_code = 'en'")
      .all()
      .map((row) => row.word.trim().replace(/\s+/g, " ").toLocaleLowerCase("en")),
  );
  const newLocalTerms = new Set(
    localAdditionData.ALL_LOCAL_DICTIONARY_ADDITIONS.map((entry) =>
      entry.term.trim().replace(/\s+/g, " ").toLocaleLowerCase("en"),
    ),
  );
  const expectedFinalWordCount =
    DICTIONARY.wordCount +
    [...newLocalTerms].filter((term) => !baseTerms.has(term)).length;
  assert.equal(
    (
      await nativeDictionary.getFirstAsync(
        "SELECT COUNT(*) AS count FROM words",
      )
    ).count,
    expectedFinalWordCount,
    "The Expo Go file writer imports the complete ranged download",
  );
  await nativeDictionary.closeAsync();

  // Simulate a dictionary cache created by the previous app version: examples
  // are still upstream, and its metadata has no example revision column.
  const name = `vocabflow-dictionary-${DICTIONARY.sha256.slice(0, 16)}.db`;
  const cachePath = join(root, name);
  const oldCache = new DatabaseSync(cachePath);
  oldCache.exec(
    "DROP TABLE vocabflow_dictionary_meta; CREATE TABLE vocabflow_dictionary_meta (source_hash TEXT NOT NULL);",
  );
  oldCache
    .prepare("INSERT INTO vocabflow_dictionary_meta (source_hash) VALUES (?)")
    .run(DICTIONARY.sha256);
  const restoreOriginal = oldCache.prepare(
    "UPDATE word_definitions SET example = ? WHERE id = ? AND word_id = ?",
  );
  for (const update of exampleUpdates.DICTIONARY_EXAMPLE_UPDATES) {
    const sourceExample = reference.handle
      .prepare(
        "SELECT example FROM word_definitions WHERE id = ? AND word_id = ?",
      )
      .get(update.senseId, update.entryId);
    restoreOriginal.run(sourceExample.example, update.senseId, update.entryId);
  }
  oldCache.close();

  repo = repository(async () => {
    throw new Error("Offline: no network allowed");
  });
  const offlineStages = [];
  const reopened = await repo.openDictionary((stage) =>
    offlineStages.push(stage),
  );
  assert.deepEqual(
    offlineStages,
    ["checking", "ready"],
    "Upgrading the cached dictionary stays offline",
  );
  assert.equal(
    downloads,
    expectedDownloadChunks,
    "Applying local example updates must not download the 44 MB source again",
  );
  for (const update of exampleUpdates.DICTIONARY_EXAMPLE_UPDATES) {
    const stored = await reopened.getFirstAsync(
      "SELECT example FROM word_definitions WHERE id = ? AND word_id = ?",
      update.senseId,
      update.entryId,
    );
    assert.equal(
      stored?.example,
      update.example,
      `Đã nâng cấp ví dụ ${update.term} trong từ điển cũ.`,
    );
    assert.equal(
      (await repo.getDictionaryDraft(update.entryId, update.senseId)).example,
      update.example,
    );
  }
  const revision = await reopened.getFirstAsync(
    "SELECT example_revision FROM vocabflow_dictionary_meta LIMIT 1",
  );
  assert.equal(
    revision.example_revision,
    `${exampleUpdates.DICTIONARY_EXAMPLE_REVISION}+${localAdditionData.LOCAL_DICTIONARY_ADDITIONS_REVISION}`,
  );
  for (const entry of localAdditionData.ALL_LOCAL_DICTIONARY_ADDITIONS) {
    const result = await repo.searchDictionary(entry.term);
    assert.ok(
      result.items.some((item) => item.term === entry.term),
      `The offline dictionary includes ${entry.term}.`,
    );
  }
  assert.ok(
    (await repo.searchDictionary("hello")).items.some(
      (row) => row.id === hello.id,
    ),
  );
  assert.ok(
    (await repo.suggestDictionary("helo")).some((row) => row.id === hello.id),
    "Spelling suggestions must work without a network",
  );
  assert.equal(
    (await repo.getDictionaryDraft(hello.id, sense.id)).meaning,
    draft.meaning,
  );
  await reopened.closeAsync();

  // Remove ONLY the disposable reference cache to emulate first use without a network.
  rmSync(join(root, name));
  let online = false;
  repo = repository(async (_url, options) => {
    if (!online) throw new Error("No connection");
    return rangeResponse(bytes, options);
  });
  await assert.rejects(
    repo.openDictionary(undefined, { allowDownload: true }),
    /Không thể nạp/,
  );
  assert.equal(deleted.at(-1), name);
  assert.deepEqual((await personal.repo.listWords())[0], snapshot);
  await assert.rejects(
    repo.openDictionary(),
    /Cần xác nhận/,
    "A failed transfer must request fresh permission before retrying",
  );
  online = true;
  const recovered = await repo.openDictionary(undefined, {
    allowDownload: true,
  });
  assert.ok((await repo.searchDictionary("hello")).items.length);
  await recovered.closeAsync();

  rmSync(join(root, name));
  const corruptBytes = Buffer.alloc(DICTIONARY.bytes);
  repo = repository(async (url, options) =>
    rangeResponse(corruptBytes, options),
  );
  await assert.rejects(
    repo.openDictionary(undefined, { allowDownload: true }),
    /không đúng phiên bản/,
  );
  assert.deepEqual((await personal.repo.listWords())[0], snapshot);
  console.log(
    "PASS: bounded indexed typo suggestions on real data and offline; pinned public no-login download; no transfer before consent; retry approval; paging; draft/save/SRS; duplicate/freeze preservation; verified import and personal-data isolation.",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    for (const handle of handles) {
      try {
        handle.close();
      } catch {}
    }
    try {
      personal?.db?.close();
    } catch {}
    rmSync(root, { recursive: true, force: true });
  });

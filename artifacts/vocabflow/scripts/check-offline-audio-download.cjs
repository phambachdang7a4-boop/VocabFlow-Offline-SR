const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { join } = require("node:path");
const { loadTs } = require("./test-support.cjs");

const domain = loadTs(join(__dirname, "../domain/offline-audio.ts"));
const chunkBytes = domain.OFFLINE_AUDIO_CHUNK_BYTES;
const totalBytes = chunkBytes * 2 + 17;
const source = Buffer.allocUnsafe(totalBytes);
for (let index = 0; index < source.length; index += 1)
  source[index] = index % 251;
const metadata = {
  ...domain.OFFLINE_AUDIO_DICTIONARY,
  bytes: totalBytes,
  entryCount: 3,
  filename: "audio-resume-test.db",
  sha256: crypto.createHash("sha256").update(source).digest("hex"),
};
const domainForTest = {
  ...domain,
  OFFLINE_AUDIO_DICTIONARY: metadata,
};
const root = fs.mkdtempSync(path.join(os.tmpdir(), "vocabflow-audio-test-"));
const sqlitePath = path.join(root, "SQLite", metadata.filename);
const partialPath = `${sqlitePath}.download`;
const oldFetch = global.fetch;
const oldDomain = process.env.EXPO_PUBLIC_DOMAIN;

function resolvePath(...parts) {
  return path.join(
    ...parts.map((part) =>
      typeof part === "string" ? part : part.path,
    ),
  );
}

class TestDirectory {
  constructor(...parts) {
    this.path = resolvePath(...parts);
  }
  get exists() {
    return fs.existsSync(this.path);
  }
  create(options = {}) {
    fs.mkdirSync(this.path, { recursive: options.intermediates ?? false });
  }
  delete() {
    fs.rmSync(this.path, { recursive: true, force: true });
  }
}

class TestFile {
  constructor(...parts) {
    this.path = resolvePath(...parts);
  }
  get exists() {
    return fs.existsSync(this.path);
  }
  get size() {
    return this.exists ? fs.statSync(this.path).size : 0;
  }
  create(options = {}) {
    fs.mkdirSync(path.dirname(this.path), { recursive: true });
    if (this.exists && !options.overwrite)
      throw new Error("file already exists");
    fs.writeFileSync(this.path, Buffer.alloc(0));
  }
  delete() {
    fs.rmSync(this.path, { force: true });
  }
  open(mode) {
    const flags = mode === "rw" ? "r+" : "w";
    return new TestFileHandle(fs.openSync(this.path, flags));
  }
  async digest() {
    return crypto
      .createHash("sha256")
      .update(fs.readFileSync(this.path))
      .digest("hex");
  }
  async move(destination) {
    fs.renameSync(this.path, destination.path);
  }
}

class TestFileHandle {
  constructor(fd) {
    this.fd = fd;
    this.currentOffset = 0;
  }
  get offset() {
    return this.currentOffset;
  }
  set offset(value) {
    this.currentOffset = value;
  }
  async writeBytes(bytes) {
    const buffer = Buffer.from(bytes);
    const written = fs.writeSync(
      this.fd,
      buffer,
      0,
      buffer.length,
      this.currentOffset,
    );
    if (written !== buffer.length) throw new Error("short file write");
    this.currentOffset += written;
  }
  close() {
    fs.closeSync(this.fd);
  }
}

const Paths = {
  document: root,
  cache: path.join(root, "cache"),
};
const downloadModule = loadTs(join(__dirname, "../data/offline-audio.ts"), {
  "expo-audio": { createAudioPlayer: () => { throw new Error("unused"); } },
  "expo-sqlite": {
    deleteDatabaseAsync: async (filename) =>
      fs.rmSync(path.join(root, "SQLite", filename), { force: true }),
    openDatabaseAsync: async () => ({
      getFirstAsync: async () => ({ value: String(metadata.entryCount) }),
      execAsync: async () => {},
      closeAsync: async () => {},
      getAllAsync: async () => [],
    }),
  },
  "expo-file-system": {
    Directory: TestDirectory,
    File: TestFile,
    FileMode: { ReadWrite: "rw", WriteOnly: "w", ReadOnly: "r" },
    Paths,
  },
  "react-native": { Platform: { OS: "android" } },
  "../domain/offline-audio": domainForTest,
});

function response(start, end, status = 206) {
  const bytes = source.subarray(start, end + 1);
  return {
    status,
    headers: {
      get(name) {
        return name.toLowerCase() === "content-range"
          ? `bytes ${start}-${end}/${totalBytes}`
          : null;
      },
    },
    body: { cancel: async () => {} },
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
}

(async () => {
  process.env.EXPO_PUBLIC_DOMAIN = "audio-test.invalid";
  assert.equal(
    domain.offlineAudioResumeOffset(chunkBytes + 19, totalBytes),
    chunkBytes,
    "Resume only from the last complete chunk after an interrupted write.",
  );
  assert.equal(
    domain.offlineAudioResumeOffset(totalBytes, totalBytes),
    totalBytes,
    "A complete partial file proceeds directly to verification.",
  );
  assert.equal(
    domain.offlineAudioResumeOffset(totalBytes + 1, totalBytes),
    0,
    "An oversized partial file is discarded rather than trusted.",
  );

  const requestedRanges = [];
  let failedChunkRetries = 3;
  global.fetch = async (_url, options) => {
    const match = /^bytes=(\d+)-(\d+)$/.exec(options.headers.Range);
    assert.ok(match, "Audio requests must specify a byte range.");
    const start = Number(match[1]);
    const end = Number(match[2]);
    requestedRanges.push([start, end]);
    if (start === chunkBytes && failedChunkRetries > 0) {
      failedChunkRetries -= 1;
      return response(start, end, 503);
    }
    return response(start, end);
  };

  const progressAfterFailure = [];
  const stages = [];
  await assert.rejects(
    downloadModule.downloadOfflineAudio(
      (current) => progressAfterFailure.push(current),
      undefined,
      (stage) => stages.push(stage),
    ),
    /sau 3 lần thử.*giữ lại/u,
  );
  assert.equal(fs.statSync(partialPath).size, chunkBytes);
  assert.deepEqual(
    requestedRanges.map(([start]) => start),
    [0, chunkBytes, chunkBytes, chunkBytes],
    "Retry a failed chunk without re-downloading already completed chunks.",
  );
  assert.equal(progressAfterFailure.at(-1), chunkBytes);
  assert.deepEqual(stages, ["downloading"]);

  const cancelController = new AbortController();
  requestedRanges.length = 0;
  await assert.rejects(
    downloadModule.downloadOfflineAudio(
      (current) => {
        if (current >= chunkBytes * 2) cancelController.abort();
      },
      cancelController.signal,
    ),
    /Đã hủy tải gói audio/u,
  );
  assert.deepEqual(
    requestedRanges.map(([start]) => start),
    [chunkBytes],
    "Stopping preserves complete chunks already received.",
  );
  assert.equal(fs.statSync(partialPath).size, chunkBytes * 2);
  assert.deepEqual(await downloadModule.getOfflineAudioStatus(), {
    state: "missing",
    bytes: chunkBytes * 2,
  });

  const rangeFetch = global.fetch;
  global.fetch = async (_url, options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener(
        "abort",
        () => reject(new Error("connection stopped by user")),
        { once: true },
      );
    });
  const stalledController = new AbortController();
  const stalledDownload = downloadModule.downloadOfflineAudio(
    undefined,
    stalledController.signal,
  );
  setTimeout(() => stalledController.abort(), 10);
  await assert.rejects(
    stalledDownload,
    /Đã hủy tải gói audio/u,
    "Stopping a stalled request aborts it immediately.",
  );
  assert.equal(fs.statSync(partialPath).size, chunkBytes * 2);
  global.fetch = rangeFetch;

  fs.appendFileSync(partialPath, Buffer.alloc(8, 255));
  assert.equal(
    domain.offlineAudioResumeOffset(fs.statSync(partialPath).size, totalBytes),
    chunkBytes * 2,
    "Ignore an incomplete tail and overwrite it from the last complete chunk.",
  );
  requestedRanges.length = 0;
  stages.length = 0;
  await downloadModule.downloadOfflineAudio(
    undefined,
    undefined,
    (stage) => stages.push(stage),
  );
  assert.deepEqual(
    requestedRanges.map(([start]) => start),
    [chunkBytes * 2],
    "A later tap resumes at the first missing chunk.",
  );
  assert.deepEqual(stages, ["downloading", "verifying", "saving"]);
  assert.equal(fs.existsSync(partialPath), false);
  assert.equal(fs.statSync(sqlitePath).size, totalBytes);
  assert.equal(
    crypto.createHash("sha256").update(fs.readFileSync(sqlitePath)).digest("hex"),
    metadata.sha256,
    "Promote only the complete file after its SHA-256 matches.",
  );
  assert.deepEqual(await downloadModule.getOfflineAudioStatus(), {
    state: "installed",
    bytes: totalBytes,
  });

  const originalSetTimeout = global.setTimeout;
  global.setTimeout = (callback, delay, ...args) =>
    originalSetTimeout(callback, delay === 20_000 ? 0 : delay, ...args);
  requestedRanges.length = 0;
  global.fetch = async (_url, options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener(
        "abort",
        () => reject(new Error("connection stalled")),
        { once: true },
      );
    });
  try {
    await assert.rejects(
      downloadModule.downloadOfflineAudio(),
      /hết thời gian chờ 20 giây/u,
      "A stalled request times out and reports a useful error.",
    );
    assert.equal(requestedRanges.length, 0);
  } finally {
    global.setTimeout = originalSetTimeout;
  }

  await downloadModule.deleteOfflineAudio();
  assert.equal(fs.existsSync(sqlitePath), false);
  assert.equal(fs.existsSync(partialPath), false);

  const webDeletedDatabases = [];
  class UnsupportedWebFileSystemType {
    constructor() {
      throw new Error("expo-file-system is unavailable on web");
    }
  }
  const webAudioModule = loadTs(
    join(__dirname, "../data/offline-audio.ts"),
    {
      "expo-audio": { createAudioPlayer: () => { throw new Error("unused"); } },
      "expo-sqlite": {
        deleteDatabaseAsync: async (filename) =>
          webDeletedDatabases.push(filename),
      },
      "expo-file-system": {
        Directory: UnsupportedWebFileSystemType,
        File: UnsupportedWebFileSystemType,
        FileMode: {},
        Paths: {},
      },
      "react-native": { Platform: { OS: "web" } },
      "../domain/offline-audio": domainForTest,
    },
  );
  await webAudioModule.deleteOfflineAudio();
  assert.deepEqual(
    webDeletedDatabases,
    [metadata.filename],
    "Web reset removes the audio database without constructing unsupported FileSystem objects.",
  );
  console.log(
    "PASS: audio downloads resume by complete chunk, stop safely, time out, verify, and reset.",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    global.fetch = oldFetch;
    if (oldDomain === undefined) delete process.env.EXPO_PUBLIC_DOMAIN;
    else process.env.EXPO_PUBLIC_DOMAIN = oldDomain;
    fs.rmSync(root, { recursive: true, force: true });
  });

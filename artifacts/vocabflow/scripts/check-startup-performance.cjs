const assert = require("node:assert/strict");
const { join } = require("node:path");
const { loadTs } = require("./test-support.cjs");

async function run() {
  const appDir = join(__dirname, "..");
  const values = new Map();
  const calls = [];
  const asyncStorage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => values.set(key, value),
  };
  const states = {
    dictionary: "installed",
    courses: "installed",
    ipa: "installed",
    audio: "installed",
  };
  const moduleUnderTest = loadTs(
    join(appDir, "data/startup-performance.ts"),
    {
      "@react-native-async-storage/async-storage": {
        __esModule: true,
        default: asyncStorage,
      },
      "react-native": { Platform: { OS: "android" } },
      "./dictionary": {
        getOfflineDictionaryStatus: async () => {
          calls.push("dictionary");
          return { state: states.dictionary };
        },
      },
      "./offline-course-data": {
        getOfflineCourseDataStatus: async () => {
          calls.push("courses");
          return { state: states.courses };
        },
      },
      "./offline-regional-pronunciations": {
        getOfflineRegionalIpaReadiness: async () => {
          calls.push("ipa");
          return { state: states.ipa };
        },
      },
      "./offline-audio": {
        getOfflineAudioStatus: async () => {
          calls.push("audio");
          return { state: states.audio };
        },
      },
    },
  );

  await moduleUnderTest.measureStartupDataReadiness(
    moduleUnderTest.APP_RUNTIME_STARTED_AT,
  );
  let snapshot = moduleUnderTest.getStartupPerformanceSnapshot();
  assert.ok(snapshot?.firstCompleteMs !== null);
  assert.equal(snapshot.completeSamplesMs.length, 1);
  assert.equal(snapshot.latest.complete, true);
  assert.deepEqual(calls, ["dictionary", "courses", "ipa", "audio"]);
  assert.equal(
    moduleUnderTest.averageStartupMilliseconds(snapshot.completeSamplesMs) >= 0,
    true,
  );

  const firstCompleteMs = snapshot.firstCompleteMs;
  await moduleUnderTest.measureStartupDataReadiness(
    moduleUnderTest.APP_RUNTIME_STARTED_AT,
  );
  snapshot = moduleUnderTest.getStartupPerformanceSnapshot();
  assert.equal(snapshot.firstCompleteMs, firstCompleteMs);
  assert.equal(snapshot.completeSamplesMs.length, 2);
  assert.equal(snapshot.latest.complete, true);

  states.audio = "missing";
  await moduleUnderTest.measureStartupDataReadiness(
    moduleUnderTest.APP_RUNTIME_STARTED_AT,
  );
  snapshot = moduleUnderTest.getStartupPerformanceSnapshot();
  assert.equal(snapshot.latest.complete, false);
  assert.equal(snapshot.completeSamplesMs.length, 2);
  assert.equal(snapshot.latest.packages.audio.state, "missing");
  assert.ok(values.size > 0, "Launch timings are persisted locally.");

  console.log(
    "Startup performance checks passed: first complete run, rolling average, partial readiness, and local persistence.",
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

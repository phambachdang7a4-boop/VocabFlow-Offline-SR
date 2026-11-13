const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { loadTs } = require("./test-support.cjs");

const source = (file) => readFileSync(join(__dirname, "..", file), "utf8");
const storedValues = new Map();
const storage = {
  async getItem(key) {
    return storedValues.get(key) ?? null;
  },
  async setItem(key, value) {
    storedValues.set(key, value);
  },
};
const preferences = loadTs(join(__dirname, "../data/sound-preferences.ts"), {
  "@react-native-async-storage/async-storage": { ...storage, default: storage },
});
const cues = loadTs(join(__dirname, "../domain/sound-cues.ts"));
const controllerModule = loadTs(
  join(__dirname, "../domain/sound-controller.ts"),
  {
    "@/domain/sound-cues": cues,
  },
);

const soundNames = [
  "success",
  "error",
  "delete",
  "toggle-on",
  "toggle-off",
  "start",
  "complete",
  "processing",
];
const nativePlayers = [];
const audioModule = {
  createAudioPlayer(sourceId) {
    const listeners = new Set();
    const player = {
      sourceId,
      volume: 1,
      loop: false,
      playing: false,
      removed: false,
      addListener(event, listener) {
        assert.equal(event, "playbackStatusUpdate");
        listeners.add(listener);
        return { remove: () => listeners.delete(listener) };
      },
      play() {
        this.playing = true;
      },
      pause() {
        this.playing = false;
      },
      remove() {
        this.removed = true;
      },
      emit(didJustFinish) {
        for (const listener of [...listeners])
          listener({ didJustFinish, isLoaded: true });
      },
    };
    nativePlayers.push(player);
    return player;
  },
};
const nativeDependencies = {
  "expo-audio": audioModule,
  "@/domain/sound-cues": cues,
};
soundNames.forEach((name, index) => {
  nativeDependencies[`uisfx/sounds/organic/${name}.mp3`] = index + 1;
});
const nativeEngineModule = loadTs(
  join(__dirname, "../domain/sound-engine.native.ts"),
  nativeDependencies,
);

const webLog = [];
let webCreateCount = 0;
let webOptions;
const fakeWebPlayer = {
  unlock() {
    webLog.push("unlock");
    return Promise.resolve(true);
  },
  play() {
    webLog.push("play");
    return null;
  },
  stopAll() {
    webLog.push("stopAll");
  },
  setEnabled(value) {
    webLog.push(`enabled:${value}`);
  },
  setVolume(value) {
    webLog.push(`volume:${value}`);
  },
  setPack(value) {
    webLog.push(`pack:${value}`);
  },
  async destroy() {
    webLog.push("destroy");
  },
};
class FakeAudioContext {
  constructor() {
    this.state = "suspended";
    webLog.push("context");
  }
  async resume() {
    webLog.push("resume");
    this.state = "running";
  }
  async close() {
    webLog.push("close");
    this.state = "closed";
  }
}
const webEngineModule = loadTs(
  join(__dirname, "../domain/sound-engine.web.ts"),
  {
    "@/domain/sound-cues": cues,
    uisfx: {
      createUISFX(options) {
        webCreateCount += 1;
        webOptions = options;
        webLog.push("create-player");
        return fakeWebPlayer;
      },
    },
  },
  { window: { AudioContext: FakeAudioContext } },
);

function makeFakeEngine({ returnNull = false } = {}) {
  const calls = [];
  let stopped = 0;
  let resolved = () => {};
  const ended = new Promise((resolve) => {
    resolved = resolve;
  });
  const handle = {
    stop() {
      stopped += 1;
      calls.push("stop-handle");
      resolved();
    },
    ended,
  };
  const engine = {
    unlockFromGesture() {
      calls.push("unlock");
    },
    play(cue, options) {
      calls.push(`play:${cue}:${options?.loop ? "loop" : "one-shot"}`);
      return returnNull ? null : handle;
    },
    stopAll() {
      calls.push("stopAll");
    },
    setEnabled(value) {
      calls.push(`enabled:${value}`);
    },
    setVolume(value) {
      calls.push(`volume:${value}`);
    },
    setPack(value) {
      calls.push(`pack:${value}`);
    },
    async destroy() {
      calls.push("destroy");
    },
  };
  return {
    calls,
    engine,
    handle,
    get stopped() {
      return stopped;
    },
  };
}

(async () => {
  assert.deepEqual(await preferences.readSoundPreferences(), {
    enabled: true,
    volume: 0.7,
  });
  const chosen = { enabled: false, volume: 0.35 };
  await preferences.writeSoundPreferences(chosen);
  assert.deepEqual(
    await preferences.readSoundPreferences(),
    chosen,
    "Sound settings persist across app restarts.",
  );
  await assert.rejects(
    preferences.writeSoundPreferences({ enabled: true, volume: 1.2 }),
    /không hợp lệ/,
  );
  storedValues.set(preferences.SOUND_PREFERENCES_KEY, "{broken");
  await assert.rejects(preferences.readSoundPreferences(), SyntaxError);
  storedValues.clear();

  assert.equal(cues.SOUND_PACK, "organic");
  assert.deepEqual(
    {
      save: cues.soundCueFor("wordSaved"),
      delete: cues.soundCueFor("wordDeleted"),
      freeze: cues.soundCueFor("freezeEnabled"),
      unfreeze: cues.soundCueFor("freezeDisabled"),
      right: cues.soundCueFor("reviewCorrect"),
      wrong: cues.soundCueFor("reviewIncorrect"),
      course: cues.soundCueFor("lessonCompleted"),
      download: cues.soundCueFor("dictionaryProcessing"),
    },
    {
      save: "success",
      delete: "delete",
      freeze: "toggle-on",
      unfreeze: "toggle-off",
      right: "success",
      wrong: "error",
      course: "complete",
      download: "processing",
    },
  );
  assert.equal(
    Object.hasOwn(cues.SOUND_EVENT_CUES, "typing"),
    false,
    "Routine text entry is not sonified.",
  );

  const outcomeEvents = [];
  let resolveSave;
  const pendingSave = cues.withSoundOutcome(
    () =>
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
    (cue) => outcomeEvents.push(cue),
    "success",
  );
  await Promise.resolve();
  assert.deepEqual(
    outcomeEvents,
    [],
    "A success cue waits for the actual save result.",
  );
  resolveSave("saved");
  assert.equal(await pendingSave, "saved");
  assert.deepEqual(outcomeEvents, ["success"]);
  await assert.rejects(
    cues.withSoundOutcome(
      async () => {
        throw new Error("write failed");
      },
      (cue) => outcomeEvents.push(cue),
      "success",
    ),
    /write failed/,
  );
  assert.deepEqual(
    outcomeEvents,
    ["success", "error"],
    "Failures get one error cue and no success cue.",
  );

  let loopStarts = 0;
  let loopStops = 0;
  assert.equal(
    await cues.withSoundLoop(
      () => {
        loopStarts += 1;
      },
      async () => "done",
      () => {
        loopStops += 1;
      },
    ),
    "done",
  );
  await assert.rejects(
    cues.withSoundLoop(
      () => {
        loopStarts += 1;
      },
      async () => {
        throw new Error("cancelled");
      },
      () => {
        loopStops += 1;
      },
    ),
    /cancelled/,
  );
  assert.deepEqual(
    [loopStarts, loopStops],
    [2, 2],
    "Loops stop in finally after success and cancellation/error.",
  );

  const guard = cues.createOutcomeGuard();
  let committedOutcomes = 0;
  const keyboardOrPointerSubmit = () => {
    if (!guard.claim()) return;
    committedOutcomes += 1;
  };
  keyboardOrPointerSubmit();
  keyboardOrPointerSubmit();
  assert.equal(
    committedOutcomes,
    1,
    "Keyboard and pointer submissions for one answer commit once.",
  );
  guard.reset();
  keyboardOrPointerSubmit();
  assert.equal(
    committedOutcomes,
    2,
    "The next answer can be submitted after the guard resets.",
  );

  const muteFixture = makeFakeEngine();
  const { calls, engine, handle } = muteFixture;
  const controller = controllerModule.createSoundController(engine, {
    enabled: true,
    volume: 0.7,
  });
  controller.unlockFromGesture();
  const loop1 = controller.startLoop("dictionary", "processing");
  const loop2 = controller.startLoop("dictionary", "processing");
  assert.equal(
    loop1,
    loop2,
    "Repeated starts for a visible process reuse the active loop.",
  );
  assert.equal(controller.getLoopCount(), 1);
  assert.equal(controller.play("success"), handle);
  controller.setVolume(0.4);
  assert.equal(controller.getVolume(), 0.4);
  controller.setEnabled(false);
  assert.equal(controller.getLoopCount(), 0);
  assert.equal(muteFixture.stopped, 1);
  assert.equal(
    controller.play("success"),
    null,
    "Mute suppresses later cues immediately.",
  );
  const stopIndex = calls.indexOf("stop-handle");
  const muteIndex = calls.indexOf("enabled:false");
  assert.ok(
    stopIndex >= 0 && muteIndex > stopIndex,
    "Active loops stop before the player is muted.",
  );

  const nullController = controllerModule.createSoundController(
    makeFakeEngine({ returnNull: true }).engine,
    { enabled: true, volume: 0.7 },
  );
  nullController.unlockFromGesture();
  assert.equal(
    nullController.play("success"),
    null,
    "A null playback handle is harmless.",
  );

  const remountFixture = makeFakeEngine();
  const remountController = controllerModule.createSoundController(
    remountFixture.engine,
    { enabled: true, volume: 0.7 },
  );
  remountController.unlockFromGesture();
  remountController.startLoop("visible", "processing");
  await remountController.dispose();
  assert.equal(
    remountFixture.stopped,
    1,
    "Unmount cleanup stops every active loop.",
  );
  assert.ok(
    remountFixture.calls.includes("destroy"),
    "Unmount cleanup disposes its shared player.",
  );
  assert.equal(
    remountController.play("success"),
    null,
    "Disposed players cannot replay after remount.",
  );

  const foregroundFixture = makeFakeEngine();
  const foregroundController = controllerModule.createSoundController(
    foregroundFixture.engine,
    { enabled: true, volume: 0.7 },
  );
  foregroundController.unlockFromGesture();
  foregroundController.startLoop("visible-process", "processing");
  foregroundController.setForeground(false);
  assert.equal(
    foregroundFixture.stopped,
    1,
    "Backgrounding clears visible process loops.",
  );
  assert.equal(foregroundController.play("success"), null);
  foregroundController.setForeground(true);
  assert.equal(
    foregroundController.play("success"),
    null,
    "Returning to foreground still requires a fresh user gesture.",
  );
  foregroundController.unlockFromGesture();
  assert.ok(foregroundController.play("success"));
  await foregroundController.dispose();

  let serverPlayerCreates = 0;
  const serverEngineModule = loadTs(
    join(__dirname, "../domain/sound-engine.web.ts"),
    {
      "@/domain/sound-cues": cues,
      uisfx: {
        createUISFX() {
          serverPlayerCreates += 1;
          throw new Error("SSR must not create audio");
        },
      },
    },
  );
  const serverEngine = serverEngineModule.createSoundEngine({
    enabled: true,
    volume: 0.7,
  });
  serverEngine.unlockFromGesture();
  assert.equal(
    serverPlayerCreates,
    0,
    "SSR imports and unlock attempts never create browser audio.",
  );

  // Web player creation is lazy: importing/constructing the engine (including
  // an SSR render) does not create an AudioContext or UISFX player.
  const browserEngine = webEngineModule.createSoundEngine({
    enabled: true,
    volume: 0.7,
  });
  assert.equal(webCreateCount, 0);
  browserEngine.unlockFromGesture();
  assert.equal(webCreateCount, 1);
  assert.deepEqual(
    webLog.slice(0, 3),
    ["context", "resume", "create-player"],
    "AudioContext resumes in the gesture before player creation.",
  );
  assert.equal(webOptions.pack, "organic");
  assert.equal(webOptions.volume, 0.7);
  assert.equal(webOptions.enabled, true);
  assert.ok(webOptions.context instanceof FakeAudioContext);
  assert.equal(
    browserEngine.play("success"),
    null,
    "UISFX null handles are not treated as errors.",
  );
  await browserEngine.destroy();
  assert.ok(
    webLog.indexOf("destroy") < webLog.indexOf("close"),
    "Destroy the player before closing the caller-owned context.",
  );

  const nativeEngine = nativeEngineModule.createSoundEngine({
    enabled: true,
    volume: 0.7,
  });
  const nativeOneShot = nativeEngine.play("success");
  assert.ok(nativeOneShot);
  assert.equal(nativePlayers.at(-1).volume, 0.7);
  nativePlayers.at(-1).emit(true);
  assert.equal(
    nativePlayers.at(-1).removed,
    true,
    "Completed native one-shots release their player.",
  );
  const nativeLoop = nativeEngine.play("processing", { loop: true });
  assert.equal(nativePlayers.at(-1).loop, true);
  nativeEngine.setVolume(0.25);
  assert.equal(nativePlayers.at(-1).volume, 0.25);
  nativeLoop.stop();
  assert.equal(
    nativePlayers.at(-1).removed,
    true,
    "Native loops release audio resources on stop.",
  );
  await nativeEngine.destroy();

  const settings = source("app/settings.tsx");
  assert.match(settings, /testID="sfx-enabled"/);
  assert.match(settings, /accessibilityLabel="Âm thanh ứng dụng"/);
  assert.match(settings, /testID="sfx-volume-down"/);
  assert.match(settings, /testID="sfx-volume-up"/);
  const gate = source("components/DictionaryGate.tsx");
  assert.match(
    gate,
    /sound\.stopLoop\(DICTIONARY_LOOP_KEY\)/,
    "Leaving the dictionary gate stops its loop.",
  );
  const reviewCard = source("components/ReviewCard.tsx");
  assert.match(reviewCard, /if \(lock\.current \|\| blocked\) return/);
  assert.doesNotMatch(reviewCard, /onChangeText=\{[^}]*sound\.play/);
  const appLayout = source("app/_layout.tsx");
  const soundContext = source("contexts/SoundEffectsContext.tsx");
  assert.match(appLayout, /<SoundEffectsProvider>/);
  assert.match(soundContext, /controller\.dispose\(\)/);
  console.log(
    "PASS: sound mapping, persisted settings, async outcomes, mute/loop cleanup, deduplication, SSR safety, and native/web playback lifecycle.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import type { AudioSource } from "expo-audio";
import type { CueName, PackName, PlayingSFX } from "uisfx";
import type { SoundPreferences } from "@/data/sound-preferences";
import type { SoundEngine, SoundPlayOptions } from "@/domain/sound-controller";
import { SOUND_PACK } from "@/domain/sound-cues";

const LOCAL_SOUNDS: Partial<Record<CueName, AudioSource>> = {
  success: require("uisfx/sounds/organic/success.mp3"),
  error: require("uisfx/sounds/organic/error.mp3"),
  delete: require("uisfx/sounds/organic/delete.mp3"),
  "toggle-on": require("uisfx/sounds/organic/toggle-on.mp3"),
  "toggle-off": require("uisfx/sounds/organic/toggle-off.mp3"),
  start: require("uisfx/sounds/organic/start.mp3"),
  complete: require("uisfx/sounds/organic/complete.mp3"),
  processing: require("uisfx/sounds/organic/processing.mp3"),
};

const REVIEW_SCALE_SOUNDS: AudioSource[] = [
  require("../assets/sounds/review-scale/note-00.wav"),
  require("../assets/sounds/review-scale/note-01.wav"),
  require("../assets/sounds/review-scale/note-02.wav"),
  require("../assets/sounds/review-scale/note-03.wav"),
  require("../assets/sounds/review-scale/note-04.wav"),
  require("../assets/sounds/review-scale/note-05.wav"),
  require("../assets/sounds/review-scale/note-06.wav"),
  require("../assets/sounds/review-scale/note-07.wav"),
  require("../assets/sounds/review-scale/note-08.wav"),
  require("../assets/sounds/review-scale/note-09.wav"),
  require("../assets/sounds/review-scale/note-10.wav"),
  require("../assets/sounds/review-scale/note-11.wav"),
  require("../assets/sounds/review-scale/note-12.wav"),
  require("../assets/sounds/review-scale/note-13.wav"),
  require("../assets/sounds/review-scale/note-14.wav"),
  require("../assets/sounds/review-scale/note-15.wav"),
];

type ActivePlayback = {
  player: AudioPlayer;
  handle: PlayingSFX;
};

export function createSoundEngine(initial: SoundPreferences): SoundEngine {
  let enabled = initial.enabled;
  let volume = initial.volume;
  let pack: PackName = SOUND_PACK;
  let disposed = false;
  const active = new Set<ActivePlayback>();

  const stopAll = () => {
    for (const playback of [...active]) playback.handle.stop();
  };

  const playSource = (
    source: AudioSource | undefined,
    options: SoundPlayOptions = {},
  ): PlayingSFX | null => {
    if (!enabled || disposed || pack !== SOUND_PACK || source === undefined)
      return null;
    let createdPlayer: AudioPlayer | null = null;
    try {
      const nextPlayer = createAudioPlayer(source, { updateInterval: 100 });
      nextPlayer.volume = volume;
      nextPlayer.loop = options.loop ?? false;
      createdPlayer = nextPlayer;
    } catch {
      try {
        createdPlayer?.remove();
      } catch {
        /* Ignore partial player setup. */
      }
      return null;
    }
    if (!createdPlayer) return null;
    const player = createdPlayer;

    let finished = false;
    let subscription: { remove: () => void } | null = null;
    let resolveEnded = () => {};
    const ended = new Promise<void>((resolve) => {
      resolveEnded = resolve;
    });
    let playback: ActivePlayback;
    const finish = () => {
      if (finished) return;
      finished = true;
      subscription?.remove();
      active.delete(playback);
      try {
        player.pause();
      } catch {
        /* Player may already have stopped. */
      }
      try {
        player.remove();
      } catch {
        /* Player may already have been released. */
      }
      resolveEnded();
    };
    const handle: PlayingSFX = { stop: finish, ended };
    playback = { player, handle };
    active.add(playback);
    try {
      subscription = player.addListener("playbackStatusUpdate", (status) => {
        if (!options.loop && status.didJustFinish) finish();
      });
      player.play();
    } catch {
      finish();
      return null;
    }
    return handle;
  };

  return {
    unlockFromGesture() {
      // Native audio playback is allowed only after the controller receives a
      // real user gesture; this keeps asynchronous startup cues suppressed.
    },
    play(cue: CueName, options: SoundPlayOptions = {}) {
      return playSource(LOCAL_SOUNDS[cue], options);
    },
    playReviewNote(index: number) {
      if (!Number.isFinite(index) || index < 0) return null;
      const note = Math.min(Math.floor(index), REVIEW_SCALE_SOUNDS.length - 1);
      return playSource(REVIEW_SCALE_SOUNDS[note]);
    },
    stopAll,
    setEnabled(next) {
      enabled = next;
      if (!next) stopAll();
    },
    setVolume(next) {
      volume = Math.min(1, Math.max(0, next));
      for (const playback of active) playback.player.volume = volume;
    },
    setPack(next) {
      pack = next;
    },
    async destroy() {
      if (disposed) return;
      disposed = true;
      stopAll();
    },
  };
}

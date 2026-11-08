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

  return {
    unlockFromGesture() {
      // Native audio playback is allowed only after the controller receives a
      // real user gesture; this keeps asynchronous startup cues suppressed.
    },
    play(cue: CueName, options: SoundPlayOptions = {}) {
      const source = LOCAL_SOUNDS[cue];
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

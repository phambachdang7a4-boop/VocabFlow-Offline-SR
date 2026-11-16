import type { CueName, PackName, PlayingSFX } from "uisfx";
import type { SoundPreferences } from "@/data/sound-preferences";
import { SOUND_PACK } from "@/domain/sound-cues";

export type SoundPlayOptions = { loop?: boolean };

export interface SoundEngine {
  unlockFromGesture: () => void;
  play: (cue: CueName, options?: SoundPlayOptions) => PlayingSFX | null;
  playReviewNote: (index: number) => PlayingSFX | null;
  stopAll: () => void;
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  setPack: (pack: PackName) => void;
  destroy: () => Promise<void>;
}

export function createSoundController(
  engine: SoundEngine,
  preferences: SoundPreferences,
) {
  let enabled = preferences.enabled;
  let volume = preferences.volume;
  let foreground = true;
  let unlocked = false;
  let disposed = false;
  const loops = new Map<string, PlayingSFX>();

  engine.setPack(SOUND_PACK);
  engine.setVolume(volume);
  engine.setEnabled(enabled);

  const stopLoop = (key: string) => {
    const handle = loops.get(key);
    if (!handle) return;
    loops.delete(key);
    try {
      handle.stop();
    } catch {
      /* A stopped or disposed loop is already quiet. */
    }
  };

  const stopAll = () => {
    for (const key of [...loops.keys()]) stopLoop(key);
    try {
      engine.stopAll();
    } catch {
      /* Cleanup must not break navigation or mute. */
    }
  };

  return {
    unlockFromGesture() {
      if (disposed || !foreground) return;
      try {
        engine.unlockFromGesture();
        unlocked = true;
      } catch {
        unlocked = false;
      }
    },
    play(cue: CueName) {
      if (disposed || !foreground || !unlocked || !enabled) return null;
      try {
        return engine.play(cue);
      } catch {
        return null;
      }
    },
    playReviewNote(index: number) {
      if (disposed || !foreground || !unlocked || !enabled) return null;
      try {
        return engine.playReviewNote(index);
      } catch {
        return null;
      }
    },
    startLoop(key: string, cue: CueName) {
      if (disposed || !foreground || !unlocked || !enabled) return null;
      const existing = loops.get(key);
      if (existing) return existing;
      let handle: PlayingSFX | null = null;
      try {
        handle = engine.play(cue, { loop: true });
      } catch {
        return null;
      }
      if (!handle) return null;
      loops.set(key, handle);
      void handle.ended.then(() => {
        if (loops.get(key) === handle) loops.delete(key);
      });
      return handle;
    },
    stopLoop,
    stopAll,
    setEnabled(next: boolean) {
      if (disposed) return;
      if (!next) {
        stopAll();
      }
      // uisfx.setEnabled(false) also stops its audio; stopAll above clears
      // our retained loop handles before delegating the immediate mute.
      enabled = next;
      try {
        engine.setEnabled(next);
      } catch {
        /* Preferences remain usable if audio fails. */
      }
    },
    setVolume(next: number) {
      if (disposed || !Number.isFinite(next)) return;
      volume = Math.min(1, Math.max(0, next));
      try {
        engine.setVolume(volume);
      } catch {
        /* Volume controls must not crash the app. */
      }
    },
    setPack(next: PackName) {
      if (disposed) return;
      try {
        engine.setPack(next);
      } catch {
        /* The selected pack remains local to the app. */
      }
    },
    setForeground(next: boolean) {
      if (disposed || foreground === next) return;
      foreground = next;
      if (!next) {
        stopAll();
        unlocked = false;
      }
    },
    getEnabled() {
      return enabled;
    },
    getVolume() {
      return volume;
    },
    getLoopCount() {
      return loops.size;
    },
    isUnlocked() {
      return unlocked;
    },
    async dispose() {
      if (disposed) return;
      stopAll();
      disposed = true;
      try {
        await engine.destroy();
      } catch {
        /* Teardown should not escape the provider. */
      }
    },
  };
}

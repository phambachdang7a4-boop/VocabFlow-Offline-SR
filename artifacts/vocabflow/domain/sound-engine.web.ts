import { createUISFX, type UISFXPlayer } from "uisfx";
import type { CueName, PackName } from "uisfx";
import type { SoundPreferences } from "@/data/sound-preferences";
import type { SoundEngine, SoundPlayOptions } from "@/domain/sound-controller";
import { SOUND_PACK } from "@/domain/sound-cues";

type BrowserWindow = Window & { webkitAudioContext?: typeof AudioContext };

export function createSoundEngine(initial: SoundPreferences): SoundEngine {
  let enabled = initial.enabled;
  let volume = initial.volume;
  let pack: PackName = SOUND_PACK;
  let player: UISFXPlayer | null = null;
  let ownedContext: AudioContext | null = null;

  const ensurePlayerFromGesture = (): UISFXPlayer | null => {
    if (player) return player;
    if (typeof window === "undefined") return null;
    const AudioContextConstructor =
      window.AudioContext ?? (window as BrowserWindow).webkitAudioContext;
    if (!AudioContextConstructor) return null;

    try {
      ownedContext = new AudioContextConstructor();
      // resume() is invoked synchronously in the trusted user-gesture handler.
      void ownedContext.resume().catch(() => {});
      player = createUISFX({ pack, volume, enabled, context: ownedContext });
      player.setPack(pack);
      return player;
    } catch {
      if (ownedContext && ownedContext.state !== "closed") {
        void ownedContext.close().catch(() => {});
      }
      ownedContext = null;
      player = null;
      return null;
    }
  };

  return {
    unlockFromGesture() {
      const current = ensurePlayerFromGesture();
      if (current) void current.unlock().catch(() => {});
    },
    play(cue: CueName, options: SoundPlayOptions = {}) {
      return (
        player?.play(
          cue,
          options.loop ? { loop: true, retrigger: "ignore" } : undefined,
        ) ?? null
      );
    },
    stopAll() {
      player?.stopAll();
    },
    setEnabled(next) {
      enabled = next;
      player?.setEnabled(next);
    },
    setVolume(next) {
      volume = Math.min(1, Math.max(0, next));
      player?.setVolume(volume);
    },
    setPack(next) {
      pack = next;
      player?.setPack(next);
    },
    async destroy() {
      const current = player;
      const context = ownedContext;
      player = null;
      ownedContext = null;
      try {
        await current?.destroy();
      } finally {
        // The application created and owns this AudioContext. uisfx.destroy()
        // must run first; close the caller-owned context afterward.
        if (context && context.state !== "closed") {
          try {
            await context.close();
          } catch {
            /* It may have closed concurrently. */
          }
        }
      }
    },
  };
}

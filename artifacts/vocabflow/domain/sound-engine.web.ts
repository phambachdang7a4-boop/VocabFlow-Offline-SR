import { createUISFX, type UISFXPlayer } from "uisfx";
import type { CueName, PackName, PlayingSFX } from "uisfx";
import type { SoundPreferences } from "@/data/sound-preferences";
import type { SoundEngine, SoundPlayOptions } from "@/domain/sound-controller";
import { SOUND_PACK } from "@/domain/sound-cues";

type BrowserWindow = Window & { webkitAudioContext?: typeof AudioContext };
const REVIEW_SCALE_SEMITONES = [
  0, 2, 4, 5, 7, 9, 11, 12, 24, 26, 28, 29, 31, 33, 35, 36,
] as const;

export function createSoundEngine(initial: SoundPreferences): SoundEngine {
  let enabled = initial.enabled;
  let volume = initial.volume;
  let pack: PackName = SOUND_PACK;
  let player: UISFXPlayer | null = null;
  let ownedContext: AudioContext | null = null;
  const activeNotes = new Set<PlayingSFX>();

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

  const stopNotes = () => {
    for (const note of [...activeNotes]) note.stop();
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
    playReviewNote(index: number) {
      if (
        !Number.isFinite(index) ||
        index < 0 ||
        !enabled ||
        pack !== SOUND_PACK ||
        !ownedContext ||
        ownedContext.state === "closed"
      )
        return null;

      const context = ownedContext;
      const noteIndex = Math.min(
        Math.floor(index),
        REVIEW_SCALE_SEMITONES.length - 1,
      );
      const frequency = 261.625565 * 2 ** (REVIEW_SCALE_SEMITONES[noteIndex] / 12);
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const startedAt = context.currentTime;
      const duration = 0.2;
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, startedAt);
      gainNode.gain.setValueAtTime(0.0001, startedAt);
      gainNode.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, volume * 0.18),
        startedAt + 0.015,
      );
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startedAt + duration);
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      let finished = false;
      let resolveEnded = () => {};
      const ended = new Promise<void>((resolve) => {
        resolveEnded = resolve;
      });
      let handle: PlayingSFX;
      const finish = () => {
        if (finished) return;
        finished = true;
        activeNotes.delete(handle);
        try {
          oscillator.stop();
        } catch {
          /* The note may already have ended. */
        }
        try {
          oscillator.disconnect();
          gainNode.disconnect();
        } catch {
          /* Nodes may already be disconnected by the browser. */
        }
        resolveEnded();
      };
      handle = { stop: finish, ended };
      activeNotes.add(handle);
      oscillator.onended = finish;
      oscillator.start(startedAt);
      oscillator.stop(startedAt + duration);
      return handle;
    },
    stopAll() {
      player?.stopAll();
      stopNotes();
    },
    setEnabled(next) {
      enabled = next;
      player?.setEnabled(next);
      if (!next) stopNotes();
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
      stopNotes();
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

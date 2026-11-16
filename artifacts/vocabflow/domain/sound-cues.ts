import type { CueName } from "uisfx";

export const SOUND_PACK = "organic" as const;

export const SOUND_EVENT_CUES = {
  wordSaved: "success",
  wordUpdated: "success",
  wordDeleted: "delete",
  freezeEnabled: "toggle-on",
  freezeDisabled: "toggle-off",
  reviewCorrect: "success",
  reviewIncorrect: "error",
  courseAnswerCorrect: "success",
  courseAnswerIncorrect: "error",
  lessonCompleted: "complete",
  reviewStarted: "start",
  reviewCompleted: "complete",
  dictionaryProcessing: "processing",
  dictionaryReady: "complete",
  dictionaryFailed: "error",
  operationFailed: "error",
} as const satisfies Record<string, CueName>;

export type SoundEvent = keyof typeof SOUND_EVENT_CUES;

export function soundCueFor(event: SoundEvent): CueName {
  return SOUND_EVENT_CUES[event];
}

export async function withSoundOutcome<T>(
  operation: () => Promise<T>,
  play: (cue: CueName) => unknown,
  successCue: CueName | null,
  errorCue: CueName = soundCueFor("operationFailed"),
): Promise<T> {
  try {
    const result = await operation();
    if (successCue) play(successCue);
    return result;
  } catch (error) {
    play(errorCue);
    throw error;
  }
}

export async function withSoundLoop<T>(
  startLoop: () => unknown,
  operation: () => Promise<T>,
  stopLoop: () => void,
): Promise<T> {
  startLoop();
  try {
    return await operation();
  } finally {
    stopLoop();
  }
}

export function createOutcomeGuard() {
  let claimed = false;
  return {
    claim() {
      if (claimed) return false;
      claimed = true;
      return true;
    },
    reset() {
      claimed = false;
    },
  };
}

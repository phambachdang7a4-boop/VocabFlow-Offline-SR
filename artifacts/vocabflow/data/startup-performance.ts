import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const STARTUP_PERFORMANCE_KEY = "vocabflow-startup-performance-v1";
const MAX_COMPLETED_SAMPLES = 20;
const now = () => globalThis.performance?.now?.() ?? Date.now();
export const APP_RUNTIME_STARTED_AT = now();

export type StartupPackageId = "dictionary" | "courses" | "ipa" | "audio";
export type StartupPackageState =
  | "installed"
  | "missing"
  | "damaged"
  | "unavailable"
  | "updateAvailable"
  | "error";

export type StartupPackageResult = {
  durationMs: number;
  state: StartupPackageState;
};

export type StartupReadinessRun = {
  completedAt: number;
  complete: boolean;
  totalMs: number;
  packages: Record<StartupPackageId, StartupPackageResult>;
};

export type StartupPerformanceSnapshot = {
  firstCompleteMs: number | null;
  completeSamplesMs: number[];
  latest: StartupReadinessRun | null;
};

let snapshot: StartupPerformanceSnapshot | null = null;
let loadingSnapshot: Promise<StartupPerformanceSnapshot | null> | undefined;
let activeMeasurement: Promise<void> | undefined;
const listeners = new Set<() => void>();

function publish(next: StartupPerformanceSnapshot | null): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

function parseSnapshot(value: string | null): StartupPerformanceSnapshot | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as StartupPerformanceSnapshot;
    if (
      typeof parsed !== "object" ||
      !parsed ||
      !Array.isArray(parsed.completeSamplesMs)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getStartupPerformanceSnapshot():
  | StartupPerformanceSnapshot
  | null {
  return snapshot;
}

export function subscribeToStartupPerformance(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function loadStartupPerformance(): Promise<StartupPerformanceSnapshot | null> {
  if (snapshot) return snapshot;
  if (!loadingSnapshot) {
    loadingSnapshot = AsyncStorage.getItem(STARTUP_PERFORMANCE_KEY)
      .then(parseSnapshot)
      .then((stored) => {
        publish(stored);
        return stored;
      })
      .catch(() => {
        publish(null);
        return null;
      })
      .finally(() => {
        loadingSnapshot = undefined;
      });
  }
  return loadingSnapshot;
}

export function averageStartupMilliseconds(
  samples: readonly number[] | undefined,
): number | null {
  if (!samples?.length) return null;
  return Math.round(samples.reduce((sum, value) => sum + value, 0) / samples.length);
}

/**
 * Check the four offline packages after navigation is visible. Only readiness
 * metadata is read; this deliberately does not load every lesson or word row
 * into memory just to benchmark startup.
 */
export async function measureStartupDataReadiness(
  appRuntimeStartedAt: number,
): Promise<void> {
  if (Platform.OS === "web") return;
  if (activeMeasurement) return activeMeasurement;

  activeMeasurement = (async () => {
    try {
      const previous = await loadStartupPerformance();
      const packages = {} as Record<StartupPackageId, StartupPackageResult>;

      const checks: Array<{
        id: StartupPackageId;
        run: () => Promise<{ state: StartupPackageState | string }>;
      }> = [
        {
          id: "dictionary",
          run: async () =>
            (await import("./dictionary")).getOfflineDictionaryStatus(),
        },
        {
          id: "courses",
          run: async () =>
            (await import("./offline-course-data")).getOfflineCourseDataStatus(),
        },
        {
          id: "ipa",
          run: async () =>
            (await import("./offline-regional-pronunciations"))
              .getOfflineRegionalIpaReadiness(),
        },
        {
          id: "audio",
          run: async () =>
            (await import("./offline-audio")).getOfflineAudioStatus(),
        },
      ];

      for (const check of checks) {
        const startedAt = now();
        try {
          const result = await check.run();
          packages[check.id] = {
            durationMs: Math.max(0, Math.round(now() - startedAt)),
            state: result.state as StartupPackageState,
          };
        } catch {
          packages[check.id] = {
            durationMs: Math.max(0, Math.round(now() - startedAt)),
            state: "error",
          };
        }
      }

      const complete = checks.every(
        ({ id }) => packages[id]?.state === "installed",
      );
      const run: StartupReadinessRun = {
        completedAt: Date.now(),
        complete,
        totalMs: Math.max(0, Math.round(now() - appRuntimeStartedAt)),
        packages,
      };
      const samples = complete
        ? [...(previous?.completeSamplesMs ?? []), run.totalMs].slice(
            -MAX_COMPLETED_SAMPLES,
          )
        : (previous?.completeSamplesMs ?? []);
      const next: StartupPerformanceSnapshot = {
        firstCompleteMs:
          previous?.firstCompleteMs ?? (complete ? run.totalMs : null),
        completeSamplesMs: samples,
        latest: run,
      };

      await AsyncStorage.setItem(
        STARTUP_PERFORMANCE_KEY,
        JSON.stringify(next),
      );
      publish(next);
    } catch (error) {
      console.warn("Could not save startup performance data.", error);
    } finally {
      activeMeasurement = undefined;
    }
  })();

  return activeMeasurement;
}

export function formatStartupDuration(milliseconds: number | null): string {
  if (milliseconds === null) return "Chưa có số liệu";
  if (milliseconds < 1000) return `${milliseconds} ms`;
  return `${(milliseconds / 1000).toFixed(1)} giây`;
}

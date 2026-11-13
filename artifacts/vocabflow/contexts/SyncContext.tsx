import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import * as Network from "expo-network";
import {
  useMergeUserSyncData,
  useReplaceUserSyncData,
} from "@workspace/api-client-react";
import {
  clearPendingAccountReplacement,
  exportSyncSnapshot,
  hasPendingAccountReplacement,
  getLocalSyncState,
  mergeSyncSnapshot,
  subscribeToSyncChanges,
} from "@/data/vocabulary-sync";
import { markSyncClean } from "@/data/vocabulary";
import { clearLocalAccountAfterCloudReset } from "@/data/vocabulary-sync";
import { resetCloudFirst } from "@/domain/data-reset";

export type SyncState =
  "checking" | "offline" | "syncing" | "synced" | "pending" | "error";

interface SyncContextValue {
  state: SyncState;
  message: string | null;
  lastSyncedAt: string | null;
  online: boolean;
  retry: () => Promise<void>;
  resetAccountData: (
    clearOfflineResources: () => Promise<void>,
  ) => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({
  userId,
  children,
}: React.PropsWithChildren<{ userId: string }>) {
  const [state, setState] = useState<SyncState>("checking");
  const [message, setMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const { mutateAsync } = useMergeUserSyncData();
  const { mutateAsync: replaceRemote } = useReplaceUserSyncData();
  const inFlight = useRef(false);
  const resetInProgress = useRef(false);
  const cloudResetNeedsLocalRetry = useRef(false);
  const syncAgain = useRef(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncNow = useCallback(async () => {
    if (resetInProgress.current) return;
    if (cloudResetNeedsLocalRetry.current) {
      setState("error");
      setMessage(
        "Dữ liệu cloud đã xóa nhưng dữ liệu trên thiết bị chưa xóa xong. Hãy thử đặt lại lần nữa trước khi đồng bộ.",
      );
      return;
    }
    if (!userId || online !== true) {
      const localState = await getLocalSyncState().catch(() => ({
        pending: true,
      }));
      setState(localState.pending ? "pending" : "offline");
      return;
    }
    if (inFlight.current) {
      syncAgain.current = true;
      return;
    }
    inFlight.current = true;
    setState("syncing");
    setMessage(null);
    try {
      const local = await exportSyncSnapshot();
      const replacing = await hasPendingAccountReplacement();
      const remote = replacing
        ? await replaceRemote({ data: local.payload })
        : await mutateAsync({ data: local.payload });
      const remotePayload = {
        ...remote,
        revision: remote.revision ?? local.payload.revision,
        reviewStats: remote.reviewStats.map((stat) => ({
          ...stat,
          sessionCount: stat.sessionCount ?? 0,
        })),
        reviewSessions: (remote.reviewSessions ?? []).map((session) => ({
          ...session,
          completed: Boolean(session.completed),
        })),
        missionAwards: remote.missionAwards ?? [],
        missionChests: remote.missionChests ?? [],
        collectionCrafts: remote.collectionCrafts ?? [],
        collectionPieceSpends: remote.collectionPieceSpends ?? [],
      };
      const [current, replacementPending] = await Promise.all([
        getLocalSyncState(),
        hasPendingAccountReplacement(),
      ]);
      const replacementChangedDuringSync =
        (!replacing && replacementPending) ||
        (replacing && current.generation !== local.generation);
      if (replacementChangedDuringSync) {
        setState("pending");
        syncAgain.current = true;
      } else {
        await mergeSyncSnapshot(remotePayload);
        if (
          replacing &&
          !(await clearPendingAccountReplacement(local.generation))
        ) {
          syncAgain.current = true;
        }
        await markSyncClean(local.generation);
        const afterMerge = await getLocalSyncState();
        if (afterMerge.pending || syncAgain.current) {
          setState("pending");
          if (afterMerge.pending) syncAgain.current = true;
        } else {
          setState("synced");
          setLastSyncedAt(new Date().toISOString());
        }
      }
    } catch (error) {
      setState("error");
      setMessage("Chưa thể đồng bộ. Dữ liệu vẫn được giữ trên thiết bị.");
    } finally {
      inFlight.current = false;
      if (syncAgain.current && online === true) {
        syncAgain.current = false;
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(() => {
          void syncNow();
        }, 350);
      }
    }
  }, [mutateAsync, online, userId]);

  const resetAccountData = useCallback(
    async (clearOfflineResources: () => Promise<void>) => {
      if (!userId)
        throw new Error("Bạn cần đăng nhập để xóa dữ liệu tài khoản.");
      if (online !== true)
        throw new Error(
          "Cần kết nối Internet để xóa dữ liệu cloud. Dữ liệu trên thiết bị chưa bị thay đổi.",
        );
      if (inFlight.current || resetInProgress.current)
        throw new Error("Đang đồng bộ dữ liệu. Hãy đợi xong rồi thử lại.");

      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = null;
      resetInProgress.current = true;
      inFlight.current = true;
      syncAgain.current = false;
      setState("syncing");
      setMessage(null);
      let cloudCleared = false;
      let localCleared = false;
      try {
        await resetCloudFirst({
          replaceCloud: async () => {
            const local = await exportSyncSnapshot();
            const emptyPayload = {
              ...local.payload,
              words: [],
              deletedWords: [],
              courseProgress: [],
              courseSelections: [],
              reviewStats: [],
              reviewSessions: [],
              missionAwards: [],
              missionChests: [],
              collectionCrafts: [],
              collectionPieceSpends: [],
            };
            const remote = await replaceRemote({ data: emptyPayload });
            cloudCleared = true;
            cloudResetNeedsLocalRetry.current = true;
            return { revision: remote.revision ?? local.payload.revision + 1 };
          },
          clearLocal: async (revision) => {
            await clearLocalAccountAfterCloudReset(revision);
            localCleared = true;
            cloudResetNeedsLocalRetry.current = false;
          },
          clearOfflineResources,
        });
        setState("synced");
        setLastSyncedAt(new Date().toISOString());
        setMessage(null);
      } catch {
        const userMessage = !cloudCleared
          ? "Không thể xóa dữ liệu cloud. Dữ liệu trên thiết bị và tài nguyên offline vẫn được giữ nguyên."
          : !localCleared
            ? "Dữ liệu cloud đã xóa, nhưng dữ liệu trên thiết bị chưa được xóa hoàn tất. Hãy thử đặt lại lần nữa trước khi đồng bộ."
            : "Dữ liệu học đã xóa; chưa xóa hết tài nguyên offline. Hãy thử xóa lại các gói offline trong Cài đặt.";
        setState("error");
        setMessage(userMessage);
        throw new Error(userMessage);
      } finally {
        resetInProgress.current = false;
        inFlight.current = false;
        syncAgain.current = false;
      }
    },
    [online, replaceRemote, userId],
  );

  const refreshNetwork = useCallback(async () => {
    try {
      const network = await Network.getNetworkStateAsync();
      const connected =
        network.isConnected === true && network.isInternetReachable !== false;
      setOnline(connected);
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    void refreshNetwork();
    const subscription = Network.addNetworkStateListener((network) => {
      const connected =
        network.isConnected === true && network.isInternetReachable !== false;
      setOnline(connected);
    });
    return () => subscription.remove();
  }, [refreshNetwork]);

  useEffect(() => {
    if (online === true) {
      void syncNow();
      return;
    }
    if (online === false) {
      void getLocalSyncState()
        .then((local) => setState(local.pending ? "pending" : "offline"))
        .catch(() => setState("offline"));
    }
  }, [online, syncNow]);

  useEffect(() => {
    const unsubscribe = subscribeToSyncChanges(() => {
      if (resetInProgress.current || cloudResetNeedsLocalRetry.current) return;
      if (online !== true) {
        setState("pending");
        return;
      }
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => {
        void syncNow();
      }, 450);
    });
    const appState = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        void refreshNetwork();
        if (online === true) void syncNow();
      }
    });
    return () => {
      unsubscribe();
      appState.remove();
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [online, refreshNetwork, syncNow]);

  const value = useMemo<SyncContextValue>(
    () => ({
      state,
      message,
      lastSyncedAt,
      online: online === true,
      retry: syncNow,
      resetAccountData,
    }),
    [lastSyncedAt, message, online, resetAccountData, state, syncNow],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSyncStatus(): SyncContextValue {
  const value = useContext(SyncContext);
  if (!value)
    throw new Error("Tính năng đồng bộ chỉ khả dụng sau khi đăng nhập.");
  return value;
}

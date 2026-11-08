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

export type SyncState =
  "checking" | "offline" | "syncing" | "synced" | "pending" | "error";

interface SyncContextValue {
  state: SyncState;
  message: string | null;
  lastSyncedAt: string | null;
  retry: () => Promise<void>;
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
  const syncAgain = useRef(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncNow = useCallback(async () => {
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
      retry: syncNow,
    }),
    [lastSyncedAt, message, state, syncNow],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSyncStatus(): SyncContextValue {
  const value = useContext(SyncContext);
  if (!value)
    throw new Error("Tính năng đồng bộ chỉ khả dụng sau khi đăng nhập.");
  return value;
}

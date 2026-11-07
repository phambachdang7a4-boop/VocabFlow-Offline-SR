import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { readAppearance, writeAppearance } from '@/data/appearance';
import type { AppearanceMode } from '@/data/appearance';
export type { AppearanceMode } from '@/data/appearance';

interface AppearanceValue {
  mode: AppearanceMode;
  ready: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  setMode: (mode: AppearanceMode) => Promise<void>;
  retryLoad: () => Promise<void>;
}

const AppearanceContext = createContext<AppearanceValue | null>(null);

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [mode, setCurrentMode] = useState<AppearanceMode>('light');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const retryLoad = useCallback(async () => {
    if (busy.current || !mounted.current) return;
    busy.current = true; setLoading(true); setError(null);
    try {
      const stored = await readAppearance();
      if (mounted.current) setCurrentMode(stored);
    } catch {
      if (mounted.current) setError('Không thể đọc tùy chỉnh giao diện. Bạn có thể thử lại hoặc chọn giao diện mới.');
    } finally {
      busy.current = false;
      if (mounted.current) { setLoading(false); setReady(true); }
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void retryLoad();
    return () => { mounted.current = false; };
  }, [retryLoad]);

  const setMode = useCallback(async (next: AppearanceMode) => {
    if (busy.current || !mounted.current) return;
    busy.current = true; setSaving(true); setError(null);
    try {
      // Persist before changing the visible selection; failures never claim saved.
      await writeAppearance(next);
      if (mounted.current) setCurrentMode(next);
    } catch {
      if (mounted.current) setError('Không thể lưu giao diện. Lựa chọn cũ vẫn được giữ. Hãy thử lại.');
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  }, []);
  const value = useMemo(() => ({ mode, ready, loading, saving, error, setMode, retryLoad }),
    [mode, ready, loading, saving, error, setMode, retryLoad]);
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceValue {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error('Thiếu AppearanceProvider.');
  return value;
}

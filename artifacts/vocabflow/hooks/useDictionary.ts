import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { DictionaryDownloadConsentRequired, openDictionary } from '../data/dictionary';
import type { DictionaryStage } from '../domain/dictionary';

export function useDictionary() {
  const [stage, setStage] = useState<DictionaryStage>('checking');
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const request = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current += 1;
      busy.current = false;
    };
  }, []);

  const load = useCallback(async (allowDownload: boolean) => {
    if (!mounted.current || busy.current) return;
    const id = ++request.current;
    busy.current = true;
    setError(null);
    setStage('checking');
    const current = () => mounted.current && request.current === id;
    try {
      await openDictionary(value => { if (current()) setStage(value); }, { allowDownload });
      if (current()) setStage('ready');
    } catch (failure) {
      if (!current()) return;
      setStage('awaiting-consent');
      if (!(failure instanceof DictionaryDownloadConsentRequired)) {
        setError(failure instanceof Error ? failure.message : 'Không thể nạp từ điển.');
      }
    } finally {
      if (current()) busy.current = false;
    }
  }, []);

  // A button press starts its own attempt immediately. It must not depend on
  // a navigation focus effect running again after a state-counter update.
  const approveDownload = useCallback(() => { void load(true); }, [load]);
  const retry = useCallback(() => { void load(false); }, [load]);
  useFocusEffect(useCallback(() => { void load(false); }, [load]));
  return { ready: stage === 'ready', loading: stage !== 'ready' && stage !== 'awaiting-consent' && !error, stage, error, retry, approveDownload };
}

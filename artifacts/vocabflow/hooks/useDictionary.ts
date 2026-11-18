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

  const load = useCallback(async (allowDownload: boolean): Promise<boolean> => {
    if (!mounted.current || busy.current) return false;
    const id = ++request.current;
    busy.current = true;
    setError(null);
    setStage('checking');
    const current = () => mounted.current && request.current === id;
    try {
      await openDictionary(value => { if (current()) setStage(value); }, { allowDownload });
      if (current()) {
        setStage('ready');
        return true;
      }
      return false;
    } catch (failure) {
      if (!current()) return false;
      if (failure instanceof DictionaryDownloadConsentRequired) {
        setStage('awaiting-consent');
        if (allowDownload) setError(failure.message);
      } else {
        setStage('checking');
        setError(failure instanceof Error ? failure.message : 'Không thể nạp từ điển.');
      }
      return false;
    } finally {
      if (current()) busy.current = false;
    }
  }, []);

  // A button press starts its own attempt immediately. It must not depend on
  // a navigation focus effect running again after a state-counter update.
  const approveDownload = useCallback(() => load(true), [load]);
  const retry = useCallback(() => { void load(false); }, [load]);
  useFocusEffect(useCallback(() => { void load(false); }, [load]));
  return { ready: stage === 'ready', loading: stage !== 'ready' && stage !== 'awaiting-consent' && !error, stage, error, retry, approveDownload };
}

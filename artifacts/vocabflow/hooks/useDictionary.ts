import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { DictionaryDownloadConsentRequired, openDictionary } from '../data/dictionary';
import type { DictionaryStage } from '../domain/dictionary';

export function useDictionary() {
  const [attempt, setAttempt] = useState(0);
  const [stage, setStage] = useState<DictionaryStage>('checking');
  const [error, setError] = useState<string | null>(null);
  const approval = useRef(false);
  const busy = useRef(false);
  const retry = useCallback(() => {
    approval.current = false;
    setAttempt(value => value + 1);
  }, []);
  const approveDownload = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    approval.current = true;
    setAttempt(value => value + 1);
  }, []);
  useFocusEffect(useCallback(() => {
    let active = true;
    // Approval is consumed by exactly one attempt, never persisted or reused
    // on a later focus/retry. Cached dictionaries do not need permission.
    const allowDownload = approval.current;
    approval.current = false;
    setError(null);
    setStage('checking');
    void openDictionary(value => { if (active) setStage(value); }, { allowDownload }).then(
      () => { if (active) setStage('ready'); },
      failure => {
        if (!active) return;
        setStage('awaiting-consent');
        if (!(failure instanceof DictionaryDownloadConsentRequired)) {
          setError(failure instanceof Error ? failure.message : 'Không thể nạp từ điển.');
        }
      },
    ).finally(() => { if (active) busy.current = false; });
    return () => { active = false; busy.current = false; };
  }, [attempt]));
  return { ready: stage === 'ready', loading: stage !== 'ready' && stage !== 'awaiting-consent' && !error, stage, error, retry, approveDownload };
}

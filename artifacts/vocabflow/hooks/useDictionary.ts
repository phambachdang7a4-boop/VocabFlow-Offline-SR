import { useCallback, useEffect, useState } from 'react';
import { openDictionary } from '../data/dictionary';
import type { DictionaryStage } from '../domain/dictionary';

export function useDictionary() {
  const [attempt, setAttempt] = useState(0);
  const [stage, setStage] = useState<DictionaryStage>('checking');
  const [error, setError] = useState<string | null>(null);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    let active = true;
    setError(null);
    setStage('checking');
    void openDictionary(value => { if (active) setStage(value); }).then(
      () => { if (active) setStage('ready'); },
      failure => { if (active) setError(failure instanceof Error ? failure.message : 'Không thể nạp từ điển.'); },
    );
    return () => { active = false; };
  }, [attempt]);
  return { ready: stage === 'ready', loading: stage !== 'ready' && !error, stage, error, retry };
}

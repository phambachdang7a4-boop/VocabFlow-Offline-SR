import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

/** Only tick while this tab is visible and foregrounded. Refresh from the real
 * clock on resume/focus so a suspended browser never continues a stale timer. */
export function useReviewClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(useCallback(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
    };
    const change = (state: string) => {
      stop();
      if (state === 'active') {
        setNow(Date.now());
        timer = setInterval(() => setNow(Date.now()), 1000);
      }
    };
    change(AppState.currentState ?? 'active');
    const subscription = AppState.addEventListener('change', change);
    return () => { stop(); subscription.remove(); };
  }, []));
  return now;
}

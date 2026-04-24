import { useState, useEffect, useRef, useCallback } from 'react';

export function useTurnTimer(
  deadline: number | null | undefined,
  isMaestro: boolean,
  skipTurn: () => Promise<void>,
): number {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const hasAutoSkippedRef = useRef(false);
  const skippingRef = useRef(false);

  const stableSkip = useCallback(skipTurn, [skipTurn]);

  useEffect(() => {
    hasAutoSkippedRef.current = false;
    skippingRef.current = false;

    if (!deadline || deadline <= 0) {
      setSecondsLeft(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);

      if (remaining <= 0 && isMaestro && !hasAutoSkippedRef.current && !skippingRef.current) {
        hasAutoSkippedRef.current = true;
        skippingRef.current = true;
        stableSkip().finally(() => { skippingRef.current = false; });
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline, isMaestro, stableSkip]);

  return secondsLeft;
}

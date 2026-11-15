import { useEffect } from 'react';
import { useGameStore } from './useGameStore';

/**
 * A minute is plenty: the only boundary the tick watches is the operational
 * day, which moves once per day (US-05 CA-02).
 */
export const GAME_LOOP_INTERVAL_MS = 60_000;

export function useGameLoop(intervalMs = GAME_LOOP_INTERVAL_MS): void {
  const tick = useGameStore((store) => store.tick);
  const hydrated = useGameStore((store) => store.state !== null);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    // Ticking immediately after mount covers a reload that spanned a day
    // boundary; the interval then keeps the city honest while it stays open.
    void tick();
    const handle = window.setInterval(() => void tick(), intervalMs);

    return () => window.clearInterval(handle);
  }, [tick, hydrated, intervalMs]);
}

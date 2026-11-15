import { createDayZeroState } from '../core/entities/dayZero';
import type { StoragePort } from '../core/ports/StoragePort';
import type { GameState, TimestampMs } from '../core/types';

export async function hydrateGameState(storage: StoragePort, now: TimestampMs): Promise<GameState> {
  const saved = await storage.loadState();

  if (saved !== null) {
    return saved;
  }

  const dayZeroState = createDayZeroState(now);
  await storage.saveState(dayZeroState);

  return dayZeroState;
}

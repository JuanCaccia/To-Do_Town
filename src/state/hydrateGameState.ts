import { createDayZeroState } from '../core/entities/dayZero';
import type { StoragePort } from '../core/ports/StoragePort';
import type { GameState, TimestampMs } from '../core/types';

export async function hydrateGameState(storage: StoragePort, now: TimestampMs): Promise<GameState> {
  const saved = await storage.loadState();

  if (saved !== null) {
    return normalizeSavedState(saved);
  }

  const dayZeroState = createDayZeroState(now);
  await storage.saveState(dayZeroState);

  return dayZeroState;
}

/**
 * Completa en memoria los campos que un snapshot anterior no tenía.
 *
 * No es una migración y por eso no persiste: `loadState` es un cast sin schema,
 * así que un `GameState` guardado antes de que existiera un campo llega sin él.
 * Sin este relleno, `{ ...undefined }` en una escritura pasa en silencio y el
 * fallo aparece recién en la primera lectura. El versionado real es US-12.
 */
function normalizeSavedState(saved: GameState): GameState {
  return { ...saved, focusSessions: saved.focusSessions ?? {} };
}

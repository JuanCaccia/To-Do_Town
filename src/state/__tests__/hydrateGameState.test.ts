import { describe, expect, it } from 'vitest';
import { createDayZeroState } from '../../core/entities/dayZero';
import type { StoragePort } from '../../core/ports/StoragePort';
import type { GameState, TimestampMs } from '../../core/types';
import { hydrateGameState } from '../hydrateGameState';

const NOW: TimestampMs = 1_700_000_000_000;

function createInMemoryStorage(initial: GameState | null) {
  let snapshot = initial;
  const saved: GameState[] = [];

  const storage: StoragePort = {
    loadState: async () => snapshot,
    saveState: async (next) => {
      snapshot = next;
      saved.push(next);
    },
  };

  return { storage, saved };
}

describe('hydrateGameState — US-01 CA-03: hidratación en arranque', () => {
  it('devuelve el estado guardado intacto, sin recrearlo ni volver a persistirlo', async () => {
    const stored: GameState = {
      ...createDayZeroState(NOW),
      lastTickAt: NOW - 60_000,
      lastUserInteractionAt: NOW - 60_000,
    };
    const { storage, saved } = createInMemoryStorage(stored);

    const hydrated = await hydrateGameState(storage, NOW);

    expect(hydrated).toEqual(stored);
    expect(saved).toHaveLength(0);
  });

  it('si el almacén está vacío, crea el Día Cero y lo persiste antes de retornarlo', async () => {
    const { storage, saved } = createInMemoryStorage(null);

    const hydrated = await hydrateGameState(storage, NOW);

    expect(hydrated).toEqual(createDayZeroState(NOW));
    expect(saved).toEqual([hydrated]);
    expect(await storage.loadState()).toEqual(hydrated);
  });
});

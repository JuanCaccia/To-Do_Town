import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { parseBackupFile } from '../../adapters/backup/backupSchema';
import { CryptoIdAdapter } from '../../adapters/id/CryptoIdAdapter';
import { IndexedDBAdapter } from '../../adapters/storage/IndexedDBAdapter';
import { createDayZeroState } from '../../core/entities/dayZero';
import type { GameState } from '../../core/types';
import { createGameStore } from '../useGameStore';

const NOW = 1_700_000_000_000;

function resetIndexedDB(): void {
  globalThis.indexedDB = new IDBFactory();
}

/**
 * Snapshot real anterior a US-05: el día operativo del Acueducto vivía dentro
 * de `globals.aqueduct` y hoy es `GameState.lastOperationalDay`. `loadState` es
 * un cast sin schema, así que ese campo llega vivo a memoria.
 */
function withLegacyAqueductDay(state: GameState): GameState {
  return {
    ...state,
    globals: {
      ...state.globals,
      aqueduct: {
        ...state.globals.aqueduct,
        lastOperationalDay: state.lastOperationalDay,
      },
    },
  } as GameState;
}

describe('US-12 CA-04: un snapshot viejo no puede romper su propio respaldo', () => {
  beforeEach(resetIndexedDB);

  it('exporta un archivo que el propio importador acepta tras hidratar un snapshot legado', async () => {
    const adapter = new IndexedDBAdapter();
    const store = createGameStore({
      storage: adapter,
      unitOfWork: adapter,
      idPort: new CryptoIdAdapter(),
      now: () => NOW,
    });

    await adapter.saveState(withLegacyAqueductDay(createDayZeroState(NOW)));
    await store.getState().hydrate(NOW);

    const file = await store.getState().exportBackup();
    const validation = parseBackupFile(JSON.parse(JSON.stringify(file)));

    expect(validation).toEqual({ ok: true, backup: expect.anything() });
  });

  it('descarta el campo legado del estado hidratado', async () => {
    const adapter = new IndexedDBAdapter();
    const store = createGameStore({
      storage: adapter,
      unitOfWork: adapter,
      idPort: new CryptoIdAdapter(),
      now: () => NOW,
    });

    await adapter.saveState(withLegacyAqueductDay(createDayZeroState(NOW)));
    await store.getState().hydrate(NOW);

    const aqueduct = store.getState().state?.globals.aqueduct;

    expect(aqueduct).toBeDefined();
    expect(aqueduct !== undefined && 'lastOperationalDay' in aqueduct).toBe(false);
  });

  /**
   * Todos los campos requeridos que se agregaron al tipo después de que existía
   * una ciudad: US-03 (`houses[].createdAt`), US-04 (`tasks[].createdAt` y
   * `completedAt`), US-06 (`habits[].lastFrequencyChangeAt`) y US-11
   * (`reactivationPenaltyUntil`). Un snapshot de esa época no los tiene.
   */
  function withoutLaterFields(state: GameState): GameState {
    const neighborhoods = Object.fromEntries(
      Object.entries(state.neighborhoods).map(([id, neighborhood]) => {
        const {
          reactivationPenaltyUntil: _penalty,
          dailyTasksCompletedCount: _daily,
          decorations: _decorations,
          ...rest
        } = neighborhood;
        const blocks = rest.blocks.map((block) => ({
          ...block,
          houses: block.houses.map((house) => {
            const { createdAt: _createdAt, ...houseRest } = house;

            return houseRest;
          }),
        }));

        return [id, { ...rest, blocks }];
      }),
    );

    const habits = Object.fromEntries(
      Object.entries(state.habits).map(([id, habit]) => {
        const { lastFrequencyChangeAt: _frequency, ...rest } = habit;

        return [id, rest];
      }),
    );

    const tasks = Object.fromEntries(
      Object.entries(state.tasks).map(([id, task]) => {
        const { createdAt: _createdAt, completedAt: _completedAt, ...rest } = task;

        return [id, rest];
      }),
    );

    return { ...state, neighborhoods, habits, tasks } as GameState;
  }

  it('hidrata y exporta un snapshot al que le faltan los campos agregados después', async () => {
    const adapter = new IndexedDBAdapter();
    const store = createGameStore({
      storage: adapter,
      unitOfWork: adapter,
      idPort: new CryptoIdAdapter(),
      now: () => NOW,
    });

    await adapter.saveState(withoutLaterFields(createDayZeroState(NOW)));
    await store.getState().hydrate(NOW);

    const state = store.getState().state;
    const habit = Object.values(state?.habits ?? {})[0];
    const task = Object.values(state?.tasks ?? {})[0];
    const neighborhood = Object.values(state?.neighborhoods ?? {})[0];
    const house = neighborhood?.blocks[0]?.houses[0];

    expect(habit !== undefined && 'lastFrequencyChangeAt' in habit).toBe(true);
    expect(task !== undefined && 'createdAt' in task).toBe(true);
    expect(task !== undefined && 'completedAt' in task).toBe(true);
    expect(neighborhood !== undefined && 'reactivationPenaltyUntil' in neighborhood).toBe(true);
    expect(neighborhood?.dailyTasksCompletedCount).toBe(0);
    expect(neighborhood?.decorations).toEqual([]);
    expect(house !== undefined && 'createdAt' in house).toBe(true);

    const file = await store.getState().exportBackup();

    expect(parseBackupFile(JSON.parse(JSON.stringify(file))).ok).toBe(true);
  });

  /**
   * Las sesiones de foco viejas no guardaban `presetId`. Ninguna regla lo lee:
   * sólo se escribe al registrar. Un sentinela alcanza y no inventa un preset.
   */
  it('hidrata una sesión de foco sin presetId y la exporta', async () => {
    const adapter = new IndexedDBAdapter();
    const store = createGameStore({
      storage: adapter,
      unitOfWork: adapter,
      idPort: new CryptoIdAdapter(),
      now: () => NOW,
    });

    const base = createDayZeroState(NOW);
    const legacySession = {
      neighborhoodId: 'tutorial-neighborhood-id',
      startedAt: NOW - 1_500_000,
      endedAt: NOW - 1_000,
      focusMinutes: 25,
      outcome: 'COMPLETED',
    };

    await adapter.saveState({
      ...base,
      focusSessions: { 'session-legacy': legacySession },
    } as unknown as GameState);
    await store.getState().hydrate(NOW);

    const session = store.getState().state?.focusSessions['session-legacy'];

    expect(session?.presetId).toBe('unknown');

    const file = await store.getState().exportBackup();

    expect(parseBackupFile(JSON.parse(JSON.stringify(file))).ok).toBe(true);
  });
});

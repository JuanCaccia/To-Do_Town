import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { CryptoIdAdapter } from '../../adapters/id/CryptoIdAdapter';
import { buildBackupFile } from '../../adapters/backup/backupSchema';
import { IndexedDBAdapter } from '../../adapters/storage/IndexedDBAdapter';
import { createDayZeroState } from '../../core/entities/dayZero';
import type { GameState } from '../../core/types';
import { createGameStore } from '../useGameStore';

const NOW = 1_700_000_000_000;
const COMPLEX_TASK = 'tutorial-complex-task-id';

function resetIndexedDB(): void {
  globalThis.indexedDB = new IDBFactory();
}

/** Hábito semilla en Apagón: sin producción pasiva el estado es predecible. */
function seedWithoutProduction(at: number): GameState {
  const state = createDayZeroState(at);
  const habit = state.habits['tutorial-habit-id'];

  return habit === undefined
    ? state
    : {
        ...state,
        habits: { ...state.habits, 'tutorial-habit-id': { ...habit, lastCompletedAt: 0 } },
      };
}

async function createHydratedStore(clock: { now: number }) {
  const adapter = new IndexedDBAdapter();
  const store = createGameStore({
    storage: adapter,
    unitOfWork: adapter,
    idPort: new CryptoIdAdapter(),
    now: () => clock.now,
  });

  await adapter.saveState(seedWithoutProduction(NOW));
  await store.getState().hydrate(NOW);

  return { store, adapter };
}

describe('useGameStore — US-12 CA-04: exportar e importar el respaldo', () => {
  beforeEach(resetIndexedDB);

  it('exporta el estado vivo junto con el historial de eventos', async () => {
    const clock = { now: NOW };
    const { store } = await createHydratedStore(clock);

    await store.getState().completeTask(COMPLEX_TASK);

    const file = await store.getState().exportBackup();

    expect(file.gameState).toEqual(store.getState().state);
    expect(file.domainEvents).toHaveLength(1);
    expect(file.domainEvents[0]?.type).toBe('TASK_COMPLETED');
    expect(file.format).toBe('todotown');
  });

  it('rechaza un respaldo inválido sin tocar la ciudad actual', async () => {
    const clock = { now: NOW };
    const { store } = await createHydratedStore(clock);
    const before = store.getState().state;

    const result = await store.getState().importBackup({ format: 'todotown', version: 1 });

    expect(result.status).toBe('REJECTED');
    expect(store.getState().state).toEqual(before);
  });

  it('reemplaza la ciudad y vacía la cola de reversibilidad al importar', async () => {
    const clock = { now: NOW };
    const { store, adapter } = await createHydratedStore(clock);

    await store.getState().completeTask(COMPLEX_TASK);
    expect(store.getState().undoQueue).toHaveLength(1);

    const restored = seedWithoutProduction(NOW - 86_400_000);
    const file = buildBackupFile(restored, [], NOW);

    const result = await store.getState().importBackup(JSON.parse(JSON.stringify(file)));

    expect(result.status).toBe('IMPORTED');
    expect(store.getState().state).toEqual(restored);
    // Una instantánea apunta a la ciudad anterior: deshacer después de importar
    // resucitaría el estado que el usuario acaba de reemplazar.
    expect(store.getState().undoQueue).toEqual([]);
    expect(await new IndexedDBAdapter().loadState()).toEqual(restored);
    expect(await adapter.listEvents()).toEqual([]);
  });
});

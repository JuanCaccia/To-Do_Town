import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { CryptoIdAdapter } from '../../adapters/id/CryptoIdAdapter';
import { IndexedDBAdapter } from '../../adapters/storage/IndexedDBAdapter';
import { createDayZeroState } from '../../core/entities/dayZero';
import { UNDO_WINDOW_MS } from '../../core/rules/undoSnapshot';
import type { GameState } from '../../core/types';
import { createGameStore } from '../useGameStore';

const NOW = 1_700_000_000_000;
const LATER = NOW + 60_000;
const COMPLEX_TASK = 'tutorial-complex-task-id';
const TUTORIAL_HABIT_ID = 'tutorial-habit-id';

function resetIndexedDB(): void {
  globalThis.indexedDB = new IDBFactory();
}

/**
 * Día Cero con el hábito semilla en Apagón: sin esto cada tick devenga
 * producción pasiva y muta el estado por diseño, ensuciando las aserciones.
 */
function seedWithoutProduction(at: number): GameState {
  const state = createDayZeroState(at);
  const habit = state.habits[TUTORIAL_HABIT_ID];

  return habit === undefined
    ? state
    : {
        ...state,
        habits: { ...state.habits, [TUTORIAL_HABIT_ID]: { ...habit, lastCompletedAt: 0 } },
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

describe('useGameStore — US-12 CA-02: cola de reversibilidad', () => {
  beforeEach(resetIndexedDB);

  it('registra una instantánea al completar una tarea, con su descripción y TTL', async () => {
    const clock = { now: LATER };
    const { store } = await createHydratedStore(clock);

    await store.getState().completeTask(COMPLEX_TASK);

    const queue = store.getState().undoQueue;

    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      description: 'Tarea completada',
      createdAt: LATER,
      expiresAt: LATER + UNDO_WINDOW_MS,
    });
  });

  it('no registra instantáneas para los eventos del sistema', async () => {
    const clock = { now: LATER };
    const { store } = await createHydratedStore(clock);

    await store.getState().tick();

    expect(store.getState().undoQueue).toHaveLength(0);
  });

  it('deshace la última acción, emite ACTION_UNDONE y vacía la cola', async () => {
    const clock = { now: LATER };
    const { store, adapter } = await createHydratedStore(clock);
    const beforeTask = store.getState().state;

    await store.getState().completeTask(COMPLEX_TASK);
    expect(store.getState().state).not.toEqual(beforeTask);

    const result = await store.getState().undoLastAction();

    expect(result).toEqual({ status: 'UNDONE' });
    expect(store.getState().state).toEqual(beforeTask);
    expect(store.getState().undoQueue).toHaveLength(0);

    // `getAll()` ordena por `eventId` (UUID), no por inserción: se busca por tipo.
    const events = await adapter.listPendingEvents();
    const undone = events.filter((event) => event.type === 'ACTION_UNDONE');

    expect(undone).toHaveLength(1);
    expect(undone[0]).toMatchObject({
      syncedAt: null,
      payload: { actionId: expect.any(String), description: 'Tarea completada' },
    });
  });

  it('rechaza la reversión vencida sin tocar el estado ni emitir evento', async () => {
    const clock = { now: LATER };
    const { store, adapter } = await createHydratedStore(clock);

    await store.getState().completeTask(COMPLEX_TASK);

    const afterCompletion = store.getState().state;
    const eventsBefore = await adapter.listPendingEvents();

    clock.now = LATER + UNDO_WINDOW_MS + 1;

    const result = await store.getState().undoLastAction();

    expect(result).toEqual({ status: 'REJECTED', reason: 'UNDO_WINDOW_EXPIRED' });
    expect(store.getState().state).toEqual(afterCompletion);
    expect(await adapter.listPendingEvents()).toEqual(eventsBefore);
  });

  it('purga las instantáneas vencidas en el tick', async () => {
    const clock = { now: LATER };
    const { store } = await createHydratedStore(clock);

    await store.getState().completeTask(COMPLEX_TASK);
    expect(store.getState().undoQueue).toHaveLength(1);

    clock.now = LATER + UNDO_WINDOW_MS + 1;
    await store.getState().tick();

    expect(store.getState().undoQueue).toHaveLength(0);
  });

  it('rechaza el deshacer cuando no hay nada en la cola', async () => {
    const clock = { now: LATER };
    const { store } = await createHydratedStore(clock);

    expect(await store.getState().undoLastAction()).toEqual({
      status: 'REJECTED',
      reason: 'NOTHING_TO_UNDO',
    });
  });

  it('descarta la última oportunidad sin deshacer ni tocar el estado', async () => {
    const clock = { now: LATER };
    const { store, adapter } = await createHydratedStore(clock);

    await store.getState().completeTask(COMPLEX_TASK);
    await store.getState().registerWater(1);

    const afterWater = store.getState().state;
    const eventsBefore = await adapter.listPendingEvents();

    store.getState().dismissUndo();

    expect(store.getState().undoQueue).toHaveLength(1);
    expect(store.getState().undoQueue[0]?.description).toBe('Tarea completada');
    expect(store.getState().state).toEqual(afterWater);
    expect(await adapter.listPendingEvents()).toEqual(eventsBefore);
  });
});

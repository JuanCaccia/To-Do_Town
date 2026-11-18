import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { CryptoIdAdapter } from '../../adapters/id/CryptoIdAdapter';
import { IndexedDBAdapter } from '../../adapters/storage/IndexedDBAdapter';
import { createDayZeroState } from '../../core/entities/dayZero';
import type { GameState } from '../../core/types';
import { createGameStore } from '../useGameStore';

const NOW = 1_700_000_000_000;
const LATER = NOW + 60_000;
const TUTORIAL_NEIGHBORHOOD_ID = 'tutorial-neighborhood-id';

function resetIndexedDB(): void {
  globalThis.indexedDB = new IDBFactory();
}

/** El parser toma un solo token como nombre de barrio, así que el fixture se llama `gym`. */
function stateWithGym(at: number): GameState {
  const state = createDayZeroState(at);
  const tutorial = state.neighborhoods[TUTORIAL_NEIGHBORHOOD_ID];

  if (tutorial === undefined) throw new Error('el Día Cero debería traer el barrio tutorial');

  return {
    ...state,
    neighborhoods: {
      ...state.neighborhoods,
      [TUTORIAL_NEIGHBORHOOD_ID]: { ...tutorial, name: 'gym' },
    },
  };
}

async function createHydratedStore(seed: GameState = stateWithGym(NOW)) {
  const adapter = new IndexedDBAdapter();
  const store = createGameStore({
    storage: adapter,
    unitOfWork: adapter,
    idPort: new CryptoIdAdapter(),
    now: () => LATER,
  });

  await adapter.saveState(seed);
  await store.getState().hydrate(NOW);

  return store;
}

describe('useGameStore — US-12 CA-01: despacho de comandos rápidos', () => {
  beforeEach(resetIndexedDB);

  it('ejecuta agua 1 sobre el Acueducto', async () => {
    const store = await createHydratedStore();
    const before = store.getState().state;

    const result = await store.getState().runCommand('agua 1');

    expect(result).toEqual({ status: 'EXECUTED' });
    expect(store.getState().state?.globals.aqueduct.dailyLiters).toBe(
      (before?.globals.aqueduct.dailyLiters ?? 0) + 1,
    );
  });

  it('ejecuta leer 25 sobre la Gran Biblioteca', async () => {
    const store = await createHydratedStore();
    const before = store.getState().state;

    await store.getState().runCommand('leer 25');

    expect(store.getState().state?.globals.library.totalPagesRead).toBe(
      (before?.globals.library.totalPagesRead ?? 0) + 25,
    );
  });

  it('crea la tarea en el barrio nombrado con su peso', async () => {
    const store = await createHydratedStore();

    const result = await store.getState().runCommand('t gym comprar suplemento !25');

    expect(result).toEqual({ status: 'EXECUTED' });

    const created = Object.values(store.getState().state?.tasks ?? {}).find(
      (task) => task.title === 'comprar suplemento',
    );

    expect(created).toMatchObject({
      neighborhoodId: TUTORIAL_NEIGHBORHOOD_ID,
      weight: 'STANDARD',
      boardStatus: 'MASTER_PLAN',
    });
  });

  it('rechaza el alta de tarea cuando el barrio no existe y no crea nada', async () => {
    const store = await createHydratedStore();
    const taskCount = Object.keys(store.getState().state?.tasks ?? {}).length;

    const result = await store.getState().runCommand('t nonexistent comprar suplemento !25');

    expect(result).toEqual({ status: 'REJECTED', reason: 'NEIGHBORHOOD_NOT_FOUND' });
    expect(Object.keys(store.getState().state?.tasks ?? {})).toHaveLength(taskCount);
  });

  it('propaga el motivo de rechazo del parser sin tocar el estado', async () => {
    const store = await createHydratedStore();
    const before = store.getState().state;

    const result = await store.getState().runCommand('hacer magia');

    expect(result).toEqual({ status: 'REJECTED', reason: 'UNKNOWN_COMMAND' });
    expect(store.getState().state).toBe(before);
  });

  it('deja una solicitud de foco de un solo uso cuando el preset existe', async () => {
    const store = await createHydratedStore();
    const presetId = store
      .getState()
      .state?.config.pomodoroPresets.find((preset) => preset.workMinutes === 50)?.id;

    const result = await store.getState().runCommand('pomo gym 50');

    expect(result).toEqual({ status: 'EXECUTED' });
    expect(store.getState().focusRequest).toEqual({
      neighborhoodId: TUTORIAL_NEIGHBORHOOD_ID,
      presetId,
    });

    expect(store.getState().consumeFocusRequest()).toEqual({
      neighborhoodId: TUTORIAL_NEIGHBORHOOD_ID,
      presetId,
    });
    expect(store.getState().focusRequest).toBeNull();
  });

  it('rechaza un foco cuyos minutos no coinciden con ningún preset', async () => {
    const store = await createHydratedStore();

    const result = await store.getState().runCommand('pomo gym 37');

    expect(result).toEqual({ status: 'REJECTED', reason: 'NO_MATCHING_PRESET' });
    expect(store.getState().focusRequest).toBeNull();
  });
});

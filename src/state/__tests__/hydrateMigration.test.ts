import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { CryptoIdAdapter } from '../../adapters/id/CryptoIdAdapter';
import { IndexedDBAdapter } from '../../adapters/storage/IndexedDBAdapter';
import { createDayZeroState } from '../../core/entities/dayZero';
import type { GameState } from '../../core/types';
import { createGameStore } from '../useGameStore';

const NOW = 1_700_000_000_000;
const TUTORIAL_ID = 'tutorial-neighborhood-id';

function resetIndexedDB(): void {
  globalThis.indexedDB = new IDBFactory();
}

/**
 * Los dos fantasmas que ya aparecieron en snapshots reales: `creditedCoins`
 * (pre-US-07) y `aqueduct.lastOperationalDay` (pre-US-05). El cast de
 * `loadState` los deja pasar hasta memoria.
 */
function withGhostFields(state: GameState): GameState {
  const neighborhood = state.neighborhoods[TUTORIAL_ID];

  if (neighborhood === undefined) {
    throw new Error('fixture rota');
  }

  return {
    ...state,
    globals: {
      ...state.globals,
      aqueduct: { ...state.globals.aqueduct, lastOperationalDay: state.lastOperationalDay },
    },
    neighborhoods: {
      ...state.neighborhoods,
      [TUTORIAL_ID]: { ...neighborhood, creditedCoins: 12.5 },
    },
  } as GameState;
}

function createStore(adapter: IndexedDBAdapter) {
  return createGameStore({
    storage: adapter,
    unitOfWork: adapter,
    idPort: new CryptoIdAdapter(),
    now: () => NOW,
  });
}

/**
 * MIG-01: la hidratación es la puerta de entrada del estado persistido. Hasta
 * ahora sólo rellenaba campos faltantes; los que el tipo ya no declara seguían
 * vivos en memoria y llegaban intactos al respaldo.
 */
describe('MIG-01: el snapshot hidratado se proyecta sobre el esquema vigente', () => {
  beforeEach(resetIndexedDB);

  it('descarta los campos que el tipo ya no declara', async () => {
    const adapter = new IndexedDBAdapter();
    const store = createStore(adapter);

    await adapter.saveState(withGhostFields(createDayZeroState(NOW)));
    await store.getState().hydrate(NOW);

    const state = store.getState().state;
    const neighborhood = state?.neighborhoods[TUTORIAL_ID];

    expect(state).not.toBeNull();
    expect(neighborhood !== undefined && 'creditedCoins' in neighborhood).toBe(false);
    expect('lastOperationalDay' in (state?.globals.aqueduct ?? {})).toBe(false);
  });

  it('no toca los datos legítimos de la ciudad', async () => {
    const adapter = new IndexedDBAdapter();
    const store = createStore(adapter);
    const original = createDayZeroState(NOW);

    await adapter.saveState(withGhostFields(original));
    await store.getState().hydrate(NOW);

    const neighborhood = store.getState().state?.neighborhoods[TUTORIAL_ID];

    expect(neighborhood?.treasuryCoins).toBe(original.neighborhoods[TUTORIAL_ID]?.treasuryCoins);
    expect(neighborhood?.name).toBe(original.neighborhoods[TUTORIAL_ID]?.name);
    expect(store.getState().state?.globals.aqueduct.dailyTargetLiters).toBe(
      original.globals.aqueduct.dailyTargetLiters,
    );
  });

  it('hidrata igual cuando el snapshot no se puede proyectar, sin bloquear el arranque', async () => {
    const adapter = new IndexedDBAdapter();
    const store = createStore(adapter);

    // Una cuadra sin `gridPosition` no es un `GameState` válido por ningún
    // esquema, pero bloquear el arranque por eso dejaría al usuario sin ciudad.
    const broken = createDayZeroState(NOW);
    const neighborhood = broken.neighborhoods[TUTORIAL_ID];
    const blocks = neighborhood?.blocks ?? [];

    await adapter.saveState({
      ...broken,
      neighborhoods: {
        ...broken.neighborhoods,
        [TUTORIAL_ID]: {
          ...neighborhood,
          blocks: blocks.map((block) => {
            const { gridPosition: _position, ...rest } = block;

            return rest;
          }),
        },
      },
    } as unknown as GameState);
    await store.getState().hydrate(NOW);

    expect(store.getState().state).not.toBeNull();
  });
});

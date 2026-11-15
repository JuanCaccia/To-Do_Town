import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDayZeroState } from '../../../core/entities/dayZero';
import type { StoragePort } from '../../../core/ports/StoragePort';
import type { UnitOfWorkPort } from '../../../core/ports/UnitOfWorkPort';
import { IndexedDBAdapter } from '../IndexedDBAdapter';

const NOW = 1_700_000_000_000;

const EVENT = {
  eventId: 'evt-0001',
  timestamp: NOW,
  type: 'TASK_COMPLETED',
  payload: { taskId: 'tutorial-complex-task-id' },
};

function resetIndexedDB(): void {
  globalThis.indexedDB = new IDBFactory();
}

describe('IndexedDBAdapter — US-01 CA-02: almacenes de objetos separados', () => {
  beforeEach(resetIndexedDB);

  it('crea los object stores game_state y domain_events al inicializar la conexión', async () => {
    const adapter = new IndexedDBAdapter();

    const db = await adapter.open();
    const stores = Array.from(db.objectStoreNames).sort();
    db.close();

    expect(stores).toEqual(['domain_events', 'game_state']);
  });

  it('asegura la existencia de ambos almacenes al reabrir una base ya creada', async () => {
    await (await new IndexedDBAdapter().open()).close();

    const db = await new IndexedDBAdapter().open();
    const stores = Array.from(db.objectStoreNames).sort();
    db.close();

    expect(stores).toEqual(['domain_events', 'game_state']);
  });
});

describe('IndexedDBAdapter — US-01 CA-03: snapshot en game_state', () => {
  beforeEach(resetIndexedDB);

  it('devuelve null cuando no hay ningún estado guardado', async () => {
    const adapter: StoragePort = new IndexedDBAdapter();

    expect(await adapter.loadState()).toBeNull();
  });

  it('persiste el snapshot y lo recupera intacto desde otra conexión', async () => {
    const state = createDayZeroState(NOW);

    await new IndexedDBAdapter().saveState(state);
    const reloaded = await new IndexedDBAdapter().loadState();

    expect(reloaded).toEqual(state);
  });
});

describe('IndexedDBAdapter — US-01 CA-04: guardado transaccional con emisión al Outbox', () => {
  beforeEach(resetIndexedDB);

  it('sobrescribe el snapshot y anexa el evento adjuntando identidad del dispositivo y syncedAt', async () => {
    const adapter: UnitOfWorkPort = new IndexedDBAdapter();
    const nextState = { ...createDayZeroState(NOW), lastTickAt: NOW + 1_000 };

    const record = await adapter.commit(nextState, EVENT);

    expect(record).toEqual({
      ...EVENT,
      userId: 'local-owner',
      deviceId: 'desktop',
      syncedAt: null,
    });

    const reader = new IndexedDBAdapter();
    expect(await reader.loadState()).toEqual(nextState);
    expect(await reader.listPendingEvents()).toEqual([record]);
  });

  it('no persiste el snapshot si el evento no puede insertarse (misma transacción)', async () => {
    const initialState = createDayZeroState(NOW);
    const nextState = { ...initialState, lastTickAt: NOW + 1_000 };

    await new IndexedDBAdapter().commit(initialState, EVENT);

    await expect(new IndexedDBAdapter().commit(nextState, EVENT)).rejects.toThrow();

    const reader = new IndexedDBAdapter();
    expect(await reader.loadState()).toEqual(initialState);
    expect(await reader.listPendingEvents()).toHaveLength(1);
  });
});

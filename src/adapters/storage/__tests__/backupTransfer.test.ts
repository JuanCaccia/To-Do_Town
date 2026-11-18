import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDayZeroState } from '../../../core/entities/dayZero';
import type { DomainEventRecord } from '../../../core/types';
import { IndexedDBAdapter } from '../IndexedDBAdapter';

const NOW = 1_700_000_000_000;

const SYNCED_EVENT: DomainEventRecord = {
  eventId: 'evt-viejo',
  userId: 'local-owner',
  deviceId: 'desktop',
  timestamp: NOW - 1_000,
  type: 'TASK_COMPLETED',
  payload: { taskId: 'tarea-vieja' },
  syncedAt: NOW - 500,
};

function resetIndexedDB(): void {
  globalThis.indexedDB = new IDBFactory();
}

describe('US-12 CA-04: reemplazo atómico de los almacenes', () => {
  beforeEach(resetIndexedDB);

  it('reemplaza game_state y domain_events con el contenido del respaldo', async () => {
    const adapter = new IndexedDBAdapter();
    const original = createDayZeroState(NOW);

    await adapter.saveState(original);
    await adapter.commit(original, {
      eventId: 'evt-descartado',
      timestamp: NOW,
      type: 'WATER_REGISTERED',
      payload: { amount: 1 },
    });

    const restored = createDayZeroState(NOW + 60_000);

    await adapter.replaceAll({ gameState: restored, domainEvents: [SYNCED_EVENT] });

    const reloaded = new IndexedDBAdapter();

    expect(await reloaded.loadState()).toEqual(restored);
    expect(await reloaded.listEvents()).toEqual([SYNCED_EVENT]);
  });

  it('no deja eventos del estado anterior después de importar', async () => {
    const adapter = new IndexedDBAdapter();
    const state = createDayZeroState(NOW);

    await adapter.commit(state, {
      eventId: 'evt-descartado',
      timestamp: NOW,
      type: 'WATER_REGISTERED',
      payload: { amount: 1 },
    });

    await adapter.replaceAll({ gameState: state, domainEvents: [] });

    expect(await adapter.listEvents()).toEqual([]);
  });

  it('lista el historial completo, no sólo lo pendiente de sincronizar', async () => {
    const adapter = new IndexedDBAdapter();
    const state = createDayZeroState(NOW);

    await adapter.replaceAll({ gameState: state, domainEvents: [SYNCED_EVENT] });

    expect(await adapter.listEvents()).toEqual([SYNCED_EVENT]);
    expect(await adapter.listPendingEvents()).toEqual([]);
  });
});

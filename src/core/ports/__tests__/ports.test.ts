import { describe, expect, it } from 'vitest';
import { createDayZeroState } from '../../entities/dayZero';
import type { DomainEventRecord, GameState } from '../../types';
import { createDomainEvent } from '../EventLogPort';
import type { EventLogPort } from '../EventLogPort';
import type { StoragePort } from '../StoragePort';

const EVENT_INPUT = {
  eventId: 'evt-0001',
  userId: 'local-owner',
  deviceId: 'desktop',
  timestamp: 1_700_000_000_000,
  type: 'HABIT_CHECKED_IN',
  payload: { habitId: 'tutorial-habit-id', level: 1 },
};

function createInMemoryAdapter(): StoragePort & EventLogPort {
  let snapshot: GameState | null = null;
  const events: DomainEventRecord[] = [];

  return {
    saveState: async (next) => {
      snapshot = next;
    },
    loadState: async () => snapshot,
    appendEvent: async (event) => {
      events.push(event);
    },
    listPendingEvents: async () => events.filter((event) => event.syncedAt === null),
  };
}

describe('createDomainEvent — US-01 CA-01: registro de evento de dominio', () => {
  it('estampa los siete campos exigidos con syncedAt en null (patrón Outbox)', () => {
    const event = createDomainEvent(EVENT_INPUT);

    expect(event).toEqual({ ...EVENT_INPUT, syncedAt: null });
    expect(Object.keys(event).sort()).toEqual([
      'deviceId',
      'eventId',
      'payload',
      'syncedAt',
      'timestamp',
      'type',
      'userId',
    ]);
  });

  it('conserva el payload opaco sin clonarlo ni interpretarlo', () => {
    const payload = { habitId: 'tutorial-habit-id', nested: { coins: 500 } };
    const event = createDomainEvent({ ...EVENT_INPUT, payload });

    expect(event.payload).toBe(payload);
  });

  it('no muta el objeto de entrada', () => {
    const input = { ...EVENT_INPUT };
    createDomainEvent(input);

    expect(input).toEqual(EVENT_INPUT);
    expect(input).not.toHaveProperty('syncedAt');
  });
});

describe('StoragePort / EventLogPort — US-01 CA-01: contratos puros de persistencia', () => {
  it('guarda y carga el GameState de forma asíncrona', async () => {
    const adapter: StoragePort = createInMemoryAdapter();
    const state = createDayZeroState(EVENT_INPUT.timestamp);

    expect(await adapter.loadState()).toBeNull();

    await adapter.saveState(state);

    expect(await adapter.loadState()).toBe(state);
  });

  it('anexa eventos y lista los pendientes de sincronización', async () => {
    const adapter: EventLogPort = createInMemoryAdapter();
    const pending = createDomainEvent(EVENT_INPUT);
    const alreadySynced: DomainEventRecord = { ...createDomainEvent(EVENT_INPUT), syncedAt: 1 };

    await adapter.appendEvent(pending);
    await adapter.appendEvent(alreadySynced);

    expect(await adapter.listPendingEvents()).toEqual([pending]);
  });
});

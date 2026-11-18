import { createDomainEvent } from '../../core/ports/EventLogPort';
import type { BackupPort } from '../../core/ports/BackupPort';
import type { StoragePort } from '../../core/ports/StoragePort';
import type { PendingDomainEvent, UnitOfWorkPort } from '../../core/ports/UnitOfWorkPort';
import type { DomainEventRecord, GameState } from '../../core/types';

const DATABASE_NAME = 'to-do-town';
const DATABASE_VERSION = 1;

export const GAME_STATE_STORE = 'game_state';
export const DOMAIN_EVENTS_STORE = 'domain_events';
export const GAME_STATE_KEY = 'current';

const LOCAL_DEVICE_IDENTITY = { userId: 'local-owner', deviceId: 'desktop' } as const;

export class IndexedDBAdapter implements StoragePort, UnitOfWorkPort, BackupPort {
  open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(GAME_STATE_STORE)) {
          db.createObjectStore(GAME_STATE_STORE);
        }

        if (!db.objectStoreNames.contains(DOMAIN_EVENTS_STORE)) {
          db.createObjectStore(DOMAIN_EVENTS_STORE);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveState(state: GameState): Promise<void> {
    await this.withDatabase((db) =>
      transact(db, [GAME_STATE_STORE], (transaction) => {
        transaction.objectStore(GAME_STATE_STORE).put(state, GAME_STATE_KEY);
      }),
    );
  }

  async loadState(): Promise<GameState | null> {
    const stored = await this.withDatabase((db) =>
      read<GameState | undefined>(db, GAME_STATE_STORE, (store) => store.get(GAME_STATE_KEY)),
    );

    return stored ?? null;
  }

  async commit(state: GameState, event: PendingDomainEvent): Promise<DomainEventRecord> {
    const record = createDomainEvent({ ...event, ...LOCAL_DEVICE_IDENTITY });

    await this.withDatabase((db) =>
      transact(db, [GAME_STATE_STORE, DOMAIN_EVENTS_STORE], (transaction) => {
        transaction.objectStore(GAME_STATE_STORE).put(state, GAME_STATE_KEY);
        transaction.objectStore(DOMAIN_EVENTS_STORE).add(record, record.eventId);
      }),
    );

    return record;
  }

  async listPendingEvents(): Promise<DomainEventRecord[]> {
    const events = await this.withDatabase((db) =>
      read<DomainEventRecord[]>(db, DOMAIN_EVENTS_STORE, (store) => store.getAll()),
    );

    return events.filter((event) => event.syncedAt === null);
  }

  async listEvents(): Promise<DomainEventRecord[]> {
    return this.withDatabase((db) =>
      read<DomainEventRecord[]>(db, DOMAIN_EVENTS_STORE, (store) => store.getAll()),
    );
  }

  /**
   * Una sola transacción sobre ambos almacenes: si el respaldo no se puede
   * escribir completo, IndexedDB aborta y la ciudad anterior sigue intacta.
   */
  async replaceAll(backup: { gameState: GameState; domainEvents: DomainEventRecord[] }): Promise<void> {
    await this.withDatabase((db) =>
      transact(db, [GAME_STATE_STORE, DOMAIN_EVENTS_STORE], (transaction) => {
        const stateStore = transaction.objectStore(GAME_STATE_STORE);
        const eventStore = transaction.objectStore(DOMAIN_EVENTS_STORE);

        stateStore.clear();
        eventStore.clear();

        stateStore.put(backup.gameState, GAME_STATE_KEY);

        for (const event of backup.domainEvents) {
          eventStore.add(event, event.eventId);
        }
      }),
    );
  }

  private async withDatabase<T>(run: (db: IDBDatabase) => Promise<T>): Promise<T> {
    const db = await this.open();

    try {
      return await run(db);
    } finally {
      db.close();
    }
  }
}

function transact(
  db: IDBDatabase,
  storeNames: string[],
  run: (transaction: IDBTransaction) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeNames, 'readwrite');

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);

    run(transaction);
  });
}

function read<T>(
  db: IDBDatabase,
  storeName: string,
  request: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const result = request(transaction.objectStore(storeName));

    result.onsuccess = () => resolve(result.result as T);
    result.onerror = () => reject(result.error);
  });
}

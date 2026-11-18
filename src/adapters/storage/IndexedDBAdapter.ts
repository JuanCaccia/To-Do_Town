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

/**
 * MIG-01: versión del esquema con el que se escribió el snapshot persistido.
 * Se sube cuando el `GameState` cambia de forma, no en cada cambio de tipo: es
 * la marca que le permite a una versión futura saber qué está leyendo.
 */
export const GAME_STATE_VERSION = 1;

interface StoredGameState {
  version: number;
  state: GameState;
}

/**
 * El registro guardado envuelve el estado con la versión que lo escribió.
 * Un registro anterior a MIG-01 es el `GameState` pelado: se reconoce por la
 * ausencia de `version` y se acepta igual, porque es la ciudad real del usuario
 * y no hay nada que migrar todavía.
 */
function toStored(state: GameState): StoredGameState {
  return { version: GAME_STATE_VERSION, state };
}

function fromStored(stored: GameState | StoredGameState): GameState {
  if ('version' in stored === false) {
    return stored;
  }

  // Un snapshot de un build más nuevo puede traer campos que esta versión no
  // conoce. Se lee igual —la ciudad es del usuario— pero se avisa: sin esto la
  // versión sería un sello decorativo.
  if (stored.version > GAME_STATE_VERSION) {
    console.warn(
      `[IndexedDBAdapter] el snapshot se escribió con la versión ${stored.version} del esquema y este build entiende hasta la ${GAME_STATE_VERSION}.`,
    );
  }

  return stored.state;
}

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
        transaction.objectStore(GAME_STATE_STORE).put(toStored(state), GAME_STATE_KEY);
      }),
    );
  }

  async loadState(): Promise<GameState | null> {
    const stored = await this.withDatabase((db) =>
      read<GameState | StoredGameState | undefined>(db, GAME_STATE_STORE, (store) =>
        store.get(GAME_STATE_KEY),
      ),
    );

    return stored === undefined ? null : fromStored(stored);
  }

  async commit(state: GameState, event: PendingDomainEvent): Promise<DomainEventRecord> {
    const record = createDomainEvent({ ...event, ...LOCAL_DEVICE_IDENTITY });

    await this.withDatabase((db) =>
      transact(db, [GAME_STATE_STORE, DOMAIN_EVENTS_STORE], (transaction) => {
        transaction.objectStore(GAME_STATE_STORE).put(toStored(state), GAME_STATE_KEY);
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

        stateStore.put(toStored(backup.gameState), GAME_STATE_KEY);

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

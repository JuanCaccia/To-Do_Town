import { create } from 'zustand';
import { CryptoIdAdapter } from '../adapters/id/CryptoIdAdapter';
import { IndexedDBAdapter } from '../adapters/storage/IndexedDBAdapter';
import { createNeighborhood } from '../core/entities/neighborhood';
import { completeTask, createTask, moveTask } from '../core/entities/task';
import type { IdPort } from '../core/ports/IdPort';
import type { StoragePort } from '../core/ports/StoragePort';
import type { UnitOfWorkPort } from '../core/ports/UnitOfWorkPort';
import { levelNeighborhoodBlock } from '../core/rules/blockLeveling';
import type { BlockLevelingResult } from '../core/rules/blockLeveling';
import { calculateTick } from '../core/rules/calculateTick';
import { purchaseNeighborhoodDecoration } from '../core/rules/decorationPurchase';
import type { DecorationPurchaseResult } from '../core/rules/decorationPurchase';
import { upgradeNeighborhoodInfrastructure } from '../core/rules/infrastructureUpgrade';
import type { InfrastructureUpgradeResult } from '../core/rules/infrastructureUpgrade';
import type {
  CityBlock,
  DecorationKind,
  EntityId,
  GameState,
  TaskWeight,
  TimestampMs,
} from '../core/types';
import { hydrateGameState } from './hydrateGameState';

export interface GameStoreDeps {
  storage: StoragePort;
  unitOfWork: UnitOfWorkPort;
  idPort: IdPort;
  now: () => TimestampMs;
}

export interface GameStoreState {
  state: GameState | null;
  hydrate(now: TimestampMs): Promise<void>;
  tick(): Promise<void>;
  createNeighborhood(input: { name: string; paletteId: string }): Promise<EntityId>;
  upgradeInfrastructure(neighborhoodId: EntityId): Promise<InfrastructureUpgradeResult>;
  levelBlock(
    neighborhoodId: EntityId,
    position: CityBlock['gridPosition'],
  ): Promise<BlockLevelingResult>;
  purchaseDecoration(
    neighborhoodId: EntityId,
    kind: DecorationKind,
  ): Promise<DecorationPurchaseResult>;
  createTask(input: {
    neighborhoodId: EntityId;
    title: string;
    weight: TaskWeight;
  }): Promise<EntityId>;
  moveTask(taskId: EntityId, target: 'MASTER_PLAN' | 'IN_CONSTRUCTION'): Promise<void>;
  completeTask(taskId: EntityId): Promise<void>;
}

export function createGameStore(deps: GameStoreDeps) {
  return create<GameStoreState>()((set, get) => {
    function requireState(): GameState {
      const current = get().state;

      if (current === null) {
        throw new Error('useGameStore: call hydrate() before dispatching actions');
      }

      return current;
    }

    async function commit(next: GameState, type: string, payload: Record<string, unknown>) {
      await deps.unitOfWork.commit(next, {
        eventId: deps.idPort.generateId(),
        timestamp: deps.now(),
        type,
        payload,
      });

      set({ state: next });
    }

    return {
      state: null,

      async hydrate(now) {
        set({ state: await hydrateGameState(deps.storage, now) });
      },

      async tick() {
        const current = requireState();
        const next = calculateTick(current, deps.now());

        // The rule returns the same reference while the operational day holds,
        // so a minute-by-minute loop never writes a phantom event.
        if (next === current) {
          return;
        }

        await commit(next, 'OPERATIONAL_DAY_ROLLED_OVER', {
          operationalDay: next.lastOperationalDay,
        });
      },

      async createNeighborhood(input) {
        const neighborhoodId = deps.idPort.generateId();
        const next = createNeighborhood(requireState(), { ...input, id: neighborhoodId });

        await commit(next, 'NEIGHBORHOOD_CREATED', {
          neighborhoodId,
          name: input.name,
          paletteId: input.paletteId,
        });

        return neighborhoodId;
      },

      async upgradeInfrastructure(neighborhoodId) {
        const result = upgradeNeighborhoodInfrastructure(requireState(), neighborhoodId);

        if (result.status === 'REJECTED') {
          return result;
        }

        await commit(result.state, 'INFRASTRUCTURE_UPGRADED', {
          neighborhoodId,
          cost: result.cost,
        });

        return result;
      },

      async levelBlock(neighborhoodId, position) {
        const result = levelNeighborhoodBlock(requireState(), neighborhoodId, position);

        if (result.status === 'REJECTED') {
          return result;
        }

        await commit(result.state, 'BLOCK_LEVELED', { neighborhoodId, position, cost: result.cost });

        return result;
      },

      async purchaseDecoration(neighborhoodId, kind) {
        const result = purchaseNeighborhoodDecoration(requireState(), {
          neighborhoodId,
          decorationId: deps.idPort.generateId(),
          kind,
        });

        if (result.status === 'REJECTED') {
          return result;
        }

        await commit(result.state, 'DECORATION_PURCHASED', { neighborhoodId, kind, cost: result.cost });

        return result;
      },

      async createTask(input) {
        const taskId = deps.idPort.generateId();
        const next = createTask(requireState(), { ...input, id: taskId }, deps.now());

        await commit(next, 'TASK_CREATED', {
          taskId,
          neighborhoodId: input.neighborhoodId,
          weight: input.weight,
        });

        return taskId;
      },

      async moveTask(taskId, target) {
        const current = requireState();
        const next = moveTask(current, taskId, target);

        // The pure rule returns the same reference when it refuses, so a no-op
        // never reaches the Outbox as a phantom event.
        if (next === current) {
          return;
        }

        await commit(next, 'TASK_MOVED', { taskId, boardStatus: target });
      },

      async completeTask(taskId) {
        const current = requireState();
        const next = completeTask(current, taskId, deps.now());

        if (next === current) {
          return;
        }

        await commit(next, 'TASK_COMPLETED', { taskId });
      },
    };
  });
}

const defaultAdapter = new IndexedDBAdapter();

export const useGameStore = createGameStore({
  storage: defaultAdapter,
  unitOfWork: defaultAdapter,
  idPort: new CryptoIdAdapter(),
  now: Date.now,
});

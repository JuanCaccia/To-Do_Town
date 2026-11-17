import { create } from 'zustand';
import { CryptoIdAdapter } from '../adapters/id/CryptoIdAdapter';
import { IndexedDBAdapter } from '../adapters/storage/IndexedDBAdapter';
import { createNeighborhood } from '../core/entities/neighborhood';
import { createHabit } from '../core/entities/habit';
import type { HabitCreationResult } from '../core/entities/habit';
import { completeTask, createTask, moveTask } from '../core/entities/task';
import type { IdPort } from '../core/ports/IdPort';
import type { StoragePort } from '../core/ports/StoragePort';
import type { UnitOfWorkPort } from '../core/ports/UnitOfWorkPort';
import { levelNeighborhoodBlock } from '../core/rules/blockLeveling';
import type { BlockLevelingResult } from '../core/rules/blockLeveling';
import { calculateTick } from '../core/rules/calculateTick';
import { purchaseNeighborhoodDecoration } from '../core/rules/decorationPurchase';
import type { DecorationPurchaseResult } from '../core/rules/decorationPurchase';
import { completeHabit } from '../core/rules/habitCheckIn';
import type { HabitCheckInResult } from '../core/rules/habitCheckIn';
import { changeHabitFrequency } from '../core/rules/habitFrequencyChange';
import type { HabitFrequencyChangeResult } from '../core/rules/habitFrequencyChange';
import { moveHabit } from '../core/rules/habitRelocation';
import type { HabitRelocationResult } from '../core/rules/habitRelocation';
import { retireHabit } from '../core/rules/habitRetirement';
import type { HabitRetirementResult } from '../core/rules/habitRetirement';
import { upgradeNeighborhoodInfrastructure } from '../core/rules/infrastructureUpgrade';
import type { InfrastructureUpgradeResult } from '../core/rules/infrastructureUpgrade';
import { createPomodoroPreset } from '../core/entities/pomodoroPreset';
import type {
  NewPomodoroPresetInput,
  PomodoroPresetCreationResult,
} from '../core/entities/pomodoroPreset';
import { recordFocusSession } from '../core/rules/focusSession';
import type { FocusSessionResult, NewFocusSessionInput } from '../core/rules/focusSession';
import { registerPageReading } from '../core/rules/libraryReading';
import type { LibraryReadingResult } from '../core/rules/libraryReading';
import { registerWaterIntake } from '../core/rules/waterIntake';
import type { WaterIntakeAmount } from '../core/rules/waterIntake';
import type {
  CityBlock,
  DecorationKind,
  EntityId,
  GameState,
  HabitFrequency,
  TaskWeight,
  TimestampMs,
} from '../core/types';
import { settlePassiveProduction } from '../core/rules/passiveProduction';
import { applySafeFloor } from '../core/rules/habitDecay';
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
  createHabit(input: {
    neighborhoodId: EntityId;
    title: string;
    frequency: HabitFrequency;
  }): Promise<HabitCreationResult>;
  completeHabitToday(habitId: EntityId): Promise<HabitCheckInResult>;
  changeHabitFrequency(
    habitId: EntityId,
    frequency: HabitFrequency,
  ): Promise<HabitFrequencyChangeResult>;
  moveHabit(habitId: EntityId, targetNeighborhoodId: EntityId): Promise<HabitRelocationResult>;
  retireHabitToMuseum(habitId: EntityId): Promise<HabitRetirementResult>;
  registerWater(amount: WaterIntakeAmount): Promise<void>;
  registerPages(pages: number): Promise<LibraryReadingResult>;
  createPreset(input: Omit<NewPomodoroPresetInput, 'id'>): Promise<PomodoroPresetCreationResult>;
  recordFocus(input: Omit<NewFocusSessionInput, 'id'>): Promise<FocusSessionResult>;
}

/**
 * Ids de los hábitos cuya racha retrocedió entre dos snapshots.
 *
 * La caída a Apagón no deja marca persistida (DEC-018): la única evidencia es
 * la diferencia de estado. Por eso el tipo del evento se deriva de lo que
 * realmente cambió y no de una bandera que alguien tenga que mantener.
 */
function habitsRolledBackToFloor(previous: GameState, next: GameState): EntityId[] {
  return Object.keys(next.habits).filter(
    (id) => next.habits[id]?.currentStreakDays !== previous.habits[id]?.currentStreakDays,
  );
}

export function createGameStore(deps: GameStoreDeps) {
  return create<GameStoreState>()((set, get) => {
    function stateOrThrow(): GameState {
      const current = get().state;

      if (current === null) {
        throw new Error('useGameStore: call hydrate() before dispatching actions');
      }

      return current;
    }

    /**
     * DEC-019: ninguna acción muta sin liquidar antes lo que el paso del tiempo
     * devengó **o castigó**: producción pasiva y piso seguro, en ese orden.
     *
     * Es el único punto de lectura del estado para las acciones, así que el
     * invariante no depende de que alguien se acuerde de liquidar en cada una.
     * El orden es el mismo que el de `calculateTick` y tampoco es casual:
     * `applySafeFloor` adelanta `lastTickAt` cuando muta, así que si corriera
     * primero dejaría el intervalo sin cobrar.
     *
     * Devuelve el estado ya liquidado sin commitearlo: la acción lo pliega en su
     * propio commit, de modo que el estado y el evento son atómicos y una acción
     * no genera un evento de liquidación extra. Si la acción se rechaza, la
     * liquidación simplemente se difiere — es determinista sobre `lastTickAt`,
     * así que no se pierde nada.
     */
    function requireSettledState(): GameState {
      const current = stateOrThrow();
      const now = deps.now();

      return applySafeFloor(settlePassiveProduction(current, now), now);
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
        const current = stateOrThrow();
        const next = calculateTick(current, deps.now());

        // DEC-018: si ninguna regla mutó, no hay evento que escribir.
        if (next === current) {
          return;
        }

        // Un tick puede liquidar producción, rotar la jornada o las dos cosas.
        // El evento debe decir lo que realmente pasó, no lo que suele pasar.
        if (next.lastOperationalDay !== current.lastOperationalDay) {
          await commit(next, 'OPERATIONAL_DAY_ROLLED_OVER', {
            operationalDay: next.lastOperationalDay,
          });
          return;
        }

        const decayed = habitsRolledBackToFloor(current, next);

        if (decayed.length > 0) {
          await commit(next, 'HABIT_DECAYED_TO_SAFE_FLOOR', { habitIds: decayed });
          return;
        }

        await commit(next, 'PASSIVE_PRODUCTION_SETTLED', { lastTickAt: next.lastTickAt });
      },

      async createNeighborhood(input) {
        const neighborhoodId = deps.idPort.generateId();
        const next = createNeighborhood(requireSettledState(), { ...input, id: neighborhoodId });

        await commit(next, 'NEIGHBORHOOD_CREATED', {
          neighborhoodId,
          name: input.name,
          paletteId: input.paletteId,
        });

        return neighborhoodId;
      },

      async upgradeInfrastructure(neighborhoodId) {
        const result = upgradeNeighborhoodInfrastructure(requireSettledState(), neighborhoodId);

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
        const result = levelNeighborhoodBlock(requireSettledState(), neighborhoodId, position);

        if (result.status === 'REJECTED') {
          return result;
        }

        await commit(result.state, 'BLOCK_LEVELED', { neighborhoodId, position, cost: result.cost });

        return result;
      },

      async purchaseDecoration(neighborhoodId, kind) {
        const result = purchaseNeighborhoodDecoration(requireSettledState(), {
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
        const next = createTask(requireSettledState(), { ...input, id: taskId }, deps.now());

        await commit(next, 'TASK_CREATED', {
          taskId,
          neighborhoodId: input.neighborhoodId,
          weight: input.weight,
        });

        return taskId;
      },

      async moveTask(taskId, target) {
        const current = requireSettledState();
        const next = moveTask(current, taskId, target);

        // The pure rule returns the same reference when it refuses, so a no-op
        // never reaches the Outbox as a phantom event.
        if (next === current) {
          return;
        }

        await commit(next, 'TASK_MOVED', { taskId, boardStatus: target });
      },

      async completeTask(taskId) {
        const current = requireSettledState();
        const next = completeTask(current, taskId, deps.now());

        if (next === current) {
          return;
        }

        await commit(next, 'TASK_COMPLETED', { taskId });
      },

      async createHabit(input) {
        const habitId = deps.idPort.generateId();
        const result = createHabit(requireSettledState(), { ...input, id: habitId }, deps.now());

        if (result.status === 'REJECTED') {
          return result;
        }

        await commit(result.state, 'HABIT_CREATED', {
          habitId,
          neighborhoodId: input.neighborhoodId,
          frequency: input.frequency,
        });

        return result;
      },

      async completeHabitToday(habitId) {
        const result = completeHabit(requireSettledState(), habitId, deps.now());

        if (result.status === 'REJECTED') {
          return result;
        }

        await commit(result.state, 'HABIT_CHECKED_IN', { habitId });

        return result;
      },

      async changeHabitFrequency(habitId, frequency) {
        const result = changeHabitFrequency(requireSettledState(), habitId, frequency, deps.now());

        if (result.status === 'REJECTED') {
          return result;
        }

        await commit(result.state, 'HABIT_FREQUENCY_CHANGED', { habitId, frequency });

        return result;
      },

      async moveHabit(habitId, targetNeighborhoodId) {
        const result = moveHabit(requireSettledState(), habitId, targetNeighborhoodId);

        if (result.status === 'REJECTED') {
          return result;
        }

        await commit(result.state, 'HABIT_MOVED', { habitId, targetNeighborhoodId });

        return result;
      },

      async retireHabitToMuseum(habitId) {
        const result = retireHabit(requireSettledState(), habitId, deps.now());

        if (result.status === 'REJECTED') {
          return result;
        }

        await commit(result.state, 'HABIT_RETIRED_TO_MUSEUM', { habitId });

        return result;
      },

      async registerWater(amount) {
        const next = registerWaterIntake(requireSettledState(), amount);

        await commit(next, 'WATER_REGISTERED', { amount });
      },

      async registerPages(pages) {
        const result = registerPageReading(requireSettledState(), pages);

        if (result.status === 'REJECTED') {
          return result;
        }

        await commit(result.state, 'PAGES_REGISTERED', { pages });

        return result;
      },

      async createPreset(input) {
        const presetId = deps.idPort.generateId();
        const result = createPomodoroPreset(requireSettledState(), { ...input, id: presetId });

        if (result.status === 'REJECTED') {
          return result;
        }

        await commit(result.state, 'POMODORO_PRESET_CREATED', {
          presetId,
          name: input.name,
          workMinutes: input.workMinutes,
          shortBreakMinutes: input.shortBreakMinutes,
          longBreakMinutes: input.longBreakMinutes ?? null,
        });

        return result;
      },

      async recordFocus(input) {
        const focusSessionId = deps.idPort.generateId();
        const result = recordFocusSession(requireSettledState(), { ...input, id: focusSessionId });

        if (result.status === 'REJECTED') {
          return result;
        }

        await commit(result.state, 'FOCUS_SESSION_RECORDED', {
          focusSessionId,
          neighborhoodId: input.neighborhoodId,
          presetId: input.presetId,
          outcome: input.outcome,
          focusMinutes: result.state.focusSessions[focusSessionId]?.focusMinutes,
        });

        return result;
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

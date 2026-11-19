import { create } from 'zustand';
import { CryptoIdAdapter } from '../adapters/id/CryptoIdAdapter';
import { buildBackupFile, parseBackupFile } from '../adapters/backup/backupSchema';
import type { BackupFile } from '../adapters/backup/backupSchema';
import { IndexedDBAdapter } from '../adapters/storage/IndexedDBAdapter';
import { injectHabitCheckpointLevel } from '../adapters/dev-tools/habitLevelInjection';
import { injectTreasury } from '../adapters/dev-tools/treasuryInjection';
import { createNeighborhood } from '../core/entities/neighborhood';
import { createHabit } from '../core/entities/habit';
import type { HabitCreationResult } from '../core/entities/habit';
import { completeTask, createTask, moveTask } from '../core/entities/task';
import type { IdPort } from '../core/ports/IdPort';
import type { StoragePort } from '../core/ports/StoragePort';
import type { UnitOfWorkPort } from '../core/ports/UnitOfWorkPort';
import { levelNeighborhoodBlock } from '../core/rules/blockLeveling';
import type { BlockLevelingResult } from '../core/rules/blockLeveling';
import { calculateTick, settleCity } from '../core/rules/calculateTick';
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
import { activateManualPause, resumeManualPause } from '../core/rules/manualPause';
import type { ManualPauseResult } from '../core/rules/manualPause';
import { reactivateNeighborhood } from '../core/rules/reactivation';
import { createPomodoroPreset } from '../core/entities/pomodoroPreset';
import type {
  NewPomodoroPresetInput,
  PomodoroPresetCreationResult,
} from '../core/entities/pomodoroPreset';
import { liquidateFocusSession } from '../core/rules/focusLiquidation';
import { recordFocusSession } from '../core/rules/focusSession';
import type { FocusSessionResult, NewFocusSessionInput } from '../core/rules/focusSession';
import type { PageCapResult } from '../core/rules/dailyCaps';
import { applyPageDailyCap, applyWaterDailyCap } from '../core/rules/dailyCaps';
import type { WaterIntakeAmount } from '../core/rules/waterIntake';
import { parseCommand } from '../core/rules/commandParser';
import type { CommandRejectionReason } from '../core/rules/commandParser';
import { undoAction } from '../core/rules/undoAction';
import type { UndoRejectionReason } from '../core/rules/undoAction';
import { pruneExpiredSnapshots } from '../core/rules/undoQueue';
import { createUndoSnapshot } from '../core/rules/undoSnapshot';
import type {
  CityBlock,
  DecorationKind,
  EntityId,
  GameState,
  HabitFrequency,
  TaskWeight,
  TimestampMs,
  UndoSnapshot,
} from '../core/types';
import { hydrateGameState } from './hydrateGameState';
import type { BackupPort } from '../core/ports/BackupPort';

export interface GameStoreDeps {
  /**
   * US-12 CA-04: el respaldo reemplaza los dos almacenes a la vez, así que el
   * almacenamiento tiene que poder hacerlo. Un `StoragePort` a secas serviría
   * para operar la ciudad, pero no para exportarla ni restaurarla.
   */
  storage: StoragePort & BackupPort;
  unitOfWork: UnitOfWorkPort;
  idPort: IdPort;
  now: () => TimestampMs;
}

/**
 * US-12 CA-01: solicitud de foco de un solo uso. El cronómetro sigue siendo
 * estado efímero de la vista (`FocusTimer`), así que el comando no arranca un
 * timer desde el store: deja pedido qué barrio y qué preset, y la vista lo
 * consume y lo limpia.
 */
export interface FocusRequest {
  neighborhoodId: EntityId;
  presetId: string;
}

export type CommandDispatchRejection =
  | CommandRejectionReason
  | 'NEIGHBORHOOD_NOT_FOUND'
  | 'NO_MATCHING_PRESET';

export type CommandDispatchResult =
  | { status: 'EXECUTED' }
  | { status: 'REJECTED'; reason: CommandDispatchRejection };

/**
 * US-12 CA-02: el resultado de deshacer no expone `state`. Si la reversión se
 * rechaza, no hay nada que commitear, así que no puede escapar un
 * `ACTION_UNDONE` de una entrada vencida.
 */
export type UndoOutcome =
  | { status: 'UNDONE' }
  | { status: 'REJECTED'; reason: UndoRejectionReason | 'NOTHING_TO_UNDO' };

/**
 * US-12 CA-04: la importación es un todo o nada. El motivo del rechazo viaja
 * hasta el HUD para que el usuario sepa qué falló sin abrir la consola.
 */
export type BackupImportOutcome =
  | { status: 'IMPORTED' }
  | { status: 'REJECTED'; reason: string };

export interface GameStoreState {
  state: GameState | null;
  focusRequest: FocusRequest | null;
  undoQueue: UndoSnapshot[];
  consumeFocusRequest(): FocusRequest | null;
  runCommand(raw: string): Promise<CommandDispatchResult>;
  undoLastAction(): Promise<UndoOutcome>;
  dismissUndo(): void;
  exportBackup(): Promise<BackupFile>;
  importBackup(raw: unknown): Promise<BackupImportOutcome>;
  /** DEV-01: siembra de saldo para pruebas manuales; sólo la usa el panel DEV. */
  setNeighborhoodTreasury(neighborhoodId: EntityId, coins: number): Promise<void>;
  /**
   * DEV-01 (extensión): siembra el nivel de un hábito para validar la US-06
   * Prueba 3, que exige `checkpointLevel === 5`. Sólo la usa el panel DEV.
   */
  setHabitCheckpointLevel(habitId: EntityId, level: number): Promise<void>;
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
  registerPages(pages: number): Promise<PageCapResult>;
  createPreset(input: Omit<NewPomodoroPresetInput, 'id'>): Promise<PomodoroPresetCreationResult>;
  recordFocus(input: Omit<NewFocusSessionInput, 'id'>): Promise<FocusSessionResult>;
  pauseCity(reason: string): Promise<ManualPauseResult>;
  resumeCity(): Promise<void>;
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

/**
 * Resuelve el barrio por el nombre que escribió el usuario: comparación exacta
 * salvo mayúsculas. El parser conserva el nombre tal cual, así que este es el
 * único punto donde el texto del comando se cruza con el estado.
 */
function findNeighborhoodByName(state: GameState, name: string): EntityId | null {
  const target = name.toLowerCase();

  for (const [id, neighborhood] of Object.entries(state.neighborhoods)) {
    if (neighborhood.name.toLowerCase() === target) return id;
  }

  return null;
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
      const now = deps.now();
      const settled = settleCity(stateOrThrow(), now);

      // US-11 CA-01: toda acción del usuario cuenta como interacción. `tick`
      // no pasa por acá, así que el latido técnico no posterga la hibernación.
      return settled.lastUserInteractionAt === now
        ? settled
        : { ...settled, lastUserInteractionAt: now };
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

    /**
     * US-12 CA-02: commit de una acción que el usuario puede deshacer.
     *
     * La instantánea se toma del estado **inmediatamente anterior** al commit y
     * se apila en la misma llamada, así no puede desincronizarse del cambio que
     * dice representar. Sólo las acciones que enumera US-13 CA-01 pasan por acá;
     * los eventos del sistema y las acciones no reversibles siguen usando
     * `commit` a secas.
     */
    async function commitWithUndo(
      next: GameState,
      type: string,
      payload: Record<string, unknown>,
      description: string,
    ) {
      const snapshot = createUndoSnapshot(
        stateOrThrow(),
        deps.idPort.generateId(),
        description,
        deps.now(),
      );

      await commit(next, type, payload);

      set((current) => ({
        undoQueue: pruneExpiredSnapshots([...current.undoQueue, snapshot], deps.now()),
      }));
    }

    return {
      state: null,
      focusRequest: null,
      undoQueue: [],

      async undoLastAction() {
        const queue = get().undoQueue;
        const snapshot = queue[queue.length - 1];

        if (snapshot === undefined) {
          return { status: 'REJECTED', reason: 'NOTHING_TO_UNDO' };
        }

        const result = undoAction(snapshot, deps.now());

        if (result.status === 'REJECTED') {
          // La entrada vencida se descarta acá: reintentar no la va a revivir.
          set({ undoQueue: pruneExpiredSnapshots(queue, deps.now()) });
          return { status: 'REJECTED', reason: result.reason };
        }

        await commit(result.state, 'ACTION_UNDONE', {
          actionId: snapshot.actionId,
          description: snapshot.description,
        });

        set({ undoQueue: queue.filter((entry) => entry !== snapshot) });

        return { status: 'UNDONE' };
      },

      /**
       * Renuncia a la última oportunidad de revertir sin tocar el estado. Sólo
       * se descarta la entrada más reciente: las anteriores siguen en la cola y
       * el toast muestra la siguiente si aún está vigente.
       */
      dismissUndo() {
        set({ undoQueue: get().undoQueue.slice(0, -1) });
      },

      /**
       * US-12 CA-04: el respaldo incluye el historial completo de eventos, no
       * sólo lo pendiente de sincronizar. El archivo es la ciudad entera.
       */
      async exportBackup() {
        const domainEvents = await deps.storage.listEvents();

        return buildBackupFile(stateOrThrow(), domainEvents, deps.now());
      },

      /**
       * Importar no emite evento de dominio: el archivo ya trae su propio
       * historial y agregar uno lo contaminaría con la ciudad descartada.
       */
      async importBackup(raw) {
        const validation = parseBackupFile(raw);

        if (validation.ok === false) {
          return { status: 'REJECTED', reason: validation.reason };
        }

        await deps.storage.replaceAll(validation.backup);

        set({ state: validation.backup.gameState, focusRequest: null, undoQueue: [] });

        return { status: 'IMPORTED' };
      },

      /**
       * DEV-01: sembrar un saldo para pruebas manuales. No pasa por `commit`
       * porque una siembra no es un evento de dominio: contaminaría el Outbox
       * que CloudSync va a empujar. Persiste el snapshot y nada más.
       */
      async setNeighborhoodTreasury(neighborhoodId, coins) {
        const settled = requireSettledState();
        const next = injectTreasury(settled, neighborhoodId, coins);

        if (next === settled) {
          return;
        }

        await deps.storage.saveState(next);
        set({ state: next });
      },

      /**
       * DEV-01 (extensión): misma forma que la siembra de saldo, por el mismo
       * motivo. No pasa por `commit`: un nivel sembrado a mano no es un evento
       * de dominio y contaminaría el Outbox. Persiste y nada más.
       */
      async setHabitCheckpointLevel(habitId, level) {
        const settled = requireSettledState();
        const next = injectHabitCheckpointLevel(settled, habitId, level);

        if (next === settled) {
          return;
        }

        await deps.storage.saveState(next);
        set({ state: next });
      },

      consumeFocusRequest() {
        const request = get().focusRequest;

        if (request !== null) set({ focusRequest: null });

        return request;
      },

      async runCommand(raw) {
        const command = parseCommand(raw);

        // Un comando inválido no toca el estado ni liquida: no hay nada que mutar.
        if (command.kind === 'INVALID') {
          return { status: 'REJECTED', reason: command.reason };
        }

        if (command.kind === 'WATER') {
          await get().registerWater(command.liters);
          return { status: 'EXECUTED' };
        }

        if (command.kind === 'READING') {
          await get().registerPages(command.pages);
          return { status: 'EXECUTED' };
        }

        const neighborhoodId = findNeighborhoodByName(
          stateOrThrow(),
          command.neighborhoodName,
        );

        if (neighborhoodId === null) {
          return { status: 'REJECTED', reason: 'NEIGHBORHOOD_NOT_FOUND' };
        }

        if (command.kind === 'TASK') {
          await get().createTask({
            neighborhoodId,
            title: command.title,
            weight: command.weight,
          });
          return { status: 'EXECUTED' };
        }

        // `pomo` trae minutos sueltos, pero el ciclo trabajo/descanso depende del
        // preset: no se inventa un cronómetro ad-hoc con `workMinutes` arbitrario.
        const preset = stateOrThrow().config.pomodoroPresets.find(
          (candidate) => candidate.workMinutes === command.minutes,
        );

        if (preset === undefined) {
          return { status: 'REJECTED', reason: 'NO_MATCHING_PRESET' };
        }

        set({ focusRequest: { neighborhoodId, presetId: preset.id } });

        return { status: 'EXECUTED' };
      },

      async hydrate(now) {
        set({ state: await hydrateGameState(deps.storage, now) });
      },

      async tick() {
        // US-13 CA-03: el reloj de la ciudad purga la cola de reversibilidad.
        const prunedQueue = pruneExpiredSnapshots(get().undoQueue, deps.now());

        if (prunedQueue.length !== get().undoQueue.length) {
          set({ undoQueue: prunedQueue });
        }

        const current = stateOrThrow();
        const next = calculateTick(current, deps.now());

        // DEC-018: si ninguna regla mutó, no hay evento que escribir.
        if (next === current) {
          return;
        }

        // US-11 CA-01: la hibernación es el hecho saliente del tick; se declara
        // como tal aunque el mismo tick también haya rotado la jornada.
        if (
          current.cityStatus === 'ACTIVE' &&
          next.cityStatus === 'AUTO_PAUSED_HIBERNATION'
        ) {
          await commit(next, 'CITY_HIBERNATED', { lastTickAt: next.lastTickAt });
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

        await commitWithUndo(result.state, 'INFRASTRUCTURE_UPGRADED', {
          neighborhoodId,
          cost: result.cost,
        }, 'Infraestructura mejorada');

        return result;
      },

      async levelBlock(neighborhoodId, position) {
        const result = levelNeighborhoodBlock(requireSettledState(), neighborhoodId, position);

        if (result.status === 'REJECTED') {
          return result;
        }

        await commitWithUndo(result.state, 'BLOCK_LEVELED', { neighborhoodId, position, cost: result.cost }, 'Cuadra nivelada');

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

        await commitWithUndo(result.state, 'DECORATION_PURCHASED', { neighborhoodId, kind, cost: result.cost }, 'Decoración comprada');

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
        const task = current.tasks[taskId];
        const reactivated =
          task === undefined
            ? current
            : reactivateNeighborhood(current, task.neighborhoodId, deps.now());
        const next = completeTask(reactivated, taskId, deps.now());

        // US-11 CA-02: la reactivación es parte del regreso, no del intento. Si
        // la tarea no se completa, tampoco se commitea el despertar del barrio.
        if (next === reactivated) {
          return;
        }

        await commitWithUndo(next, 'TASK_COMPLETED', { taskId }, 'Tarea completada');
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
        const settled = requireSettledState();
        const habit = settled.habits[habitId];
        const reactivated =
          habit === undefined
            ? settled
            : reactivateNeighborhood(settled, habit.neighborhoodId, deps.now());
        const result = completeHabit(reactivated, habitId, deps.now());

        if (result.status === 'REJECTED') {
          return result;
        }

        await commitWithUndo(result.state, 'HABIT_CHECKED_IN', { habitId }, 'Hábito cumplido');

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
        const cap = applyWaterDailyCap(requireSettledState(), amount);

        // Cupo agotado: no hay mutación y por lo tanto tampoco evento.
        if (cap.creditedLiters === 0) {
          return;
        }

        await commitWithUndo(cap.state, 'WATER_REGISTERED', { amount: cap.creditedLiters }, 'Agua registrada');
      },

      async registerPages(pages) {
        const result = applyPageDailyCap(requireSettledState(), pages);

        if (result.status === 'REJECTED') {
          return result;
        }

        if (result.creditedPages === 0) {
          return result;
        }

        await commitWithUndo(result.state, 'PAGES_REGISTERED', { pages: result.creditedPages }, 'Lectura registrada');

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
        const recorded = recordFocusSession(requireSettledState(), { ...input, id: focusSessionId });

        if (recorded.status === 'REJECTED') {
          return recorded;
        }

        // US-09 CA-03/CA-04: la liquidación va en el MISMO commit que el
        // registro (DEC-019). Dos escrituras dejarían una sesión cobrada sin
        // evento —o al revés— si la segunda falla.
        const liquidated = liquidateFocusSession(recorded.state, focusSessionId);

        await commitWithUndo(liquidated, 'FOCUS_SESSION_RECORDED', {
          focusSessionId,
          neighborhoodId: input.neighborhoodId,
          presetId: input.presetId,
          outcome: input.outcome,
          focusMinutes: recorded.state.focusSessions[focusSessionId]?.focusMinutes,
        }, 'Sesión de foco registrada');

        return { status: 'RECORDED', state: liquidated };
      },

      async pauseCity(reason) {
        const result = activateManualPause(requireSettledState(), reason, deps.now());

        if (result.status === 'REJECTED') {
          return result;
        }

        await commit(result.state, 'CITY_PAUSED_MANUALLY', { reason });

        return result;
      },

      async resumeCity() {
        const current = requireSettledState();

        // Sin pausa activa no hay reanudación: evita un evento fantasma.
        if (current.cityStatus !== 'MANUAL_PAUSE') {
          return;
        }

        await commit(resumeManualPause(current, deps.now()), 'CITY_RESUMED', {});
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

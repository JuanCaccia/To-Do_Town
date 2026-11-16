import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { CryptoIdAdapter } from '../../adapters/id/CryptoIdAdapter';
import { IndexedDBAdapter } from '../../adapters/storage/IndexedDBAdapter';
import { createDayZeroState } from '../../core/entities/dayZero';
import type { GameState } from '../../core/types';
import { createGameStore } from '../useGameStore';

const NOW = 1_700_000_000_000;
const LATER = NOW + 60_000;
const DAY_ONE_EVENING = new Date(2026, 0, 15, 22, 0).getTime();
const NEXT_MORNING = new Date(2026, 0, 16, 5, 0).getTime();
const TUTORIAL_NEIGHBORHOOD_ID = 'tutorial-neighborhood-id';
const TUTORIAL_COMPLEX_TASK_ID = 'tutorial-complex-task-id';
const TUTORIAL_STANDARD_TASK_ID = 'tutorial-standard-task-id';
const TUTORIAL_HABIT_ID = 'tutorial-habit-id';

function resetIndexedDB(): void {
  globalThis.indexedDB = new IDBFactory();
}

/**
 * Día Cero con el hábito semilla en Apagón. Estos tests aíslan la mecánica del
 * store (eventos fantasma, rotación de jornada), no la liquidación pasiva de
 * US-07: sin esto, cada tick devenga y muta el estado por diseño.
 */
function seedWithoutProduction(at: number): GameState {
  const state = createDayZeroState(at);
  const habit = state.habits['tutorial-habit-id'];

  return habit === undefined
    ? state
    : {
        ...state,
        habits: { ...state.habits, 'tutorial-habit-id': { ...habit, lastCompletedAt: 0 } },
      };
}

async function createHydratedStore(
  options: { now?: () => number; hydrateAt?: number; seed?: GameState } = {},
) {
  const adapter = new IndexedDBAdapter();
  const store = createGameStore({
    storage: adapter,
    unitOfWork: adapter,
    idPort: new CryptoIdAdapter(),
    now: options.now ?? (() => LATER),
  });

  if (options.seed) {
    await adapter.saveState(options.seed);
  }

  await store.getState().hydrate(options.hydrateAt ?? NOW);

  return { store, adapter };
}

describe('useGameStore — Fase 4: orquestación sobre el motor puro', () => {
  beforeEach(resetIndexedDB);

  it('hidrata el Día Cero y lo deja persistido cuando no hay snapshot previo', async () => {
    const { store, adapter } = await createHydratedStore();

    const state = store.getState().state;

    expect(state).not.toBeNull();
    expect(state?.cityStatus).toBe('ACTIVE');
    expect(await adapter.loadState()).toEqual(state);
  });

  it('crea el barrio con identidad del borde, purga el tutorial y persiste el snapshot', async () => {
    const { store, adapter } = await createHydratedStore();

    const neighborhoodId = await store
      .getState()
      .createNeighborhood({ name: 'GYM', paletteId: 'GYM_TEAL' });

    const state = store.getState().state;

    expect(neighborhoodId.length).toBeGreaterThan(0);
    expect(Object.keys(state?.neighborhoods ?? {})).toEqual([neighborhoodId]);
    expect(state?.neighborhoods[TUTORIAL_NEIGHBORHOOD_ID]).toBeUndefined();
    expect(state?.neighborhoods[neighborhoodId]?.name).toBe('GYM');
    expect(state?.neighborhoods[neighborhoodId]?.treasuryCoins).toBe(0);
    expect(state?.neighborhoods[neighborhoodId]?.blocks).toHaveLength(1);
    expect(state?.habits).toEqual({});
    expect(state?.tasks).toEqual({});
    expect(await adapter.loadState()).toEqual(state);
  });

  it('completa una tarea y persiste monedas, casa, XP y el evento del Outbox', async () => {
    const { store, adapter } = await createHydratedStore();

    await store.getState().completeTask(TUTORIAL_COMPLEX_TASK_ID);

    const state = store.getState().state;
    const neighborhood = state?.neighborhoods[TUTORIAL_NEIGHBORHOOD_ID];

    expect(state?.tasks[TUTORIAL_COMPLEX_TASK_ID]?.boardStatus).toBe('COMPLETED');
    expect(neighborhood?.treasuryCoins).toBe(600);
    expect(neighborhood?.urbanizationProgress).toBe(0);
    expect(neighborhood?.dailyTasksCompletedCount).toBe(1);
    expect(neighborhood?.blocks[0]?.houses).toHaveLength(4);
    expect(state?.globals.townHall).toEqual({ level: 1, qualityOfLifeXP: 10 });

    expect(await adapter.loadState()).toEqual(state);

    const events = await adapter.listPendingEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'TASK_COMPLETED',
      payload: { taskId: TUTORIAL_COMPLEX_TASK_ID },
      userId: 'local-owner',
      deviceId: 'desktop',
      syncedAt: null,
    });
  });

  it('no muta el estado ni el Outbox cuando el motor rechaza la acción', async () => {
    const { store, adapter } = await createHydratedStore();
    const neighborhoodId = await store
      .getState()
      .createNeighborhood({ name: 'Estudio', paletteId: 'STUDY_AMBER' });

    const before = store.getState().state;
    const eventsBefore = await adapter.listPendingEvents();

    const result = await store.getState().purchaseDecoration(neighborhoodId, 'SMALL_PLAZA');

    expect(result).toEqual({ status: 'REJECTED', reason: 'INSUFFICIENT_COINS' });
    expect(store.getState().state).toBe(before);
    expect(await adapter.loadState()).toEqual(before);
    expect(await adapter.listPendingEvents()).toEqual(eventsBefore);
  });

  it('no emite un segundo evento al completar dos veces la misma tarea', async () => {
    const { store, adapter } = await createHydratedStore();
    const eventsBefore = await adapter.listPendingEvents();

    await store.getState().completeTask(TUTORIAL_COMPLEX_TASK_ID);
    const afterFirstCompletion = store.getState().state;

    await store.getState().completeTask(TUTORIAL_COMPLEX_TASK_ID);

    expect(store.getState().state).toBe(afterFirstCompletion);
    expect(await adapter.listPendingEvents()).toHaveLength(eventsBefore.length + 1);
  });

  it('rechaza operar antes de hidratar el estado', async () => {
    const adapter = new IndexedDBAdapter();
    const store = createGameStore({
      storage: adapter,
      unitOfWork: adapter,
      idPort: new CryptoIdAdapter(),
      now: () => LATER,
    });

    await expect(store.getState().completeTask(TUTORIAL_COMPLEX_TASK_ID)).rejects.toThrow('hydrate');
  });

  it('no muta nada ni emite eventos si el día operativo no cambió', async () => {
    const { store, adapter } = await createHydratedStore({ seed: seedWithoutProduction(NOW) });
    const before = store.getState().state;
    const eventsBefore = await adapter.listPendingEvents();

    await store.getState().tick();

    expect(store.getState().state).toBe(before);
    expect(await adapter.listPendingEvents()).toEqual(eventsBefore);
  });

  it('rota la jornada: recicla tareas, resetea contadores y persiste un solo evento', async () => {
    let current = DAY_ONE_EVENING;
    const { store, adapter } = await createHydratedStore({
      now: () => current,
      hydrateAt: DAY_ONE_EVENING,
      seed: seedWithoutProduction(DAY_ONE_EVENING),
    });

    await store.getState().completeTask(TUTORIAL_COMPLEX_TASK_ID);
    await store.getState().moveTask(TUTORIAL_STANDARD_TASK_ID, 'IN_CONSTRUCTION');
    current = NEXT_MORNING;

    await store.getState().tick();

    const state = store.getState().state;
    const neighborhood = state?.neighborhoods[TUTORIAL_NEIGHBORHOOD_ID];

    expect(state?.lastOperationalDay).toBe('2026-01-16');
    expect(neighborhood?.lastOperationalDay).toBe('2026-01-16');
    expect(state?.tasks[TUTORIAL_STANDARD_TASK_ID]?.boardStatus).toBe('MASTER_PLAN');
    expect(state?.tasks[TUTORIAL_COMPLEX_TASK_ID]?.boardStatus).toBe('COMPLETED');
    expect(neighborhood?.dailyTasksCompletedCount).toBe(0);
    expect(state?.globals.aqueduct.dailyLiters).toBe(0);
    // No penalties: the coins earned yesterday stay in the treasury.
    expect(neighborhood?.treasuryCoins).toBe(600);

    expect(await adapter.loadState()).toEqual(state);

    const events = await adapter.listPendingEvents();

    // The Outbox is keyed by eventId (a UUID), so its read order is not
    // insertion order. Ordering, if needed, comes from each event's timestamp.
    expect(events.map((event) => event.type).sort()).toEqual([
      'OPERATIONAL_DAY_ROLLED_OVER',
      'TASK_COMPLETED',
      'TASK_MOVED',
    ]);
    expect(
      events.find((event) => event.type === 'OPERATIONAL_DAY_ROLLED_OVER')?.payload,
    ).toEqual({ operationalDay: '2026-01-16' });
  });
});

describe('useGameStore — US-06 Fase 4: acciones de hábitos', () => {
  beforeEach(resetIndexedDB);

  it('crea el hábito con identidad del borde, lo persiste y emite HABIT_CREATED', async () => {
    const { store, adapter } = await createHydratedStore();
    const neighborhoodId = await store
      .getState()
      .createNeighborhood({ name: 'GYM', paletteId: 'GYM_TEAL' });

    const result = await store.getState().createHabit({
      neighborhoodId,
      title: 'Entrenar Fuerza',
      frequency: { type: 'TIMES_PER_WEEK', count: 3 },
    });

    expect(result.status).toBe('CREATED');
    if (result.status !== 'CREATED') return;

    const habits = Object.entries(store.getState().state?.habits ?? {});
    expect(habits).toHaveLength(1);

    const [habitId, habit] = habits[0]!;
    expect(habit).toMatchObject({
      neighborhoodId,
      title: 'Entrenar Fuerza',
      status: 'ACTIVE',
      checkpointLevel: 1,
      currentStreakDays: 0,
    });
    expect(await adapter.loadState()).toEqual(store.getState().state);

    const events = await adapter.listPendingEvents();
    expect(events.find((event) => event.type === 'HABIT_CREATED')?.payload).toEqual({
      habitId,
      neighborhoodId,
      frequency: { type: 'TIMES_PER_WEEK', count: 3 },
    });
  });

  it('registra el check-in y no ensucia el Outbox cuando el hábito ya se cumplió hoy', async () => {
    const { store, adapter } = await createHydratedStore();

    const first = await store.getState().completeHabitToday(TUTORIAL_HABIT_ID);

    expect(first.status).toBe('COMPLETED');
    expect(store.getState().state?.habits[TUTORIAL_HABIT_ID]?.currentStreakDays).toBe(1);
    expect(await adapter.loadState()).toEqual(store.getState().state);

    const afterFirst = store.getState().state;
    const eventsBefore = await adapter.listPendingEvents();

    const second = await store.getState().completeHabitToday(TUTORIAL_HABIT_ID);

    expect(second).toEqual({ status: 'REJECTED', reason: 'ALREADY_COMPLETED_TODAY' });
    expect(store.getState().state).toBe(afterFirst);
    expect(await adapter.listPendingEvents()).toEqual(eventsBefore);
    expect(eventsBefore.map((event) => event.type)).toContain('HABIT_CHECKED_IN');
  });

  it('muda el hábito de barrio emitiendo HABIT_MOVED sin mover monedas', async () => {
    const { store, adapter } = await createHydratedStore();
    const originId = await store
      .getState()
      .createNeighborhood({ name: 'GYM', paletteId: 'GYM_TEAL' });
    const targetId = await store
      .getState()
      .createNeighborhood({ name: 'Estudio', paletteId: 'STUDY_AMBER' });

    const created = await store.getState().createHabit({
      neighborhoodId: originId,
      title: 'Leer documentación',
      frequency: { type: 'DAILY' },
    });
    if (created.status !== 'CREATED') throw new Error('setup: el alta falló');

    const habitId = Object.keys(store.getState().state?.habits ?? {})[0]!;
    const result = await store.getState().moveHabit(habitId, targetId);

    expect(result.status).toBe('MOVED');
    expect(store.getState().state?.habits[habitId]?.neighborhoodId).toBe(targetId);
    expect(await adapter.loadState()).toEqual(store.getState().state);

    const events = await adapter.listPendingEvents();
    expect(events.find((event) => event.type === 'HABIT_MOVED')?.payload).toEqual({
      habitId,
      targetNeighborhoodId: targetId,
    });
  });

  it('retira al Museo un hábito Nivel 5 y persiste los +300 XP del Ayuntamiento', async () => {
    const adapter = new IndexedDBAdapter();
    const seeded = createDayZeroState(NOW);
    seeded.habits[TUTORIAL_HABIT_ID] = {
      ...seeded.habits[TUTORIAL_HABIT_ID]!,
      checkpointLevel: 5,
      currentStreakDays: 100,
    };
    await adapter.saveState(seeded);

    const store = createGameStore({
      storage: adapter,
      unitOfWork: adapter,
      idPort: new CryptoIdAdapter(),
      now: () => LATER,
    });
    await store.getState().hydrate(NOW);

    const result = await store.getState().retireHabitToMuseum(TUTORIAL_HABIT_ID);

    expect(result.status).toBe('RETIRED');

    const state = store.getState().state;
    expect(state?.habits[TUTORIAL_HABIT_ID]).toMatchObject({
      status: 'RETIRED_TO_MUSEUM',
      retiredAt: LATER,
    });
    expect(state?.globals.townHall.qualityOfLifeXP).toBe(300);
    expect(await adapter.loadState()).toEqual(state);

    const events = await adapter.listPendingEvents();
    expect(events.map((event) => event.type)).toEqual(['HABIT_RETIRED_TO_MUSEUM']);
  });
});

describe('useGameStore — US-07 CA-03: ninguna acción muta sin liquidar (DEC-019)', () => {
  const HOUR = 3_600_000;
  const EARNING_HABIT_ID = TUTORIAL_HABIT_ID;

  /**
   * Un hábito de 3×/semana en un barrio Nv.1 tiene `T = 68 h`. Si el último
   * tick fue hace 40 h, la curva cruza su primer corte: 34 h al 100 % (170) más
   * 6 h al 66 % (20) devengan 190 monedas exactas.
   */
  function seedWithEarningHabit(at: number): GameState {
    const state = createDayZeroState(at);
    const habit = state.habits[EARNING_HABIT_ID]!;
    const neighborhood = state.neighborhoods[TUTORIAL_NEIGHBORHOOD_ID]!;

    return {
      ...state,
      lastTickAt: at - 40 * HOUR,
      neighborhoods: {
        ...state.neighborhoods,
        [TUTORIAL_NEIGHBORHOOD_ID]: {
          ...neighborhood,
          treasuryCoins: 0,
          pendingCoinsRemainder: 0,
        },
      },
      habits: {
        ...state.habits,
        [EARNING_HABIT_ID]: {
          ...habit,
          frequency: { type: 'TIMES_PER_WEEK', count: 3 },
          createdAt: at - 30 * 24 * HOUR,
          lastCompletedAt: at - 40 * HOUR,
        },
      },
    };
  }

  /** Las 190 monedas de 40 h de producción, ya acreditadas y sin resto pendiente. */
  function expectSettled(store: { getState(): { state: GameState | null } }): void {
    const state = store.getState().state;
    expect(state?.neighborhoods[TUTORIAL_NEIGHBORHOOD_ID]?.treasuryCoins).toBe(190);
    expect(state?.lastTickAt).toBe(NOW);
  }

  it('liquida lo devengado antes de reescribir lastCompletedAt con el check-in', async () => {
    const { store } = await createHydratedStore({
      now: () => NOW,
      seed: seedWithEarningHabit(NOW),
    });

    await store.getState().completeHabitToday(EARNING_HABIT_ID);

    expectSettled(store);
  });

  it('liquida antes de cualquier acción, también las que no tocan monedas', async () => {
    const { store } = await createHydratedStore({
      now: () => NOW,
      seed: seedWithEarningHabit(NOW),
    });

    await store.getState().createTask({
      neighborhoodId: TUTORIAL_NEIGHBORHOOD_ID,
      title: 'Comprar pintura',
      weight: 'SIMPLE',
    });

    expectSettled(store);
  });
});

describe('useGameStore — US-07 CA-04: piso seguro antes de cualquier mutación', () => {
  beforeEach(resetIndexedDB);

  const HOUR = 3_600_000;
  /** 3×/semana en un barrio Nv.1: T = (7/3)·24 + 12 = 68 h. */
  const BLACKOUT_HOURS = 70;

  /**
   * Hábito con checkpoint Nv.3 (piso 21 días) que ya superó su ventana y cayó
   * en Apagón. La racha arranca muy por encima del piso para que el retroceso
   * sea visible.
   */
  function seedInBlackout(at: number, streakDays: number): GameState {
    const state = createDayZeroState(at);
    const habit = state.habits[TUTORIAL_HABIT_ID]!;

    return {
      ...state,
      lastTickAt: at - BLACKOUT_HOURS * HOUR,
      habits: {
        ...state.habits,
        [TUTORIAL_HABIT_ID]: {
          ...habit,
          frequency: { type: 'TIMES_PER_WEEK', count: 3 },
          createdAt: at - 30 * 24 * HOUR,
          lastCompletedAt: at - BLACKOUT_HOURS * HOUR,
          currentStreakDays: streakDays,
          checkpointLevel: 3,
        },
      },
    };
  }

  it('un check-in no resucita la racha de un hábito que ya cayó en Apagón', async () => {
    const { store } = await createHydratedStore({
      now: () => NOW,
      seed: seedInBlackout(NOW, 35),
    });

    const result = await store.getState().completeHabitToday(TUTORIAL_HABIT_ID);

    expect(result.status).toBe('COMPLETED');
    // Piso del checkpoint Nv.3 (21) más el día que acaba de cumplir: 22. Si la
    // acción muta sin aplicar el piso, la racha resucita en 36.
    expect(store.getState().state?.habits[TUTORIAL_HABIT_ID]?.currentStreakDays).toBe(22);
  });

  it('el tick que sólo decae lo declara, no lo disfraza de liquidación de monedas', async () => {
    const { store, adapter } = await createHydratedStore({
      now: () => NOW,
      seed: seedInBlackout(NOW, 35),
    });

    await store.getState().tick();

    const events = await adapter.listPendingEvents();
    expect(events.map((event) => event.type)).toEqual(['HABIT_DECAYED_TO_SAFE_FLOOR']);
    expect(store.getState().state?.habits[TUTORIAL_HABIT_ID]?.currentStreakDays).toBe(21);
  });
});

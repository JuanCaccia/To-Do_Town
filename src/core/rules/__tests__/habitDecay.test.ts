import { describe, expect, it } from 'vitest';
import type { GameState, HabitBuilding, HabitCheckpointLevel } from '../../types';
import { createDayZeroState } from '../../entities/dayZero';
import { applySafeFloor } from '../habitDecay';

const NOW = 1_700_000_000_000;
const HOUR = 3_600_000;
const HABIT_ID = 'tutorial-habit-id';

// 3×/semana en un barrio Nv.1: T = (7/3)·24 + 12 + 0 = 68 h.
const WINDOW_HOURS = 68;

interface Setup {
  /** Días de racha acumulados antes de la caída. */
  streakDays: number;
  checkpointLevel: HabitCheckpointLevel;
  /** Horas transcurridas desde el último cumplimiento. */
  completedHoursAgo: number;
  status?: HabitBuilding['status'];
}

function stateWithHabit(setup: Setup): GameState {
  const state = createDayZeroState(NOW);
  const habit = state.habits[HABIT_ID]!;

  return {
    ...state,
    lastTickAt: NOW - setup.completedHoursAgo * HOUR,
    habits: {
      ...state.habits,
      [HABIT_ID]: {
        ...habit,
        frequency: { type: 'TIMES_PER_WEEK', count: 3 },
        createdAt: NOW - 30 * 24 * HOUR,
        lastCompletedAt: NOW - setup.completedHoursAgo * HOUR,
        currentStreakDays: setup.streakDays,
        checkpointLevel: setup.checkpointLevel,
        status: setup.status ?? 'ACTIVE',
      },
    },
  };
}

function habitOf(state: GameState): HabitBuilding {
  const habit = state.habits[HABIT_ID];
  if (!habit) throw new Error('fixture: falta el hábito');
  return habit;
}

describe('applySafeFloor — US-07 CA-04: retroceso al último checkpoint seguro', () => {
  it('retrocede la racha al piso del checkpoint alcanzado sin perder el nivel ni el edificio', () => {
    // Checkpoint Nv.3 = 21 días: la racha de 35 cae a 21, no a 0.
    const state = stateWithHabit({ streakDays: 35, checkpointLevel: 3, completedHoursAgo: 70 });

    const next = applySafeFloor(state, NOW);

    expect(habitOf(next).currentStreakDays).toBe(21);
    expect(habitOf(next).checkpointLevel).toBe(3);
    expect(habitOf(next).status).toBe('ACTIVE');
    expect(next.habits[HABIT_ID]).toBeDefined();
  });

  it('en el primer escalón el piso es cero: no hay checkpoint previo que conservar', () => {
    const state = stateWithHabit({ streakDays: 6, checkpointLevel: 1, completedHoursAgo: 70 });

    const next = applySafeFloor(state, NOW);

    expect(habitOf(next).currentStreakDays).toBe(0);
    expect(habitOf(next).checkpointLevel).toBe(1);
  });

  it('no toca la racha mientras la ventana siga vigente', () => {
    const state = stateWithHabit({ streakDays: 35, checkpointLevel: 3, completedHoursAgo: 40 });

    expect(applySafeFloor(state, NOW)).toBe(state);
  });

  it('cae al piso exactamente en t = T: el Apagón es inclusivo en la ventana', () => {
    const state = stateWithHabit({
      streakDays: 35,
      checkpointLevel: 3,
      completedHoursAgo: WINDOW_HOURS,
    });

    expect(habitOf(applySafeFloor(state, NOW)).currentStreakDays).toBe(21);
  });

  it('es idempotente: la segunda pasada devuelve el mismo estado y no vuelve a bajar nada', () => {
    const first = applySafeFloor(
      stateWithHabit({ streakDays: 35, checkpointLevel: 3, completedHoursAgo: 70 }),
      NOW,
    );

    expect(applySafeFloor(first, NOW)).toBe(first);
  });

  it('nunca sube la racha: el retroceso sólo baja hasta el piso', () => {
    // Estado inconsistente a propósito (racha por debajo de su checkpoint): el
    // piso no puede convertirse en un premio.
    const state = stateWithHabit({ streakDays: 5, checkpointLevel: 3, completedHoursAgo: 70 });

    const next = applySafeFloor(state, NOW);

    expect(habitOf(next).currentStreakDays).toBe(5);
    expect(next).toBe(state);
  });

  it('no decae un hábito pausado o retirado: sólo cae el que está activo', () => {
    for (const status of ['PAUSED', 'RETIRED_TO_MUSEUM'] as const) {
      const state = stateWithHabit({
        streakDays: 35,
        checkpointLevel: 3,
        completedHoursAgo: 70,
        status,
      });

      expect(applySafeFloor(state, NOW)).toBe(state);
    }
  });

  it('adelanta lastTickAt: la caída a Apagón es una mutación de negocio, no un latido', () => {
    const state = stateWithHabit({ streakDays: 35, checkpointLevel: 3, completedHoursAgo: 70 });

    expect(applySafeFloor(state, NOW).lastTickAt).toBe(NOW);
  });
});

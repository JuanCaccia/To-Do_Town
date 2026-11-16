import { describe, expect, it } from 'vitest';
import type { GameState, HabitBuilding } from '../../types';
import { createDayZeroState } from '../../entities/dayZero';
import { createHabit } from '../../entities/habit';
import { createNeighborhood } from '../../entities/neighborhood';
import { changeHabitFrequency } from '../habitFrequencyChange';

const NOW = 1_700_000_000_000;
const ONE_DAY = 24 * 3_600_000;

const NEIGHBORHOOD = { id: 'gym-neighborhood-id', name: 'GYM', paletteId: 'MINT_MORNING' };
const HABIT_ID = 'strength-habit-id';
const NEW_FREQUENCY = { type: 'DAILY' } as const;

function stateWithHabit(overrides: Partial<HabitBuilding> = {}): GameState {
  const base = createNeighborhood(createDayZeroState(NOW), NEIGHBORHOOD);
  const created = createHabit(
    base,
    {
      id: HABIT_ID,
      neighborhoodId: NEIGHBORHOOD.id,
      title: 'Entrenar Fuerza',
      frequency: { type: 'TIMES_PER_WEEK', count: 3 },
    },
    NOW,
  );

  if (created.status !== 'CREATED') throw new Error('setup: el alta del hábito falló');

  return {
    ...created.state,
    habits: {
      ...created.state.habits,
      [HABIT_ID]: { ...created.state.habits[HABIT_ID]!, ...overrides },
    },
  };
}

describe('changeHabitFrequency — US-06 CA-03: cambio de frecuencia con cooldown', () => {
  it.each([
    { level: 1 as const, floor: 0, streakBefore: 5 },
    { level: 2 as const, floor: 7, streakBefore: 12 },
    { level: 3 as const, floor: 21, streakBefore: 25 },
    { level: 4 as const, floor: 50, streakBefore: 60 },
    { level: 5 as const, floor: 100, streakBefore: 120 },
  ])(
    'conserva el nivel $level y reinicia la racha a su piso de $floor días',
    ({ level, floor, streakBefore }) => {
      const state = stateWithHabit({
        checkpointLevel: level,
        currentStreakDays: streakBefore,
        lastFrequencyChangeAt: null,
      });

      const result = changeHabitFrequency(state, HABIT_ID, NEW_FREQUENCY, NOW);

      expect(result.status).toBe('CHANGED');
      if (result.status !== 'CHANGED') return;

      expect(result.state.habits[HABIT_ID]).toMatchObject({
        frequency: NEW_FREQUENCY,
        checkpointLevel: level,
        currentStreakDays: floor,
        lastFrequencyChangeAt: NOW,
      });
    },
  );

  it('no muta el estado de entrada', () => {
    const state = stateWithHabit({ checkpointLevel: 3, currentStreakDays: 25 });
    const before = structuredClone(state);

    changeHabitFrequency(state, HABIT_ID, NEW_FREQUENCY, NOW);

    expect(state).toEqual(before);
  });

  it('no toca lastCompletedAt ni el Ayuntamiento', () => {
    const lastCompletedAt = NOW - 2 * ONE_DAY;
    const state = stateWithHabit({
      checkpointLevel: 2,
      currentStreakDays: 9,
      lastCompletedAt,
      lastFrequencyChangeAt: null,
    });

    const result = changeHabitFrequency(state, HABIT_ID, NEW_FREQUENCY, NOW);

    expect(result.status).toBe('CHANGED');
    if (result.status !== 'CHANGED') return;

    expect(result.state.habits[HABIT_ID]?.lastCompletedAt).toBe(lastCompletedAt);
    expect(result.state.globals.townHall.qualityOfLifeXP).toBe(0);
  });

  it('rechaza el cambio mientras el cooldown de 7 días siga activo', () => {
    const state = stateWithHabit({
      checkpointLevel: 2,
      currentStreakDays: 9,
      lastFrequencyChangeAt: NOW - 6 * ONE_DAY,
    });

    const result = changeHabitFrequency(state, HABIT_ID, NEW_FREQUENCY, NOW);

    expect(result).toEqual({ status: 'REJECTED', reason: 'FREQUENCY_COOLDOWN_ACTIVE' });
    expect(state.habits[HABIT_ID]?.frequency).toEqual({ type: 'TIMES_PER_WEEK', count: 3 });
  });

  it('habilita un nuevo cambio al cumplirse exactamente los 7 días', () => {
    const state = stateWithHabit({
      checkpointLevel: 2,
      currentStreakDays: 9,
      lastFrequencyChangeAt: NOW - 7 * ONE_DAY,
    });

    const result = changeHabitFrequency(state, HABIT_ID, NEW_FREQUENCY, NOW);

    expect(result.status).toBe('CHANGED');
    if (result.status !== 'CHANGED') return;
    expect(result.state.habits[HABIT_ID]?.lastFrequencyChangeAt).toBe(NOW);
  });

  it('rechaza un hábito inexistente', () => {
    const state = stateWithHabit();

    const result = changeHabitFrequency(state, 'missing-habit-id', NEW_FREQUENCY, NOW);

    expect(result).toEqual({ status: 'REJECTED', reason: 'HABIT_NOT_FOUND' });
  });
});

import { describe, expect, it } from 'vitest';
import type { GameState, HabitBuilding, TimestampMs } from '../../types';
import { createDayZeroState } from '../../entities/dayZero';
import { createHabit } from '../../entities/habit';
import { createNeighborhood } from '../../entities/neighborhood';
import { completeHabit } from '../habitCheckIn';

const NOW = 1_700_000_000_000;
const ONE_HOUR = 3_600_000;
const ONE_DAY = 24 * ONE_HOUR;

const NEIGHBORHOOD = { id: 'gym-neighborhood-id', name: 'GYM', paletteId: 'MINT_MORNING' };
const HABIT_ID = 'strength-habit-id';

function stateWithHabit(overrides: Partial<HabitBuilding> = {}, now: TimestampMs = NOW): GameState {
  const base = createNeighborhood(createDayZeroState(now), NEIGHBORHOOD);
  const created = createHabit(
    base,
    {
      id: HABIT_ID,
      neighborhoodId: NEIGHBORHOOD.id,
      title: 'Entrenar Fuerza',
      frequency: { type: 'TIMES_PER_WEEK', count: 3 },
    },
    now,
  );

  if (created.status !== 'CREATED') throw new Error('setup: el alta del hábito falló');

  return {
    ...created.state,
    habits: { ...created.state.habits, [HABIT_ID]: { ...created.state.habits[HABIT_ID]!, ...overrides } },
  };
}

describe('completeHabit — US-06 CA-02: check-in, racha y desbloqueo de checkpoints', () => {
  it('registra el cumplimiento del día y suma un día de racha sin tocar el Ayuntamiento', () => {
    const state = stateWithHabit();

    const result = completeHabit(state, HABIT_ID, NOW);

    expect(result.status).toBe('COMPLETED');
    if (result.status !== 'COMPLETED') return;

    expect(result.state.habits[HABIT_ID]).toMatchObject({
      lastCompletedAt: NOW,
      currentStreakDays: 1,
      checkpointLevel: 1,
      status: 'ACTIVE',
    });
    expect(result.state.globals.townHall.qualityOfLifeXP).toBe(0);
  });

  it('no muta el estado de entrada', () => {
    const state = stateWithHabit();
    const before = structuredClone(state);

    completeHabit(state, HABIT_ID, NOW);

    expect(state).toEqual(before);
  });

  it('rechaza un segundo check-in dentro del mismo día operativo', () => {
    const state = stateWithHabit();
    const first = completeHabit(state, HABIT_ID, NOW);
    if (first.status !== 'COMPLETED') throw new Error('setup: el primer check-in falló');

    const result = completeHabit(first.state, HABIT_ID, NOW + ONE_HOUR);

    expect(result).toEqual({ status: 'REJECTED', reason: 'ALREADY_COMPLETED_TODAY' });
    expect(first.state.habits[HABIT_ID]?.currentStreakDays).toBe(1);
  });

  it('acepta el check-in del día operativo siguiente', () => {
    const state = stateWithHabit();
    const first = completeHabit(state, HABIT_ID, NOW);
    if (first.status !== 'COMPLETED') throw new Error('setup: el primer check-in falló');

    const result = completeHabit(first.state, HABIT_ID, NOW + ONE_DAY);

    expect(result.status).toBe('COMPLETED');
    if (result.status !== 'COMPLETED') return;
    expect(result.state.habits[HABIT_ID]?.currentStreakDays).toBe(2);
  });

  it('rechaza un hábito que no está activo', () => {
    const state = stateWithHabit({ status: 'PAUSED' });

    const result = completeHabit(state, HABIT_ID, NOW);

    expect(result).toEqual({ status: 'REJECTED', reason: 'HABIT_NOT_ACTIVE' });
  });

  it('rechaza un hábito inexistente', () => {
    const state = stateWithHabit();

    const result = completeHabit(state, 'missing-habit-id', NOW);

    expect(result).toEqual({ status: 'REJECTED', reason: 'HABIT_NOT_FOUND' });
  });

  it.each([
    { streakBefore: 6, fromLevel: 1 as const, level: 2 as const, townHallXp: 25 },
    { streakBefore: 20, fromLevel: 2 as const, level: 3 as const, townHallXp: 50 },
    { streakBefore: 49, fromLevel: 3 as const, level: 4 as const, townHallXp: 100 },
    { streakBefore: 99, fromLevel: 4 as const, level: 5 as const, townHallXp: 250 },
  ])(
    'sube al nivel $level y acredita $townHallXp XP al llegar al piso de $streakBefore + 1 días',
    ({ streakBefore, fromLevel, level, townHallXp }) => {
      const state = stateWithHabit({
        currentStreakDays: streakBefore,
        checkpointLevel: fromLevel,
      });

      const result = completeHabit(state, HABIT_ID, NOW);

      expect(result.status).toBe('COMPLETED');
      if (result.status !== 'COMPLETED') return;

      expect(result.state.habits[HABIT_ID]).toMatchObject({
        currentStreakDays: streakBefore + 1,
        checkpointLevel: level,
      });
      expect(result.state.globals.townHall.qualityOfLifeXP).toBe(townHallXp);
    },
  );

  it('no vuelve a acreditar el XP de un checkpoint ya desbloqueado', () => {
    const state = stateWithHabit({ currentStreakDays: 8, checkpointLevel: 2 });
    state.globals.townHall.qualityOfLifeXP = 25;

    const result = completeHabit(state, HABIT_ID, NOW);

    expect(result.status).toBe('COMPLETED');
    if (result.status !== 'COMPLETED') return;

    expect(result.state.habits[HABIT_ID]).toMatchObject({
      currentStreakDays: 9,
      checkpointLevel: 2,
    });
    expect(result.state.globals.townHall.qualityOfLifeXP).toBe(25);
  });
});

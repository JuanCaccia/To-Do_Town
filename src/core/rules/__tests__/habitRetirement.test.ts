import { describe, expect, it } from 'vitest';
import type { GameState, HabitBuilding } from '../../types';
import { createDayZeroState } from '../../entities/dayZero';
import { createHabit } from '../../entities/habit';
import { createNeighborhood } from '../../entities/neighborhood';
import { retireHabit } from '../habitRetirement';

const NOW = 1_700_000_000_000;

const NEIGHBORHOOD = { id: 'gym-neighborhood-id', name: 'GYM', paletteId: 'MINT_MORNING' };
const HABIT_ID = 'strength-habit-id';

function stateWithHabit(overrides: Partial<HabitBuilding> = {}): GameState {
  const base = createNeighborhood(createDayZeroState(NOW), NEIGHBORHOOD);
  const created = createHabit(
    base,
    {
      id: HABIT_ID,
      neighborhoodId: NEIGHBORHOOD.id,
      title: 'Entrenar Fuerza',
      frequency: { type: 'DAILY' },
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

function habitInput(id: string) {
  return {
    id,
    neighborhoodId: NEIGHBORHOOD.id,
    title: `Hábito ${id}`,
    frequency: { type: 'DAILY' } as const,
  };
}

describe('retireHabit — US-06 CA-05: retiro con honores al Museo en Nivel 5', () => {
  it('retira el hábito al Museo sellando retiredAt y acreditando +300 XP al Ayuntamiento', () => {
    const state = stateWithHabit({ checkpointLevel: 5, currentStreakDays: 100 });

    const result = retireHabit(state, HABIT_ID, NOW);

    expect(result.status).toBe('RETIRED');
    if (result.status !== 'RETIRED') return;

    expect(result.state.habits[HABIT_ID]).toMatchObject({
      status: 'RETIRED_TO_MUSEUM',
      retiredAt: NOW,
      checkpointLevel: 5,
      currentStreakDays: 100,
    });
    expect(result.state.globals.townHall.qualityOfLifeXP).toBe(300);
  });

  it('suma los +300 XP al XP que el Ayuntamiento ya tenía', () => {
    const state = stateWithHabit({ checkpointLevel: 5, currentStreakDays: 120 });
    state.globals.townHall.qualityOfLifeXP = 25;

    const result = retireHabit(state, HABIT_ID, NOW);

    expect(result.status).toBe('RETIRED');
    if (result.status !== 'RETIRED') return;
    expect(result.state.globals.townHall.qualityOfLifeXP).toBe(325);
  });

  it('libera el lote: el barrio vuelve a aceptar un hábito nuevo', () => {
    let state = createNeighborhood(createDayZeroState(NOW), NEIGHBORHOOD);

    for (const id of ['habit-a', 'habit-b', 'habit-c', HABIT_ID]) {
      const created = createHabit(state, habitInput(id), NOW);
      if (created.status !== 'CREATED') throw new Error(`setup falló en ${id}`);
      state = created.state;
    }

    const maxed: HabitBuilding = {
      ...state.habits[HABIT_ID]!,
      checkpointLevel: 5,
      currentStreakDays: 100,
    };
    state = { ...state, habits: { ...state.habits, [HABIT_ID]: maxed } };

    expect(createHabit(state, habitInput('habit-e'), NOW).status).toBe('REJECTED');

    const retired = retireHabit(state, HABIT_ID, NOW);
    if (retired.status !== 'RETIRED') throw new Error('setup: el retiro falló');

    const created = createHabit(retired.state, habitInput('habit-e'), NOW);

    expect(created.status).toBe('CREATED');
  });

  it('no muta el estado de entrada', () => {
    const state = stateWithHabit({ checkpointLevel: 5, currentStreakDays: 100 });
    const before = structuredClone(state);

    retireHabit(state, HABIT_ID, NOW);

    expect(state).toEqual(before);
  });

  it('rechaza el retiro si el hábito no alcanzó el Nivel 5', () => {
    const state = stateWithHabit({ checkpointLevel: 4, currentStreakDays: 60 });

    const result = retireHabit(state, HABIT_ID, NOW);

    expect(result).toEqual({ status: 'REJECTED', reason: 'MAX_CHECKPOINT_NOT_REACHED' });
    expect(state.globals.townHall.qualityOfLifeXP).toBe(0);
  });

  it('rechaza retirar dos veces el mismo hábito y no vuelve a acreditar XP', () => {
    const state = stateWithHabit({ checkpointLevel: 5, currentStreakDays: 100 });
    const first = retireHabit(state, HABIT_ID, NOW);
    if (first.status !== 'RETIRED') throw new Error('setup: el retiro falló');

    const result = retireHabit(first.state, HABIT_ID, NOW);

    expect(result).toEqual({ status: 'REJECTED', reason: 'HABIT_NOT_ACTIVE' });
    expect(first.state.globals.townHall.qualityOfLifeXP).toBe(300);
  });

  it('rechaza un hábito inexistente', () => {
    const state = stateWithHabit({ checkpointLevel: 5, currentStreakDays: 100 });

    const result = retireHabit(state, 'missing-habit-id', NOW);

    expect(result).toEqual({ status: 'REJECTED', reason: 'HABIT_NOT_FOUND' });
  });
});

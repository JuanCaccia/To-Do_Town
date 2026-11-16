import { describe, expect, it } from 'vitest';
import type { GameState, HabitBuilding } from '../../types';
import { createDayZeroState } from '../dayZero';
import { createHabit } from '../habit';
import { createNeighborhood } from '../neighborhood';

const NOW = 1_700_000_000_000;

const NEIGHBORHOOD = { id: 'gym-neighborhood-id', name: 'GYM', paletteId: 'MINT_MORNING' };

function emptyNeighborhoodState(): GameState {
  return createNeighborhood(createDayZeroState(NOW), NEIGHBORHOOD);
}

function habitInput(id: string) {
  return {
    id,
    neighborhoodId: NEIGHBORHOOD.id,
    title: `Hábito ${id}`,
    frequency: { type: 'TIMES_PER_WEEK', count: 3 } as const,
  };
}

describe('createHabit — US-06 CA-01: alta de hábito y límite de 4 lotes productivos', () => {
  it('registra el hábito en estado inicial Pleno dentro del barrio indicado', () => {
    const state = emptyNeighborhoodState();

    const result = createHabit(state, habitInput('strength-habit-id'), NOW);

    expect(result.status).toBe('CREATED');
    if (result.status !== 'CREATED') return;

    expect(result.state.habits['strength-habit-id']).toEqual({
      neighborhoodId: NEIGHBORHOOD.id,
      title: 'Hábito strength-habit-id',
      frequency: { type: 'TIMES_PER_WEEK', count: 3 },
      currentStreakDays: 0,
      checkpointLevel: 1,
      lastCompletedAt: null,
      createdAt: NOW,
      lastFrequencyChangeAt: null,
      retiredAt: null,
      status: 'ACTIVE',
    });
  });

  it('rechaza el quinto hábito cuando los 4 lotes productivos están ocupados', () => {
    let state = emptyNeighborhoodState();

    for (const id of ['habit-a', 'habit-b', 'habit-c', 'habit-d']) {
      const result = createHabit(state, habitInput(id), NOW);
      if (result.status !== 'CREATED') throw new Error(`setup falló en ${id}`);
      state = result.state;
    }

    const result = createHabit(state, habitInput('habit-e'), NOW);

    expect(result).toEqual({ status: 'REJECTED', reason: 'PRODUCTIVE_LOTS_FULL' });
    expect(state.habits['habit-e']).toBeUndefined();
  });

  it('no ocupa lote un hábito retirado al Museo: el alta sigue habilitada', () => {
    let state = emptyNeighborhoodState();

    for (const id of ['habit-a', 'habit-b', 'habit-c', 'habit-d']) {
      const result = createHabit(state, habitInput(id), NOW);
      if (result.status !== 'CREATED') throw new Error(`setup falló en ${id}`);
      state = result.state;
    }

    const retired: HabitBuilding = { ...state.habits['habit-d']!, status: 'RETIRED_TO_MUSEUM' };
    state = { ...state, habits: { ...state.habits, 'habit-d': retired } };

    const result = createHabit(state, habitInput('habit-e'), NOW);

    expect(result.status).toBe('CREATED');
    if (result.status !== 'CREATED') return;
    expect(result.state.habits['habit-e']?.status).toBe('ACTIVE');
  });
});

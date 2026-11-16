import { describe, expect, it } from 'vitest';
import type { GameState, HabitBuilding } from '../../types';
import { createDayZeroState } from '../../entities/dayZero';
import { createHabit } from '../../entities/habit';
import { createNeighborhood } from '../../entities/neighborhood';
import { moveHabit } from '../habitRelocation';

const NOW = 1_700_000_000_000;
const ONE_DAY = 24 * 3_600_000;

const ORIGIN = { id: 'gym-neighborhood-id', name: 'GYM', paletteId: 'MINT_MORNING' };
const TARGET = { id: 'study-neighborhood-id', name: 'Estudio', paletteId: 'SLATE_NOON' };
const HABIT_ID = 'reading-habit-id';

function twoNeighborhoodState(overrides: Partial<HabitBuilding> = {}): GameState {
  let state = createNeighborhood(createDayZeroState(NOW), ORIGIN);
  state = createNeighborhood(state, TARGET);

  const created = createHabit(
    state,
    {
      id: HABIT_ID,
      neighborhoodId: ORIGIN.id,
      title: 'Leer documentación',
      frequency: { type: 'TIMES_PER_WEEK', count: 4 },
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
    neighborhoods: {
      ...created.state.neighborhoods,
      [ORIGIN.id]: { ...created.state.neighborhoods[ORIGIN.id]!, treasuryCoins: 200 },
      [TARGET.id]: { ...created.state.neighborhoods[TARGET.id]!, treasuryCoins: 50 },
    },
  };
}

function fillTargetLots(state: GameState): GameState {
  let next = state;

  for (const id of ['target-habit-a', 'target-habit-b', 'target-habit-c', 'target-habit-d']) {
    const result = createHabit(
      next,
      {
        id,
        neighborhoodId: TARGET.id,
        title: `Hábito ${id}`,
        frequency: { type: 'DAILY' },
      },
      NOW,
    );
    if (result.status !== 'CREATED') throw new Error(`setup falló en ${id}`);
    next = result.state;
  }

  return next;
}

describe('moveHabit — US-06 CA-04: mudanza entre barrios con economía estanca', () => {
  it('reasigna el hábito al barrio destino conservando nivel, racha y último cumplimiento', () => {
    const state = twoNeighborhoodState({
      checkpointLevel: 3,
      currentStreakDays: 23,
      lastCompletedAt: NOW - 2 * ONE_DAY,
    });

    const result = moveHabit(state, HABIT_ID, TARGET.id);

    expect(result.status).toBe('MOVED');
    if (result.status !== 'MOVED') return;

    expect(result.state.habits[HABIT_ID]).toMatchObject({
      neighborhoodId: TARGET.id,
      checkpointLevel: 3,
      currentStreakDays: 23,
      lastCompletedAt: NOW - 2 * ONE_DAY,
    });
  });

  it('deja las tesorerías de origen y destino intactas', () => {
    const state = twoNeighborhoodState();

    const result = moveHabit(state, HABIT_ID, TARGET.id);

    expect(result.status).toBe('MOVED');
    if (result.status !== 'MOVED') return;

    expect(result.state.neighborhoods[ORIGIN.id]?.treasuryCoins).toBe(200);
    expect(result.state.neighborhoods[TARGET.id]?.treasuryCoins).toBe(50);
  });

  it('no muta el estado de entrada', () => {
    const state = twoNeighborhoodState();
    const before = structuredClone(state);

    moveHabit(state, HABIT_ID, TARGET.id);

    expect(state).toEqual(before);
  });

  it('rechaza la mudanza si el barrio destino no tiene lote productivo libre', () => {
    const state = fillTargetLots(twoNeighborhoodState());

    const result = moveHabit(state, HABIT_ID, TARGET.id);

    expect(result).toEqual({ status: 'REJECTED', reason: 'PRODUCTIVE_LOTS_FULL' });
    expect(state.habits[HABIT_ID]?.neighborhoodId).toBe(ORIGIN.id);
  });

  it('rechaza mover un hábito que ya está retirado al Museo', () => {
    const state = twoNeighborhoodState({ status: 'RETIRED_TO_MUSEUM' });

    const result = moveHabit(state, HABIT_ID, TARGET.id);

    expect(result).toEqual({ status: 'REJECTED', reason: 'HABIT_NOT_ACTIVE' });
  });

  it('rechaza mover un hábito al mismo barrio', () => {
    const state = twoNeighborhoodState();

    const result = moveHabit(state, HABIT_ID, ORIGIN.id);

    expect(result).toEqual({ status: 'REJECTED', reason: 'SAME_NEIGHBORHOOD' });
  });

  it('rechaza un barrio destino inexistente', () => {
    const state = twoNeighborhoodState();

    const result = moveHabit(state, HABIT_ID, 'missing-neighborhood-id');

    expect(result).toEqual({ status: 'REJECTED', reason: 'NEIGHBORHOOD_NOT_FOUND' });
  });

  it('rechaza un hábito inexistente', () => {
    const state = twoNeighborhoodState();

    const result = moveHabit(state, 'missing-habit-id', TARGET.id);

    expect(result).toEqual({ status: 'REJECTED', reason: 'HABIT_NOT_FOUND' });
  });
});

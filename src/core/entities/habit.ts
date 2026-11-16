import type { EntityId, GameState, HabitBuilding, HabitFrequency, TimestampMs } from '../types';

const PRODUCTIVE_LOTS = 4;

export { PRODUCTIVE_LOTS };

export interface NewHabitInput {
  id: EntityId;
  neighborhoodId: EntityId;
  title: string;
  frequency: HabitFrequency;
}

export type HabitCreationRejection = 'PRODUCTIVE_LOTS_FULL';

export type HabitCreationResult =
  | { status: 'CREATED'; state: GameState }
  | { status: 'REJECTED'; reason: HabitCreationRejection };

export function createHabit(
  state: GameState,
  input: NewHabitInput,
  now: TimestampMs,
): HabitCreationResult {
  if (!hasFreeProductiveLot(state, input.neighborhoodId)) {
    return { status: 'REJECTED', reason: 'PRODUCTIVE_LOTS_FULL' };
  }

  const habit: HabitBuilding = {
    neighborhoodId: input.neighborhoodId,
    title: input.title,
    frequency: input.frequency,
    currentStreakDays: 0,
    checkpointLevel: 1,
    lastCompletedAt: null,
    createdAt: now,
    lastFrequencyChangeAt: null,
    retiredAt: null,
    status: 'ACTIVE',
  };

  return {
    status: 'CREATED',
    state: {
      ...state,
      habits: { ...state.habits, [input.id]: habit },
    },
  };
}

/**
 * Capacidad de la Plaza de Infraestructura: 4 lotes productivos por barrio.
 * Un hábito retirado al Museo libera su lote; uno pausado lo sigue ocupando.
 */
export function hasFreeProductiveLot(state: GameState, neighborhoodId: EntityId): boolean {
  return countProductiveHabits(state, neighborhoodId) < PRODUCTIVE_LOTS;
}

function countProductiveHabits(state: GameState, neighborhoodId: EntityId): number {
  return Object.values(state.habits).filter(
    (habit) => habit.neighborhoodId === neighborhoodId && habit.status !== 'RETIRED_TO_MUSEUM',
  ).length;
}

export { countProductiveHabits };

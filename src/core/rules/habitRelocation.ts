import { hasFreeProductiveLot } from '../entities/habit';
import type { EntityId, GameState, HabitBuilding } from '../types';

export type HabitRelocationRejection =
  | 'HABIT_NOT_FOUND'
  | 'HABIT_NOT_ACTIVE'
  | 'NEIGHBORHOOD_NOT_FOUND'
  | 'SAME_NEIGHBORHOOD'
  | 'PRODUCTIVE_LOTS_FULL';

export type HabitRelocationResult =
  | { status: 'MOVED'; state: GameState }
  | { status: 'REJECTED'; reason: HabitRelocationRejection };

export function moveHabit(
  state: GameState,
  habitId: EntityId,
  targetNeighborhoodId: EntityId,
): HabitRelocationResult {
  const habit = state.habits[habitId];

  if (habit === undefined) {
    return { status: 'REJECTED', reason: 'HABIT_NOT_FOUND' };
  }

  if (habit.status !== 'ACTIVE') {
    return { status: 'REJECTED', reason: 'HABIT_NOT_ACTIVE' };
  }

  if (state.neighborhoods[targetNeighborhoodId] === undefined) {
    return { status: 'REJECTED', reason: 'NEIGHBORHOOD_NOT_FOUND' };
  }

  if (habit.neighborhoodId === targetNeighborhoodId) {
    return { status: 'REJECTED', reason: 'SAME_NEIGHBORHOOD' };
  }

  if (!hasFreeProductiveLot(state, targetNeighborhoodId)) {
    return { status: 'REJECTED', reason: 'PRODUCTIVE_LOTS_FULL' };
  }

  // El hábito viaja entero: nivel, racha y último cumplimiento no se tocan, y las
  // monedas ya generadas se quedan en el treasuryCoins del barrio de origen (US-06
  // CA-04). La eficiencia en el destino se deriva de lastCompletedAt, no se recalcula.
  const moved: HabitBuilding = { ...habit, neighborhoodId: targetNeighborhoodId };

  return {
    status: 'MOVED',
    state: { ...state, habits: { ...state.habits, [habitId]: moved } },
  };
}

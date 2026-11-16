import { HABIT_MUSEUM_RETIREMENT_TOWN_HALL_XP } from '../constants/economyConstants';
import type { EntityId, GameState, HabitBuilding, TimestampMs } from '../types';
import { withQualityOfLifeXp } from './townHallLevel';

const MAX_CHECKPOINT_LEVEL = 5;

export type HabitRetirementRejection =
  | 'HABIT_NOT_FOUND'
  | 'HABIT_NOT_ACTIVE'
  | 'MAX_CHECKPOINT_NOT_REACHED';

export type HabitRetirementResult =
  | { status: 'RETIRED'; state: GameState }
  | { status: 'REJECTED'; reason: HabitRetirementRejection };

export function retireHabit(
  state: GameState,
  habitId: EntityId,
  now: TimestampMs,
): HabitRetirementResult {
  const habit = state.habits[habitId];

  if (habit === undefined) {
    return { status: 'REJECTED', reason: 'HABIT_NOT_FOUND' };
  }

  // Un hábito ya retirado no está activo: sin este guard, el Museo pagaría los
  // +300 XP una y otra vez (US-06 CA-05).
  if (habit.status !== 'ACTIVE') {
    return { status: 'REJECTED', reason: 'HABIT_NOT_ACTIVE' };
  }

  if (habit.checkpointLevel !== MAX_CHECKPOINT_LEVEL) {
    return { status: 'REJECTED', reason: 'MAX_CHECKPOINT_NOT_REACHED' };
  }

  const retired: HabitBuilding = {
    ...habit,
    status: 'RETIRED_TO_MUSEUM',
    retiredAt: now,
  };

  return {
    status: 'RETIRED',
    state: {
      ...state,
      habits: { ...state.habits, [habitId]: retired },
      globals: {
        ...state.globals,
        townHall: withQualityOfLifeXp(
          state.globals.townHall,
          HABIT_MUSEUM_RETIREMENT_TOWN_HALL_XP,
        ),
      },
    },
  };
}

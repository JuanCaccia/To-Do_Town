import { HABIT_CHECKPOINTS } from '../constants/economyConstants';
import type { EntityId, GameState, HabitBuilding, TimestampMs } from '../types';
import { getOperationalDay } from './dayCycle';
import { withQualityOfLifeXp } from './townHallLevel';

export type HabitCheckInRejection =
  | 'HABIT_NOT_FOUND'
  | 'HABIT_NOT_ACTIVE'
  | 'ALREADY_COMPLETED_TODAY';

export type HabitCheckInResult =
  | { status: 'COMPLETED'; state: GameState }
  | { status: 'REJECTED'; reason: HabitCheckInRejection };

export function completeHabit(
  state: GameState,
  habitId: EntityId,
  now: TimestampMs,
): HabitCheckInResult {
  const habit = state.habits[habitId];

  if (habit === undefined) {
    return { status: 'REJECTED', reason: 'HABIT_NOT_FOUND' };
  }

  if (habit.status !== 'ACTIVE') {
    return { status: 'REJECTED', reason: 'HABIT_NOT_ACTIVE' };
  }

  if (habit.lastCompletedAt !== null && isSameOperationalDay(state, habit.lastCompletedAt, now)) {
    return { status: 'REJECTED', reason: 'ALREADY_COMPLETED_TODAY' };
  }

  const currentStreakDays = habit.currentStreakDays + 1;
  const unlockedTier = HABIT_CHECKPOINTS.find((tier) => tier.streakDays === currentStreakDays);

  const completed: HabitBuilding = {
    ...habit,
    lastCompletedAt: now,
    currentStreakDays,
    checkpointLevel: unlockedTier?.level ?? habit.checkpointLevel,
  };

  return {
    status: 'COMPLETED',
    state: {
      ...state,
      habits: { ...state.habits, [habitId]: completed },
      globals:
        unlockedTier === undefined
          ? state.globals
          : {
              ...state.globals,
              townHall: withQualityOfLifeXp(state.globals.townHall, unlockedTier.townHallXp),
            },
    },
  };
}

function isSameOperationalDay(state: GameState, left: TimestampMs, right: TimestampMs): boolean {
  return (
    getOperationalDay(left, state.config.dayCycle) === getOperationalDay(right, state.config.dayCycle)
  );
}

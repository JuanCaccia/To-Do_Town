import { HABIT_CHECKPOINTS, HABIT_FREQUENCY_CHANGE_COOLDOWN_MS } from '../constants/economyConstants';
import type { EntityId, GameState, HabitBuilding, HabitFrequency, TimestampMs } from '../types';

export type HabitFrequencyChangeRejection = 'HABIT_NOT_FOUND' | 'FREQUENCY_COOLDOWN_ACTIVE';

export type HabitFrequencyChangeResult =
  | { status: 'CHANGED'; state: GameState }
  | { status: 'REJECTED'; reason: HabitFrequencyChangeRejection };

export function changeHabitFrequency(
  state: GameState,
  habitId: EntityId,
  frequency: HabitFrequency,
  now: TimestampMs,
): HabitFrequencyChangeResult {
  const habit = state.habits[habitId];

  if (habit === undefined) {
    return { status: 'REJECTED', reason: 'HABIT_NOT_FOUND' };
  }

  if (
    habit.lastFrequencyChangeAt !== null &&
    now - habit.lastFrequencyChangeAt < HABIT_FREQUENCY_CHANGE_COOLDOWN_MS
  ) {
    return { status: 'REJECTED', reason: 'FREQUENCY_COOLDOWN_ACTIVE' };
  }

  const changed: HabitBuilding = {
    ...habit,
    frequency,
    currentStreakDays: checkpointFloorDays(habit),
    lastFrequencyChangeAt: now,
  };

  return {
    status: 'CHANGED',
    state: { ...state, habits: { ...state.habits, [habitId]: changed } },
  };
}

// El piso es el umbral que desbloqueó el checkpoint actual; el nivel 1 nunca se
// desbloqueó, así que su piso es 0 y no 1 (ver BACKLOG US-06 CA-03).
function checkpointFloorDays(habit: HabitBuilding): number {
  const tier = HABIT_CHECKPOINTS.find((entry) => entry.level === habit.checkpointLevel);

  return tier?.streakDays ?? 0;
}

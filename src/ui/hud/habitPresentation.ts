import { PRODUCTIVE_LOTS, countProductiveHabits } from '../../core/entities/habit';
import { getOperationalDay } from '../../core/rules/dayCycle';
import type { GameState, HabitFrequency, TimestampMs } from '../../core/types';

/**
 * Display-only helpers for the habit surfaces of the HUD.
 *
 * Nothing here decides whether an action is legal: the store answers that with
 * a rejection reason, and these helpers only format data already in the state.
 */

/** Capacity of the Plaza de Infraestructura, owned by the domain. */
export const PRODUCTIVE_LOT_CAPACITY = PRODUCTIVE_LOTS;

/**
 * A retired habit frees its lot, a paused one keeps it (US-06 CA-01). The
 * predicate itself lives in `core/entities/habit.ts`; the HUD must not restate it.
 */
export const countOccupiedProductiveLots = countProductiveHabits;

export function formatHabitFrequency(frequency: HabitFrequency): string {
  return frequency.type === 'DAILY' ? 'DIARIO' : `${frequency.count}×/SEMANA`;
}

/** Retirement date as `DD/MM/YYYY` in local time, without a locale lookup. */
export function formatRetirementDate(timestamp: TimestampMs): string {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${day}/${month}/${date.getFullYear()}`;
}

/**
 * US-06 CA-02: a check-in belongs to an operational day, not to a calendar date.
 * The comparison is made against the present instant — never against
 * `state.lastOperationalDay`, which is only as fresh as the last tick — so the
 * HUD agrees with the rule the moment it would accept or refuse the check-in.
 */
export function isCompletedOnCurrentOperationalDay(
  state: GameState,
  lastCompletedAt: TimestampMs | null,
  now: TimestampMs = Date.now(),
): boolean {
  if (lastCompletedAt === null) {
    return false;
  }

  return (
    getOperationalDay(lastCompletedAt, state.config.dayCycle) ===
    getOperationalDay(now, state.config.dayCycle)
  );
}

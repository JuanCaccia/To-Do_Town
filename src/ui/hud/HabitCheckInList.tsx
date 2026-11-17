import { useState } from 'react';
import type { HabitCheckInRejection } from '../../core/rules/habitCheckIn';
import type { EntityId, GameState } from '../../core/types';
import { useGameStore } from '../../state/useGameStore';
import { formatHabitFrequency, isCompletedOnCurrentOperationalDay } from './habitPresentation';
import { BADGE_ON_LIGHT, BUTTON_PRIMARY_ON_LIGHT, NOTICE_ON_LIGHT, SectionLabel } from './primitives';

const CHECK_IN_REJECTION_TEXT = {
  HABIT_NOT_FOUND: 'El hábito ya no existe.',
  CITY_PAUSED: 'La ciudad está en pausa. Reanudala para completar hábitos.',
  HABIT_NOT_ACTIVE: 'El hábito no está activo.',
  ALREADY_COMPLETED_TODAY: 'El hábito ya se cumplió hoy.',
} as const satisfies Record<HabitCheckInRejection, string>;

const ROW = 'relative px-4 py-3 after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-black/15 last:after:hidden';

/**
 * Daily check-in of the active habits, inside the Drawer's "En Obra (Hoy)"
 * tab. A habit already completed on the current operational day stays visible
 * but disabled; the store owns the refusal and its reason.
 */
export function HabitCheckInList({ state }: { state: GameState }) {
  const completeHabitToday = useGameStore((store) => store.completeHabitToday);

  const [pendingId, setPendingId] = useState<EntityId | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isPaused = state.cityStatus !== 'ACTIVE';

  const habits = Object.entries(state.habits).filter(
    ([, habit]) => habit.status === 'ACTIVE',
  );

  async function handleCheckIn(habitId: EntityId) {
    setPendingId(habitId);
    const result = await completeHabitToday(habitId);
    setPendingId(null);

    setMessage(result.status === 'REJECTED' ? CHECK_IN_REJECTION_TEXT[result.reason] : null);
  }

  return (
    <div>
      <div className="px-4 pt-4">
        <SectionLabel>Hábitos de Hoy</SectionLabel>
        {isPaused && (
          <p className={`mt-2 ${NOTICE_ON_LIGHT}`}>
            Ciudad en pausa. Reanudala para completar hábitos.
          </p>
        )}
      </div>

      <ul>
        {habits.length === 0 && (
          <li className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-neutral-600">
            Sin hábitos activos.
          </li>
        )}

        {habits.map(([habitId, habit]) => {
          const isDoneToday = isCompletedOnCurrentOperationalDay(state, habit.lastCompletedAt);
          const neighborhood = state.neighborhoods[habit.neighborhoodId];

          return (
            <li key={habitId} className={ROW}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-bold text-black">{habit.title}</span>
                <span className={BADGE_ON_LIGHT}>NV.{habit.checkpointLevel}</span>
              </div>

              <div className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-neutral-600">
                {neighborhood?.name ?? 'Barrio eliminado'} · {formatHabitFrequency(habit.frequency)}{' '}
                · Racha <span className="text-black">{habit.currentStreakDays}</span> d
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  disabled={isDoneToday || pendingId !== null || isPaused}
                  onClick={() => void handleCheckIn(habitId)}
                  className={`${BUTTON_PRIMARY_ON_LIGHT} px-3 py-1.5`}
                >
                  {isDoneToday ? 'Cumplido Hoy' : 'Cumplir Hoy'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {message !== null && (
        <p
          className="mx-4 mt-3 mb-4 border border-red-800 bg-red-600/10 px-3 py-2 font-mono text-xs text-red-900"
          role="alert"
        >
          {message}
        </p>
      )}
    </div>
  );
}

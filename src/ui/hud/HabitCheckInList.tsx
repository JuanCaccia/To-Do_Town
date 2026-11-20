import { useState } from 'react';
import type { HabitCheckInRejection } from '../../core/rules/habitCheckIn';
import type { EntityId, GameState } from '../../core/types';
import { useGameStore } from '../../state/useGameStore';
import { formatHabitFrequency, isCompletedOnCurrentOperationalDay } from './habitPresentation';
import {
  BUTTON_PRIMARY,
  Chip,
  ErrorNote,
  Marker,
  NOTICE,
  SectionLabel,
} from './primitives';

const CHECK_IN_REJECTION_TEXT = {
  HABIT_NOT_FOUND: 'El hábito ya no existe.',
  CITY_PAUSED: 'La ciudad está en pausa. Reanudala para completar hábitos.',
  HABIT_NOT_ACTIVE: 'El hábito no está activo.',
  ALREADY_COMPLETED_TODAY: 'El hábito ya se cumplió hoy.',
} as const satisfies Record<HabitCheckInRejection, string>;

const ROW =
  'relative px-4 py-3 after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-line last:after:hidden';

/**
 * Daily check-in of the active habits, inside the Drawer's "En Obra (Hoy)"
 * tab. A habit already completed on the current operational day stays visible
 * but disabled; the store owns the refusal and its reason.
 */
export function HabitCheckInList({ state }: { state: GameState }) {
  const completeHabitToday = useGameStore((store) => store.completeHabitToday);

  const [pendingId, setPendingId] = useState<EntityId | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isManuallyPaused = state.cityStatus === 'MANUAL_PAUSE';
  const isHibernated = state.cityStatus === 'AUTO_PAUSED_HIBERNATION';

  const habits = Object.entries(state.habits).filter(
    ([, habit]) => habit.status !== 'RETIRED_TO_MUSEUM',
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
        {isManuallyPaused && (
          <p className={`mt-2 ${NOTICE}`}>
            Ciudad en pausa. Reanudala para completar hábitos.
          </p>
        )}
        {isHibernated && (
          <p className={`mt-2 ${NOTICE}`}>
            Ciudad hibernada. Cumplí un hábito para reactivar el barrio.
          </p>
        )}
      </div>

      <ul>
        {habits.length === 0 && (
          <li className="px-4 py-4 text-label text-ink-muted">Sin hábitos activos.</li>
        )}

        {habits.map(([habitId, habit]) => {
          const isDoneToday = isCompletedOnCurrentOperationalDay(state, habit.lastCompletedAt);
          const neighborhood = state.neighborhoods[habit.neighborhoodId];

          return (
            <li key={habitId} className={ROW}>
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-2 text-base text-ink">
                  <Marker tone={isDoneToday ? 'ink' : 'muted'} hollow={isDoneToday === false} />
                  {habit.title}
                </span>
                <span className="flex items-start gap-1">
                  {habit.status === 'PAUSED' && <span className={Chip}>En Pausa</span>}
                  <span className={Chip}>NV.{habit.checkpointLevel}</span>
                </span>
              </div>

              <div className="mt-1.5 text-label uppercase tracking-widest text-ink-muted">
                {neighborhood?.name ?? 'Barrio eliminado'} · {formatHabitFrequency(habit.frequency)}{' '}
                · Racha <span className="text-ink tabular-nums">{habit.currentStreakDays}</span> d
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  disabled={isDoneToday || pendingId !== null || isManuallyPaused}
                  onClick={() => void handleCheckIn(habitId)}
                  className={BUTTON_PRIMARY}
                >
                  <Marker tone={isDoneToday ? 'ink' : 'accent'} />
                  {isDoneToday ? 'Cumplido Hoy' : 'Cumplir Hoy'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {message !== null && <ErrorNote className="mx-4 mb-4 mt-3">{message}</ErrorNote>}
    </div>
  );
}

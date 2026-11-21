import { useState } from 'react';
import type { FormEvent } from 'react';
import type { HabitCreationRejection } from '../../core/entities/habit';
import type { HabitRetirementRejection } from '../../core/rules/habitRetirement';
import type { EntityId, GameState, HabitFrequency } from '../../core/types';
import { useGameStore } from '../../state/useGameStore';
import { Combo } from './Combo';
import { HabitMoveFlow } from './HabitMoveFlow';
import {
  countOccupiedProductiveLots,
  formatHabitFrequency,
  isCompletedOnCurrentOperationalDay,
  PRODUCTIVE_LOT_CAPACITY,
} from './habitPresentation';
import {
  BUTTON_OUTLINE,
  CELL,
  CELL_ACTIVE,
  BUTTON_PRIMARY,
  Chip,
  ErrorNote,
  INPUT,
  Marker,
  Meter,
  NOTICE,
  SectionLabel,
} from './primitives';

const CREATION_REJECTION_TEXT = {
  PRODUCTIVE_LOTS_FULL:
    'Los 4 lotes productivos de la Plaza están ocupados. Mudá o retirá un hábito para liberar espacio.',
} as const satisfies Record<HabitCreationRejection, string>;

const RETIREMENT_REJECTION_TEXT = {
  HABIT_NOT_FOUND: 'El hábito ya no existe.',
  HABIT_NOT_ACTIVE: 'Sólo se pueden retirar hábitos activos.',
  MAX_CHECKPOINT_NOT_REACHED: 'El retiro con honores exige el Nivel 5.',
} as const satisfies Record<HabitRetirementRejection, string>;

type FrequencyMode = 'DAILY' | 'TIMES_PER_WEEK';

const TIMES_PER_WEEK_COUNTS = [1, 2, 3, 4, 5, 6];

const ROW =
  'relative px-4 py-3 after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-line last:after:hidden';

interface HabitPlazaProps {
  state: GameState;
  neighborhoodId: EntityId;
}

/**
 * Plaza de Infraestructura: the productive lots of one barrio, its creation
 * form and the move/retirement actions. Occupancy is rendered from state; the
 * store is the only place that decides whether a creation or a move is legal.
 */
export function HabitPlaza({ state, neighborhoodId }: HabitPlazaProps) {
  const createHabit = useGameStore((store) => store.createHabit);
  const retireHabitToMuseum = useGameStore((store) => store.retireHabitToMuseum);

  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<FrequencyMode>('DAILY');
  const [timesPerWeek, setTimesPerWeek] = useState(3);
  const [movingHabitId, setMovingHabitId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const habits = Object.entries(state.habits).filter(
    ([, habit]) =>
      habit.neighborhoodId === neighborhoodId && habit.status !== 'RETIRED_TO_MUSEUM',
  );

  const occupiedLots = countOccupiedProductiveLots(state, neighborhoodId);
  const lotsFull = occupiedLots >= PRODUCTIVE_LOT_CAPACITY;

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = title.trim();

    if (trimmed.length === 0) {
      return;
    }

    const frequency: HabitFrequency =
      mode === 'DAILY'
        ? { type: 'DAILY' }
        : { type: 'TIMES_PER_WEEK', count: timesPerWeek };

    setPending(true);
    const result = await createHabit({ neighborhoodId, title: trimmed, frequency });
    setPending(false);

    if (result.status === 'REJECTED') {
      setMessage(CREATION_REJECTION_TEXT[result.reason]);
      return;
    }

    setTitle('');
    setMessage(null);
  }

  async function handleRetire(habitId: EntityId) {
    setPending(true);
    const result = await retireHabitToMuseum(habitId);
    setPending(false);

    if (result.status === 'REJECTED') {
      setMessage(RETIREMENT_REJECTION_TEXT[result.reason]);
      return;
    }

    setMovingHabitId(null);
    setMessage(null);
  }

  return (
    <div>
      <div className="px-5 pb-5">
        <SectionLabel>Plaza de Infraestructura</SectionLabel>

        <div className="mt-3 flex items-end justify-between gap-4">
          <span className="text-label uppercase tracking-widest text-ink-muted">
            Lotes Productivos
          </span>
          <span className="text-4xl leading-none text-ink tabular-nums">
            {occupiedLots}/{PRODUCTIVE_LOT_CAPACITY}
          </span>
        </div>

        <div className="mt-3">
          <Meter
            value={(occupiedLots / PRODUCTIVE_LOT_CAPACITY) * 100}
            label="Ocupación de lotes productivos"
          />
        </div>
      </div>

      <ul>
        {habits.length === 0 && (
          <li className="px-4 py-4 text-label text-ink-muted">Plaza vacía. Creá un hábito.</li>
        )}

        {habits.map(([habitId, habit]) => {
          const isDoneToday = isCompletedOnCurrentOperationalDay(state, habit.lastCompletedAt);
          const canRetire = habit.checkpointLevel === 5 && habit.status === 'ACTIVE';

          return (
            <li key={habitId} className={ROW}>
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-2 text-base text-ink">
                  <Marker tone={isDoneToday ? 'ink' : 'muted'} hollow={isDoneToday === false} />
                  {habit.title}
                </span>
                <span className="flex shrink-0 gap-1">
                  <span className={Chip}>NV.{habit.checkpointLevel}</span>
                  {habit.status === 'PAUSED' && <span className={Chip}>En Pausa</span>}
                  {isDoneToday && <span className={Chip}>Cumplido Hoy</span>}
                </span>
              </div>

              <div className="mt-1.5 text-label uppercase tracking-widest text-ink-muted">
                {formatHabitFrequency(habit.frequency)} · Racha{' '}
                <span className="text-ink tabular-nums">{habit.currentStreakDays}</span> d
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending || habit.status !== 'ACTIVE'}
                  onClick={() => setMovingHabitId(habitId)}
                  className={BUTTON_OUTLINE}
                >
                  Mudar de barrio
                </button>
                <button
                  type="button"
                  disabled={pending || !canRetire}
                  onClick={() => void handleRetire(habitId)}
                  className={BUTTON_OUTLINE}
                >
                  Retirar al museo
                </button>
              </div>

              {movingHabitId === habitId && (
                <HabitMoveFlow
                  state={state}
                  habitId={habitId}
                  habit={habit}
                  onDone={() => setMovingHabitId(null)}
                />
              )}
            </li>
          );
        })}
      </ul>

      <div className="px-5 pb-5 pt-5">
        <SectionLabel>Nuevo Hábito</SectionLabel>

        {lotsFull && (
          <p className={`mt-3 ${NOTICE}`}>{CREATION_REJECTION_TEXT.PRODUCTIVE_LOTS_FULL}</p>
        )}

        <form onSubmit={(event) => void handleCreate(event)} className="mt-3 space-y-3">
          <label className="block">
            <span className="sr-only">Título del hábito</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={lotsFull}
              placeholder="Título del hábito"
              className={`${INPUT} w-full`}
            />
          </label>

          <div className="flex gap-2" role="group" aria-label="Frecuencia del hábito">
            <button
              type="button"
              aria-pressed={mode === 'DAILY'}
              data-surface={mode === 'DAILY' ? 'dark' : undefined}
              onClick={() => setMode('DAILY')}
              className={`${CELL} flex-1 ${mode === 'DAILY' ? CELL_ACTIVE : ''}`}
            >
              Diario
            </button>
            <button
              type="button"
              aria-pressed={mode === 'TIMES_PER_WEEK'}
              data-surface={mode === 'TIMES_PER_WEEK' ? 'dark' : undefined}
              onClick={() => setMode('TIMES_PER_WEEK')}
              className={`${CELL} flex-1 ${mode === 'TIMES_PER_WEEK' ? CELL_ACTIVE : ''}`}
            >
              Semanal
            </button>
          </div>

          {mode === 'TIMES_PER_WEEK' && (
            <div className="flex items-center gap-2">
              <label
                htmlFor={`habit-times-per-week-${neighborhoodId}`}
                className="text-label uppercase tracking-widest text-ink-muted"
              >
                Veces por Semana
              </label>
              <Combo
                id={`habit-times-per-week-${neighborhoodId}`}
                ariaLabel="Veces por semana"
                value={String(timesPerWeek)}
                options={TIMES_PER_WEEK_COUNTS.map((count) => ({
                  value: String(count),
                  label: String(count),
                }))}
                onChange={(next) => setTimesPerWeek(Number(next))}
                direction="up"
                tone="light"
                disabled={lotsFull}
                className="w-20"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={lotsFull || pending || title.trim().length === 0}
            className={BUTTON_PRIMARY}
          >
            <Marker />
            Crear hábito
          </button>
        </form>

        {message !== null && <ErrorNote className="mt-3">{message}</ErrorNote>}
      </div>
    </div>
  );
}

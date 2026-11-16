import type { EntityId, GameState } from '../../core/types';
import { formatRetirementDate } from './habitPresentation';
import { SectionLabel } from './primitives';

interface HabitMuseumProps {
  state: GameState;
  neighborhoodId: EntityId;
}

/**
 * Museo de Hábitos: retired level 5 habits stay exhibited as plaques. The lot
 * they used to occupy is already free, so they are read-only here.
 */
export function HabitMuseum({ state, neighborhoodId }: HabitMuseumProps) {
  const retired = Object.entries(state.habits).filter(
    ([, habit]) =>
      habit.neighborhoodId === neighborhoodId && habit.status === 'RETIRED_TO_MUSEUM',
  );

  return (
    <div className="px-5 pt-5 pb-5">
      <SectionLabel>Museo de Hábitos</SectionLabel>

      {retired.length === 0 ? (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-neutral-600">
          Sin placas. Los hábitos de Nivel 5 se retiran aquí con honores.
        </p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {retired.map(([habitId, habit]) => (
            <li key={habitId} className="rounded-none border border-black/15 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600">
                En Exhibición
              </p>
              <p className="mt-1 text-sm font-bold text-black">{habit.title}</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-neutral-600">
                Retirado el{' '}
                <span className="text-black">
                  {habit.retiredAt === null ? '—' : formatRetirementDate(habit.retiredAt)}
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import type { GameState } from '../../core/types';
import { useGameStore } from '../../state/useGameStore';
import { FocusTimer } from './FocusTimer';
import { BADGE, BUTTON_OUTLINE_ON_DARK, INPUT_ON_DARK } from './primitives';

interface TopBarProps {
  state: GameState;
}

function Stat({
  label,
  value,
  detail,
  controls,
}: {
  label: string;
  value: string;
  detail?: string;
  /** Slots controls belong to this metric, so the group reads as one block. */
  controls?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-r border-neutral-800 px-4 py-2.5">
      <div className="flex flex-col justify-center">
        <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
          {label}
        </span>
        <span className="mt-0.5 font-mono text-base font-bold leading-none text-pearl">
          {value}
          {detail !== undefined && (
            <span className="ml-1.5 text-[10px] font-normal uppercase tracking-widest text-neutral-400">
              {detail}
            </span>
          )}
        </span>
      </div>
      {controls}
    </div>
  );
}

export function TopBar({ state }: TopBarProps) {
  const registerWater = useGameStore((store) => store.registerWater);
  const registerPages = useGameStore((store) => store.registerPages);
  const [isReading, setIsReading] = useState(false);
  const [pages, setPages] = useState('');
  const { townHall, library, aqueduct } = state.globals;

  const parsedPages = Number.parseInt(pages, 10);
  const isPageCountValid = Number.isInteger(parsedPages) && parsedPages > 0 && String(parsedPages) === pages.trim();

  async function submitPages(event: FormEvent) {
    event.preventDefault();

    if (isPageCountValid === false) {
      return;
    }

    const result = await registerPages(parsedPages);

    if (result.status === 'READING_REGISTERED') {
      setPages('');
      setIsReading(false);
    }
  }

  // The city-wide daily counter is derived, never stored: US-04 CA-03 defines
  // it literally as the sum of every neighborhood counter.
  const tasksToday = Object.values(state.neighborhoods).reduce(
    (total, neighborhood) => total + neighborhood.dailyTasksCompletedCount,
    0,
  );

  const isActive = state.cityStatus === 'ACTIVE';

  return (
    <header className="flex flex-wrap items-stretch border-b border-neutral-800 bg-black">
      <div className="flex items-center gap-2 border-r border-neutral-800 px-4 py-2">
        <span className="h-2 w-2 bg-red-600" aria-hidden />
        <span className="text-sm font-black uppercase tracking-tight text-pearl">To-Do Town</span>
      </div>

      <Stat
        label="Ayuntamiento"
        value={`NV.${townHall.level}`}
        detail={`${townHall.qualityOfLifeXP} XP`}
      />
      <Stat
        label="Acueducto"
        value={`${aqueduct.dailyLiters.toFixed(1)}/${aqueduct.dailyTargetLiters.toFixed(1)}`}
        detail="L"
        controls={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className={BUTTON_OUTLINE_ON_DARK}
              onClick={() => void registerWater(0.5)}
              aria-label="Registrar medio litro de agua"
            >
              +500 ML
            </button>
            <button
              type="button"
              className={BUTTON_OUTLINE_ON_DARK}
              onClick={() => void registerWater(1)}
              aria-label="Registrar un litro de agua"
            >
              +1 L
            </button>
          </div>
        }
      />

      <Stat
        label="Biblioteca"
        value={String(library.totalPagesRead)}
        detail={`PÁGS · NV.${library.level}`}
        controls={
          isReading ? (
            <form className="flex items-center gap-1.5" onSubmit={(event) => void submitPages(event)}>
              <input
                className={`${INPUT_ON_DARK} w-20`}
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                autoFocus
                placeholder="PÁGS"
                aria-label="Páginas leídas"
                value={pages}
                onChange={(event) => setPages(event.target.value)}
              />
              <button
                type="submit"
                className={BUTTON_OUTLINE_ON_DARK}
                disabled={isPageCountValid === false}
              >
                Sumar
              </button>
            </form>
          ) : (
            <button
              type="button"
              className={BUTTON_OUTLINE_ON_DARK}
              onClick={() => setIsReading(true)}
            >
              +Págs
            </button>
          )
        }
      />
      <Stat label="Tareas Hoy" value={String(tasksToday)} />
      <Stat label="Pomodoro" value="" controls={<FocusTimer state={state} />} />

      <div className="ml-auto flex items-center px-4">
        <span
          className={`${BADGE} ${
            isActive ? 'border-red-800 bg-red-950/40 text-red-400' : 'text-neutral-400'
          }`}
        >
          {state.cityStatus}
        </span>
      </div>
    </header>
  );
}

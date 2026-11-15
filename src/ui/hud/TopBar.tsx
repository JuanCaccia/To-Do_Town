import type { GameState } from '../../core/types';
import { BADGE } from './primitives';

interface TopBarProps {
  state: GameState;
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="flex flex-col justify-center border-r border-neutral-800 px-4 py-2.5">
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
  );
}

export function TopBar({ state }: TopBarProps) {
  const { townHall, library, aqueduct } = state.globals;

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
      />
      <Stat
        label="Biblioteca"
        value={String(library.totalPagesRead)}
        detail={`PÁGS · NV.${library.level}`}
      />
      <Stat label="Tareas Hoy" value={String(tasksToday)} />

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

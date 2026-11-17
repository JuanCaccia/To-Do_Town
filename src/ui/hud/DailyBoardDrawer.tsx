import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { TASK_REWARDS } from '../../core/constants/economyConstants';
import { getTaskFatigueMultiplier } from '../../core/rules/taskFatigue';
import type { GameState, TaskWeight } from '../../core/types';
import { useGameStore } from '../../state/useGameStore';
import { Combo } from './Combo';
import { HabitCheckInList } from './HabitCheckInList';
import {
  BADGE_ON_LIGHT,
  BUTTON_OUTLINE_ON_LIGHT,
  BUTTON_PRIMARY_ON_DARK,
  BUTTON_PRIMARY_ON_LIGHT,
  NOTICE_ON_LIGHT,
  PanelTitle,
  Rule,
  TAB_ITEM,
  TAB_ITEM_ACTIVE,
  TAB_ITEM_IDLE,
} from './primitives';

type BoardTab = 'IN_CONSTRUCTION' | 'MASTER_PLAN';

const TASK_WEIGHTS: TaskWeight[] = ['SIMPLE', 'STANDARD', 'COMPLEX'];

const TAB_LABELS: Record<BoardTab, string> = {
  IN_CONSTRUCTION: 'En Obra (Hoy)',
  MASTER_PLAN: 'Plano Maestro',
};

const FATIGUE_LABELS: Record<number, string> = {
  0.5: 'FATIGA ×0.5',
  0.1: 'AGOTADO ×0.1',
};

/** Rewards turn fractional under fatigue (DEC-006); the HUD shows one decimal. */
function formatAmount(value: number): string {
  return String(Math.round(value * 10) / 10);
}

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  const tag = element?.tagName;

  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function DailyBoardDrawer({ state }: { state: GameState }) {
  const createTask = useGameStore((store) => store.createTask);
  const moveTask = useGameStore((store) => store.moveTask);
  const completeTask = useGameStore((store) => store.completeTask);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<BoardTab>('MASTER_PLAN');
  const [title, setTitle] = useState('');
  const [neighborhoodId, setNeighborhoodId] = useState('');
  const [weight, setWeight] = useState<TaskWeight>('STANDARD');

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }

      // The bare "[" shortcut must not fire while the user is typing a title.
      if (event.key === '[' && !isTypingTarget(event.target)) {
        setOpen((value) => !value);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const neighborhoodIds = Object.keys(state.neighborhoods);
  const selectedNeighborhoodId = neighborhoodId === '' ? (neighborhoodIds[0] ?? '') : neighborhoodId;

  const tasks = Object.entries(state.tasks).filter(([, task]) => task.boardStatus === tab);
  const isPaused = state.cityStatus !== 'ACTIVE';

  const globalTasksCompletedCount = Object.values(state.neighborhoods).reduce(
    (total, neighborhood) => total + neighborhood.dailyTasksCompletedCount,
    0,
  );

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = title.trim();

    // US-04 CA-01 defers empty-title validation to the UI, where the save button lives.
    if (trimmed.length === 0 || selectedNeighborhoodId === '') {
      return;
    }

    await createTask({ neighborhoodId: selectedNeighborhoodId, title: trimmed, weight });
    setTitle('');
    // US-04 CA-01: a task is always born in MASTER_PLAN, so show it where it landed.
    setTab('MASTER_PLAN');
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 ${BUTTON_PRIMARY_ON_DARK}`}
      >
        Pizarra Diaria
      </button>
    );
  }

  return (
    /* One zone, one pearl block: the drawer shares the pearl surface end to end
       and is split by inset hairlines, not by stacked fills. */
    <aside className="fixed right-0 top-0 z-20 flex h-full w-full max-w-sm flex-col bg-pearl text-black">
      <PanelTitle
        meta={
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-none border border-neutral-700 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-neutral-300 transition-colors hover:border-pearl hover:text-pearl"
          >
            Cerrar
          </button>
        }
      >
        <span className="h-2 w-2 bg-red-600" aria-hidden />
        <span>Pizarra Diaria</span>
      </PanelTitle>

      {/* The active tab is the option inverted to the opposite colour. */}
      <nav className="flex gap-1 px-2 pt-2">
        {(Object.keys(TAB_LABELS) as BoardTab[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            aria-current={tab === value ? 'true' : undefined}
            className={`flex-1 ${TAB_ITEM} ${tab === value ? TAB_ITEM_ACTIVE : TAB_ITEM_IDLE}`}
          >
            {TAB_LABELS[value]}
          </button>
        ))}
      </nav>

      <div className="pt-2">
        <Rule className="mx-4" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isPaused && (
          <p className={`mx-4 mt-3 ${NOTICE_ON_LIGHT}`}>
            Ciudad en pausa. Reanudala para completar tareas.
          </p>
        )}

        <ul>
          {tasks.length === 0 && (
            <li className="px-4 py-6 font-mono text-[10px] uppercase tracking-widest text-neutral-600">
              Sin tareas.
            </li>
          )}

          {tasks.map(([taskId, task]) => {
            const reward = TASK_REWARDS[task.weight];
            const neighborhood = state.neighborhoods[task.neighborhoodId];
            const multiplier =
              neighborhood === undefined
                ? 1
                : getTaskFatigueMultiplier(
                    neighborhood.dailyTasksCompletedCount,
                    globalTasksCompletedCount,
                    state.globals.aqueduct.dailyLiters,
                  );

            return (
              <li
                key={taskId}
                className="relative px-4 py-3 after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-black/15 last:after:hidden"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold text-black">{task.title}</span>
                  <span className="flex shrink-0 gap-1">
                    {multiplier < 1 && (
                      <span className={BADGE_ON_LIGHT}>{FATIGUE_LABELS[multiplier] ?? 'FATIGA'}</span>
                    )}
                    <span className={BADGE_ON_LIGHT}>{task.weight}</span>
                  </span>
                </div>

                <div className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-neutral-600">
                  {neighborhood?.name ?? 'Barrio eliminado'} ·{' '}
                  <span className="text-black">
                    +{formatAmount(reward.coins * multiplier)} CR
                  </span>{' '}
                  /{' '}
                  <span className="text-black">
                    +{formatAmount(reward.urbanizationProgress * multiplier)}%
                  </span>
                </div>

                <div className="mt-3 flex gap-2">
                  {task.boardStatus === 'MASTER_PLAN' ? (
                    <button
                      type="button"
                      onClick={() => void moveTask(taskId, 'IN_CONSTRUCTION')}
                      className={`${BUTTON_OUTLINE_ON_LIGHT} px-3 py-1.5`}
                    >
                      Pasar a En Obra
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={isPaused}
                        onClick={() => void completeTask(taskId)}
                        className="rounded-none border border-red-700 bg-red-600 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-pearl transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:border-neutral-400 disabled:bg-neutral-400 disabled:text-neutral-600 disabled:hover:bg-neutral-400"
                      >
                        Completar
                      </button>
                      <button
                        type="button"
                        onClick={() => void moveTask(taskId, 'MASTER_PLAN')}
                        className={`${BUTTON_OUTLINE_ON_LIGHT} px-3 py-1.5`}
                      >
                        Devolver
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {/* US-06: habits are checked in from the same "En Obra (Hoy)" tab. */}
        {tab === 'IN_CONSTRUCTION' && (
          <>
            <Rule className="mx-4" />
            <HabitCheckInList state={state} />
          </>
        )}
      </div>

      <Rule className="mx-4" />

      <form onSubmit={(event) => void handleCreate(event)} className="space-y-3 p-4">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Nueva tarea"
          className="w-full rounded-none border border-black/30 bg-transparent px-2.5 py-2 font-mono text-xs text-black placeholder:text-neutral-500 focus:border-black focus:outline-none"
        />

        <div className="flex gap-2">
          <Combo
            ariaLabel="Barrio de la tarea"
            value={selectedNeighborhoodId}
            options={neighborhoodIds.map((id) => ({
              value: id,
              label: state.neighborhoods[id]?.name ?? id,
            }))}
            onChange={setNeighborhoodId}
            direction="up"
            tone="light"
            className="flex-1"
          />

          <Combo
            ariaLabel="Peso de la tarea"
            value={weight}
            options={TASK_WEIGHTS.map((value) => ({ value, label: value }))}
            onChange={(nextWeight) => setWeight(nextWeight as TaskWeight)}
            direction="up"
            tone="light"
          />
        </div>

        <button
          type="submit"
          disabled={title.trim().length === 0 || selectedNeighborhoodId === ''}
          className={`${BUTTON_PRIMARY_ON_LIGHT} w-full`}
        >
          Guardar en Plano Maestro
        </button>
      </form>
    </aside>
  );
}

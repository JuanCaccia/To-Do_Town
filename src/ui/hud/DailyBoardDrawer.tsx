import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { TASK_REWARDS } from '../../core/constants/economyConstants';
import { getTaskFatigueMultiplier } from '../../core/rules/taskFatigue';
import type { GameState, TaskWeight } from '../../core/types';
import { useGameStore } from '../../state/useGameStore';
import { Combo } from './Combo';
import { HabitCheckInList } from './HabitCheckInList';
import {
  BUTTON_OUTLINE,
  BUTTON_PRIMARY,
  Chip,
  INPUT,
  Marker,
  NOTICE,
  PanelTitle,
  Rule,
  TAB_ITEM,
  TAB_ITEM_ACTIVE,
  TAB_ITEM_IDLE,
  Zone,
} from './primitives';

type BoardTab = 'IN_CONSTRUCTION' | 'MASTER_PLAN';

const TASK_WEIGHTS: TaskWeight[] = ['SIMPLE', 'STANDARD', 'COMPLEX'];

const TAB_LABELS: Record<BoardTab, string> = {
  IN_CONSTRUCTION: 'En Obra (Hoy)',
  MASTER_PLAN: 'Plano Maestro',
};

/** UI_DESIGN §8.1: the label and marker of the closed `boardStatus` list. */
const TASK_STATE: Record<
  'MASTER_PLAN' | 'IN_CONSTRUCTION' | 'COMPLETED',
  { label: string; tone: 'ink' | 'muted'; hollow: boolean }
> = {
  MASTER_PLAN: { label: 'PLANO MAESTRO', tone: 'muted', hollow: true },
  IN_CONSTRUCTION: { label: 'EN OBRA', tone: 'muted', hollow: false },
  COMPLETED: { label: 'HECHA', tone: 'ink', hollow: false },
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
        return;
      }

      // §4.4: Esc closes the drawer; the visible control says `Esc · cerrar`.
      if (event.key === 'Escape') {
        setOpen((value) => (value ? false : value));
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const neighborhoodIds = Object.keys(state.neighborhoods);
  const selectedNeighborhoodId = neighborhoodId === '' ? (neighborhoodIds[0] ?? '') : neighborhoodId;

  const tasks = Object.entries(state.tasks).filter(([, task]) => task.boardStatus === tab);
  const isManuallyPaused = state.cityStatus === 'MANUAL_PAUSE';
  const isHibernated = state.cityStatus === 'AUTO_PAUSED_HIBERNATION';

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
        aria-expanded={false}
        aria-controls="daily-board"
        className={`fixed bottom-4 right-4 z-20 ${BUTTON_PRIMARY}`}
      >
        <Marker tone="accent" />
        Pizarra Diaria
        <span className="text-label uppercase tracking-widest text-on-fill">[</span>
      </button>
    );
  }

  return (
    /* One zone, one pearl block: the drawer shares the pearl surface end to end
       and is split by inset hairlines, not by stacked fills. */
    <Zone
      as="aside"
      id="daily-board"
      className="fixed right-0 top-0 z-30 flex h-full w-full max-w-sm flex-col"
    >
      <PanelTitle
        className="min-h-14"
        meta={
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-none border border-ink-muted px-2 py-1 text-label uppercase tracking-widest text-ink-muted transition-colors hover:border-ink hover:text-ink"
          >
            Esc · cerrar
          </button>
        }
      >
        <Marker tone="accent" />
        <span>Pizarra Diaria</span>
      </PanelTitle>

      {/* The active tab is the option inverted to the opposite context. */}
      <div className="px-2 pt-2">
        <div role="tablist" aria-label="Pestañas de la pizarra" className="flex gap-1">
          {(Object.keys(TAB_LABELS) as BoardTab[]).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              data-surface={tab === value ? 'dark' : undefined}
              onClick={() => setTab(value)}
              className={`flex-1 ${TAB_ITEM} ${tab === value ? TAB_ITEM_ACTIVE : TAB_ITEM_IDLE}`}
            >
              {TAB_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <Rule className="mx-4" />
      </div>

      <div role="tabpanel" className="flex-1 overflow-y-auto">
        {isManuallyPaused && (
          <p className={`mx-4 mt-3 ${NOTICE}`}>
            Ciudad en pausa. Reanudala para completar tareas.
          </p>
        )}
        {isHibernated && (
          <p className={`mx-4 mt-3 ${NOTICE}`}>
            Ciudad hibernada. Completá una tarea para reactivar el barrio.
          </p>
        )}

        <ul>
          {tasks.length === 0 && (
            <li className="px-4 py-6 text-label text-ink-muted">Sin tareas.</li>
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
            const stateInfo = TASK_STATE[task.boardStatus];

            return (
              <li
                key={taskId}
                className="relative px-4 py-3 after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-line last:after:hidden"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex items-center gap-2 text-base text-ink">
                    <Marker tone={stateInfo.tone} hollow={stateInfo.hollow} />
                    {task.title}
                  </span>
                  <span className="flex shrink-0 gap-1">
                    {multiplier < 1 && (
                      <span className={Chip}>{FATIGUE_LABELS[multiplier] ?? 'FATIGA'}</span>
                    )}
                    <span className={Chip}>{task.weight}</span>
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-label uppercase tracking-widest text-ink-muted">
                  <span>{stateInfo.label}</span>
                  <span>·</span>
                  <span>{neighborhood?.name ?? 'Barrio eliminado'}</span>
                  <span className="text-ink tabular-nums">
                    +{formatAmount(reward.coins * multiplier)} CR
                  </span>
                  <span className="text-ink tabular-nums">
                    +{formatAmount(reward.urbanizationProgress * multiplier)}%
                  </span>
                </div>

                <div className="mt-3 flex gap-2">
                  {task.boardStatus === 'MASTER_PLAN' ? (
                    <button
                      type="button"
                      onClick={() => void moveTask(taskId, 'IN_CONSTRUCTION')}
                      className={BUTTON_OUTLINE}
                    >
                      Pasar a En Obra
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={isManuallyPaused}
                        onClick={() => void completeTask(taskId)}
                        className={BUTTON_PRIMARY}
                      >
                        <Marker tone="accent" />
                        Completar
                      </button>
                      <button
                        type="button"
                        onClick={() => void moveTask(taskId, 'MASTER_PLAN')}
                        className={BUTTON_OUTLINE}
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
        <label className="block">
          <span className="sr-only">Nueva tarea</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Nueva tarea"
            className={`${INPUT} w-full`}
          />
        </label>

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
          className={`${BUTTON_PRIMARY} w-full`}
        >
          Guardar en Plano Maestro
        </button>
      </form>
    </Zone>
  );
}

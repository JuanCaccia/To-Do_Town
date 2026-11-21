import type { FormEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { GameState } from '../../core/types';
import { useGameStore } from '../../state/useGameStore';
import { WATER_DAILY_HARD_CAP_LITERS } from '../../core/constants/economyConstants';
import { FocusTimer } from './FocusTimer';
import { NavActionsMenu } from './NavActionsMenu';
import {
  BUTTON_DISMISS,
  BUTTON_OUTLINE,
  Chip,
  INPUT,
  Marker,
  TOAST,
} from './primitives';

/** US-09 CA-01: el aviso de cupo es efímero, no una línea fija del chrome. */
const TOAST_VISIBLE_MS = 4_000;

interface TopBarProps {
  state: GameState;
  /** US-12 CA-03: en Zen la barra queda reducida a la franja del reloj. */
  isZen?: boolean;
  onExitZen?: () => void;
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
    <div className="flex items-center gap-3 border-r border-line px-4 py-2.5">
      <div className="flex flex-col justify-center">
        <span className="text-label uppercase tracking-widest text-ink-muted">
          {label}
        </span>
        <span className="mt-0.5 text-base leading-none text-ink tabular-nums">
          {value}
          {detail !== undefined && (
            <span className="ml-1.5 text-label uppercase tracking-widest text-ink-muted">
              {detail}
            </span>
          )}
        </span>
      </div>
      {controls}
    </div>
  );
}

export function TopBar({ state, isZen = false, onExitZen }: TopBarProps) {
  const registerWater = useGameStore((store) => store.registerWater);
  const registerPages = useGameStore((store) => store.registerPages);
  const [isReading, setIsReading] = useState(false);
  const [pages, setPages] = useState('');
  const [toast, setToast] = useState<{ message: string; nonce: number } | null>(null);
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

      // El cupo diario nunca se muestra: sólo se avisa que hubo recorte.
      if (result.creditedPages < parsedPages) {
        setToast({ message: 'Cupo diario: no todas las páginas se acreditaron', nonce: Date.now() });
      }
    }
  }

  useEffect(() => {
    if (toast === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(null), TOAST_VISIBLE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  // The city-wide daily counter is derived, never stored: US-04 CA-03 defines
  // it literally as the sum of every neighborhood counter.
  const tasksToday = Object.values(state.neighborhoods).reduce(
    (total, neighborhood) => total + neighborhood.dailyTasksCompletedCount,
    0,
  );

  const isActive = state.cityStatus === 'ACTIVE';

  return (
    <header
      className={
        isZen
          ? 'flex min-h-16 items-center justify-between border-b border-line bg-surface'
          : 'flex min-h-16 flex-wrap items-stretch border-b border-line bg-surface'
      }
    >
      {isZen === false && (
        <>
          <div className="flex items-center gap-2 border-r border-line px-4 py-2">
            <Marker tone="accent" />
            <span className="text-sm text-ink">To-Do Town</span>
          </div>

          <Stat
            label="Ayuntamiento"
            value={`NV.${townHall.level}`}
            detail={`${townHall.qualityOfLifeXP} XP`}
          />
          <Stat
            label="Acueducto"
            value={`${aqueduct.dailyLiters.toFixed(1)}/${WATER_DAILY_HARD_CAP_LITERS.toFixed(1)}`}
            detail="L"
            controls={
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className={BUTTON_OUTLINE}
                  onClick={() => void registerWater(0.5)}
                  aria-label="Registrar medio litro de agua"
                >
                  +500 ml
                </button>
                <button
                  type="button"
                  className={BUTTON_OUTLINE}
                  onClick={() => void registerWater(1)}
                  aria-label="Registrar un litro de agua"
                >
                  +1 l
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
                    className={`${INPUT} w-20`}
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
                    className={BUTTON_OUTLINE}
                    disabled={isPageCountValid === false}
                  >
                    Sumar
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className={BUTTON_OUTLINE}
                  onClick={() => setIsReading(true)}
                >
                  Sumar págs
                </button>
              )
            }
          />
          <Stat label="Tareas Hoy" value={String(tasksToday)} />
        </>
      )}

      {/* Slot estable: `FocusTimer` ocupa siempre el mismo índice del header, así
          que cambiar de variante lo re-renderiza sin desmontarlo. Desmontarlo
          limpiaría su intervalo y mataría la sesión de foco en curso. */}
      <div
        className={
          isZen
            ? 'flex items-center px-4 py-1.5'
            : 'flex items-center gap-3 border-r border-line px-4 py-2.5'
        }
      >
        {isZen === false && (
          <span className="text-label uppercase tracking-widest text-ink-muted">
            Pomodoro
          </span>
        )}
        <FocusTimer state={state} compact={isZen} />
      </div>

      {isZen === false && (
        <>
          <div className="ml-auto flex flex-wrap items-center gap-2 px-4 py-2">
            <span
              className={
                isActive
                  ? 'inline-block rounded-none border border-accent-ink px-2 py-0.5 text-label uppercase tracking-widest text-accent-ink'
                  : Chip
              }
            >
              {isActive === false && <Marker tone="accent" className="mr-1.5" />}
              {state.cityStatus}
            </span>

            {state.cityStatus === 'MANUAL_PAUSE' && (
              <span
                className="max-w-[18rem] truncate text-label text-ink-muted"
                title={state.manualPauseReason}
              >
                Pausa: {state.manualPauseReason}
              </span>
            )}

            {/* El disparador vive al borde derecho: es el último control de la
                barra, y el estado de la ciudad se lee antes que las acciones. */}
            <NavActionsMenu state={state} />
          </div>

          {toast !== null && (
            <div role="status" className={`fixed right-4 top-16 z-60 ${TOAST}`}>
              {toast.message}
            </div>
          )}
        </>
      )}

      {isZen && (
        <button
          type="button"
          className={`${BUTTON_DISMISS} mr-3`}
          onClick={onExitZen}
          aria-label="Salir del Modo Zen"
        >
          Salir · Esc
        </button>
      )}
    </header>
  );
}

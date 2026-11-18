import type { FormEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { GameState } from '../../core/types';
import { useGameStore } from '../../state/useGameStore';
import { WATER_DAILY_HARD_CAP_LITERS } from '../../core/constants/economyConstants';
import { FocusTimer } from './FocusTimer';
import { NavActionsMenu } from './NavActionsMenu';
import { BADGE, BUTTON_DISMISS_ON_DARK, BUTTON_OUTLINE_ON_DARK, INPUT_ON_DARK, TOAST_ON_DARK } from './primitives';

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
          ? 'flex items-center justify-between border-b border-neutral-800 bg-black'
          : 'flex flex-wrap items-stretch border-b border-neutral-800 bg-black'
      }
    >
      {isZen === false && (
        <>
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
            value={`${aqueduct.dailyLiters.toFixed(1)}/${WATER_DAILY_HARD_CAP_LITERS.toFixed(1)}`}
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
        </>
      )}

      {/* Slot estable: `FocusTimer` ocupa siempre el mismo índice del header, así
          que cambiar de variante lo re-renderiza sin desmontarlo. Desmontarlo
          limpiaría su intervalo y mataría la sesión de foco en curso. */}
      <div
        className={
          isZen
            ? 'flex items-center px-4 py-1.5'
            : 'flex items-center gap-3 border-r border-neutral-800 px-4 py-2.5'
        }
      >
        {isZen === false && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
            Pomodoro
          </span>
        )}
        <FocusTimer state={state} compact={isZen} />
      </div>

      {isZen === false && (
        <>
          <div className="ml-auto flex flex-wrap items-center gap-2 px-4 py-2">
            <span
              className={`${BADGE} ${
                isActive ? 'border-red-800 bg-red-950/40 text-red-400' : 'text-neutral-400'
              }`}
            >
              {state.cityStatus}
            </span>

            {state.cityStatus === 'MANUAL_PAUSE' && (
              <span
                className="max-w-[18rem] truncate font-mono text-[10px] uppercase tracking-widest text-neutral-300"
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
            <div role="status" className={TOAST_ON_DARK}>
              {toast.message}
            </div>
          )}
        </>
      )}

      {isZen && (
        <button
          type="button"
          className={`${BUTTON_DISMISS_ON_DARK} mr-3`}
          onClick={onExitZen}
          aria-label="Salir del Modo Zen"
        >
          Salir · Esc
        </button>
      )}
    </header>
  );
}

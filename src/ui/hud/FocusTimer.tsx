import { useEffect, useState } from 'react';
import type { GameState } from '../../core/types';
import { useGameStore } from '../../state/useGameStore';
import { BUTTON_OUTLINE_ON_DARK, BUTTON_PRIMARY_ON_DARK } from './primitives';

const MILLISECONDS_PER_MINUTE = 60_000;

/** US-08 CA-04: interrumpir por debajo de este umbral no registra nada. */
const MINIMUM_INTERRUPTED_MINUTES = 1;

interface FocusTimerProps {
  state: GameState;
}

/**
 * Reloj Pomodoro de la Barra Superior (US-08 CA-04).
 *
 * El cronómetro es estado efímero de la vista: el dominio solo ve sesiones
 * terminadas, con `startedAt`/`endedAt` reales. Por eso recargar la página
 * pierde una sesión en curso, que es preferible a inventar minutos que no
 * transcurrieron.
 *
 * La advertencia de interrupción es **inline y sobre negro**, no un modal: un
 * panel perla nuevo sería la cuarta superficie y `UI_DESIGN.md` §7 auditoría 8
 * fija exactamente tres.
 */
export function FocusTimer({ state }: FocusTimerProps) {
  const recordFocus = useGameStore((store) => store.recordFocus);
  const neighborhoods = Object.keys(state.neighborhoods);
  const presets = state.config.pomodoroPresets;

  const [neighborhoodId, setNeighborhoodId] = useState(neighborhoods[0] ?? '');
  const [presetId, setPresetId] = useState(presets[0]?.id ?? '');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);

  const preset = presets.find((candidate) => candidate.id === presetId);
  const targetMs = (preset?.workMinutes ?? 0) * MILLISECONDS_PER_MINUTE;
  const elapsedMinutes = Math.floor(elapsedMs / MILLISECONDS_PER_MINUTE);
  const canInterrupt = elapsedMinutes >= MINIMUM_INTERRUPTED_MINUTES;

  useEffect(() => {
    if (startedAt === null) {
      return;
    }

    const intervalId = setInterval(() => setElapsedMs(Date.now() - startedAt), 1_000);

    return () => clearInterval(intervalId);
  }, [startedAt]);

  useEffect(() => {
    if (startedAt === null || targetMs === 0 || elapsedMs < targetMs) {
      return;
    }

    void finish('COMPLETED', startedAt + targetMs);
    // `finish` closes over the current selection; the guard above keeps this
    // effect from firing outside an active session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedMs, startedAt, targetMs]);

  async function finish(outcome: 'COMPLETED' | 'INTERRUPTED', endedAt: number) {
    if (startedAt === null) {
      return;
    }

    await recordFocus({ neighborhoodId, presetId, startedAt, endedAt, outcome });
    setStartedAt(null);
    setElapsedMs(0);
    setIsConfirming(false);
  }

  function start() {
    setStartedAt(Date.now());
    setElapsedMs(0);
    setIsConfirming(false);
  }

  if (startedAt === null) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {neighborhoods.map((id) => (
            <button
              key={id}
              type="button"
              className={id === neighborhoodId ? BUTTON_PRIMARY_ON_DARK : BUTTON_OUTLINE_ON_DARK}
              aria-pressed={id === neighborhoodId}
              onClick={() => setNeighborhoodId(id)}
            >
              {state.neighborhoods[id]?.name ?? id}
            </button>
          ))}
        </div>
        <span aria-hidden className="h-6 w-px bg-neutral-800" />
        <div className="flex flex-wrap items-center gap-1.5">
          {presets.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              className={
                candidate.id === presetId ? BUTTON_PRIMARY_ON_DARK : BUTTON_OUTLINE_ON_DARK
              }
              aria-pressed={candidate.id === presetId}
              onClick={() => setPresetId(candidate.id)}
            >
              {candidate.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={BUTTON_OUTLINE_ON_DARK}
          onClick={start}
          disabled={preset === undefined || neighborhoodId === ''}
        >
          Iniciar
        </button>
      </div>
    );
  }

  if (isConfirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-300">
          ¿Cortar? {elapsedMinutes} min · 80% al liquidar
        </span>
        <button
          type="button"
          className={BUTTON_OUTLINE_ON_DARK}
          onClick={() => setIsConfirming(false)}
        >
          Seguir
        </button>
        <button
          type="button"
          className={BUTTON_PRIMARY_ON_DARK}
          onClick={() => void finish('INTERRUPTED', Date.now())}
        >
          Cortar
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-base font-bold leading-none text-pearl">
        {elapsedMinutes}
        <span className="ml-1 text-[10px] font-normal uppercase tracking-widest text-neutral-400">
          / {preset?.workMinutes ?? 0} MIN
        </span>
      </span>
      <button
        type="button"
        className={BUTTON_OUTLINE_ON_DARK}
        onClick={() => setIsConfirming(true)}
        disabled={canInterrupt === false}
      >
        Cancelar
      </button>
    </div>
  );
}

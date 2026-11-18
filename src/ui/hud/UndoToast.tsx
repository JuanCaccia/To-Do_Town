import { useEffect, useState } from 'react';
import { useGameStore } from '../../state/useGameStore';
import { BUTTON_DISMISS_ON_DARK, BUTTON_PRIMARY_ON_DARK } from './primitives';

const CLOCK_TICK_MS = 1_000;

/**
 * Toast de Reversibilidad (US-12 CA-02 / US-13 CA-03).
 *
 * Vive sobre el lienzo negro, así que no es una cuarta zona perla: `bg-black`
 * con hairline. El botón reutiliza el primario-sobre-negro que ya usa el
 * lanzador del Drawer; no se declara un token nuevo.
 *
 * Lleva su propio reloj de 1 s porque `useGameLoop` tickea cada minuto: sin
 * esto el toast podría seguir visible hasta 60 s después de vencer y el click
 * terminaría en `UNDO_WINDOW_EXPIRED`. La purga real de la cola sigue siendo del
 * store; acá sólo se decide si se muestra.
 */
export function UndoToast() {
  const undoQueue = useGameStore((store) => store.undoQueue);
  const undoLastAction = useGameStore((store) => store.undoLastAction);
  const dismissUndo = useGameStore((store) => store.dismissUndo);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const handle = window.setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);

    return () => window.clearInterval(handle);
  }, []);

  const entry = undoQueue[undoQueue.length - 1];

  if (entry === undefined || now > entry.expiresAt) {
    return null;
  }

  const remainingSeconds = Math.ceil((entry.expiresAt - now) / CLOCK_TICK_MS);

  return (
    <aside
      role="status"
      className="fixed bottom-4 left-4 z-30 flex items-center gap-3 rounded-none border border-neutral-800 bg-black px-4 py-3"
    >
      <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
        {entry.description}
      </span>

      <button
        type="button"
        className={BUTTON_PRIMARY_ON_DARK}
        onClick={() => void undoLastAction()}
      >
        Deshacer
      </button>

      <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
        {remainingSeconds} s
      </span>

      <button
        type="button"
        aria-label="Descartar la oportunidad de deshacer"
        className={BUTTON_DISMISS_ON_DARK}
        onClick={() => dismissUndo()}
      >
        ×
      </button>
    </aside>
  );
}

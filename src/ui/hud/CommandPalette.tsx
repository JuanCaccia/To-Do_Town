import { useEffect, useState } from 'react';
import type { GameState } from '../../core/types';
import { useGameStore } from '../../state/useGameStore';
import type { CommandDispatchRejection } from '../../state/useGameStore';

const STATIC_REJECTION_TEXT = {
  EMPTY: 'Escribí un comando.',
  UNKNOWN_COMMAND: 'Comando desconocido.',
  INVALID_WATER_AMOUNT: 'El agua admite 0.5 o 1 litro.',
  INVALID_PAGE_COUNT: 'Las páginas son un entero positivo.',
  INVALID_TASK_SYNTAX: 'Sintaxis: t <barrio> <título> !10|25|50.',
  INVALID_TASK_WEIGHT: 'El peso admite !10, !25 o !50.',
  INVALID_FOCUS_SYNTAX: 'Sintaxis: pomo <barrio> <minutos>.',
  INVALID_FOCUS_MINUTES: 'Los minutos son un entero positivo.',
  NEIGHBORHOOD_NOT_FOUND: 'No existe un barrio con ese nombre.',
} satisfies Record<Exclude<CommandDispatchRejection, 'NO_MATCHING_PRESET'>, string>;

/**
 * El rechazo de foco lista los presets reales en vez de inventar un cronómetro:
 * el ciclo trabajo/descanso depende del preset, no de los minutos sueltos.
 */
function rejectionMessage(reason: CommandDispatchRejection, state: GameState): string {
  if (reason === 'NO_MATCHING_PRESET') {
    const minutes = state.config.pomodoroPresets
      .map((preset) => `${preset.workMinutes} min`)
      .join(' · ');

    return `No hay preset de esos minutos. Disponibles: ${minutes}.`;
  }

  return STATIC_REJECTION_TEXT[reason];
}

const HINTS = [
  'agua 0.5 · agua 1',
  'leer <N>',
  't <barrio> <título> !10|25|50',
  'pomo <barrio> <minutos>',
  'Ctrl+. · Modo Zen (Esc para salir)',
];

/**
 * Command Palette (US-12 CA-01): Ctrl+K abre el intérprete de comandos rápidos.
 *
 * Vive sobre el lienzo negro, no sobre una zona: el presupuesto de superficies
 * de `UI_DESIGN.md` §2 fija tres perlas y esta no es una de ellas. Por eso es
 * `bg-black` con hairline `border-neutral-800`.
 *
 * El despacho es del store (`runCommand`); acá sólo se muestra el motivo cuando
 * el comando se rechaza.
 */
export function CommandPalette({ state }: { state: GameState }) {
  const runCommand = useGameStore((store) => store.runCommand);

  const [isOpen, setIsOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setIsOpen((open) => !open);
        return;
      }

      if (event.key === 'Escape') {
        setIsOpen(false);
        setRaw('');
        setMessage(null);
      }
    }

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  async function submit() {
    const result = await runCommand(raw);

    if (result.status === 'EXECUTED') {
      setIsOpen(false);
      setRaw('');
      setMessage(null);
      return;
    }

    setMessage(rejectionMessage(result.reason, state));
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
    >
      <div className="w-full max-w-3xl rounded-none border border-neutral-800 bg-black">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-800 px-4 py-2.5">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-pearl">
            Comandos
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
            Ctrl+K
          </span>
        </div>

        <form
          className="p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <input
            autoFocus
            value={raw}
            onChange={(event) => {
              setRaw(event.target.value);
              setMessage(null);
            }}
            aria-label="Comando rápido"
            placeholder="t gym comprar suplemento !25"
            className="w-full rounded-none border border-neutral-800 bg-black px-4 py-3 font-mono text-sm text-pearl transition-colors placeholder:text-neutral-500 focus:border-pearl focus:outline-none"
          />

          {message !== null && (
            <p
              role="alert"
              className="mt-3 rounded-none border border-red-800 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-red-400"
            >
              {message}
            </p>
          )}

          <ul className="mt-3 space-y-1 font-mono text-[10px] uppercase tracking-widest text-neutral-400">
            {HINTS.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useGameLoop } from './state/useGameLoop';
import { useGameStore } from './state/useGameStore';
import { DailyBoardDrawer } from './ui/hud/DailyBoardDrawer';
import { CommandPalette } from './ui/hud/CommandPalette';
import { NeighborhoodPanel } from './ui/hud/NeighborhoodPanel';
import { TopBar } from './ui/hud/TopBar';
import { UndoToast } from './ui/hud/UndoToast';

export function App() {
  const state = useGameStore((store) => store.state);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isZen, setIsZen] = useState(false);

  useGameLoop();

  // US-12 CA-03: el Modo Zen es estado efímero de la vista, como la selección.
  // `Ctrl+.` alterna y `Escape` sólo sale: el atajo de entrada no secuestra
  // ninguna tecla de escritura, así que no puede dispararse mientras se tipea.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === '.') {
        event.preventDefault();
        setIsZen((value) => !value);
        return;
      }

      if (event.key === 'Escape') {
        setIsZen(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (state === null) {
    return (
      <div className="flex h-full items-center justify-center bg-black font-mono text-xs uppercase tracking-widest text-neutral-400">
        Cargando ciudad…
      </div>
    );
  }

  const neighborhoodIds = Object.keys(state.neighborhoods);

  // Selection is ephemeral UI state, so it lives here and never in the store.
  // It also self-heals when the selected neighborhood is purged.
  const activeId =
    selectedId !== null && state.neighborhoods[selectedId] !== undefined
      ? selectedId
      : (neighborhoodIds[0] ?? null);

  return (
    <div className="flex h-full flex-col bg-black font-sans text-pearl">
      {/* TopBar nunca se desmonta: el cronómetro vive dentro de ella y en Zen
          se renderiza en variante compacta, así que la sesión de foco sigue viva. */}
      <TopBar state={state} isZen={isZen} onExitZen={() => setIsZen(false)} />

      {isZen === false && (
        <main className="flex-1 overflow-y-auto p-6">
          <NeighborhoodPanel state={state} activeId={activeId} onSelect={setSelectedId} />
        </main>
      )}

      {isZen === false && <DailyBoardDrawer state={state} />}

      {/* El palette queda montado: los comandos son de teclado y Zen no los apaga. */}
      <CommandPalette state={state} />

      {isZen === false && <UndoToast />}
    </div>
  );
}

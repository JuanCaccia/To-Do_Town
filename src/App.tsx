import { useState } from 'react';
import { useGameLoop } from './state/useGameLoop';
import { useGameStore } from './state/useGameStore';
import { DailyBoardDrawer } from './ui/hud/DailyBoardDrawer';
import { NeighborhoodPanel } from './ui/hud/NeighborhoodPanel';
import { TopBar } from './ui/hud/TopBar';

export function App() {
  const state = useGameStore((store) => store.state);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useGameLoop();

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
      <TopBar state={state} />

      <main className="flex-1 overflow-y-auto p-6">
        <NeighborhoodPanel state={state} activeId={activeId} onSelect={setSelectedId} />
      </main>

      <DailyBoardDrawer state={state} />
    </div>
  );
}

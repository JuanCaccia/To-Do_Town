import { useState } from 'react';
import type { FormEvent } from 'react';
import type { EntityId, GameState } from '../../core/types';
import { useGameStore } from '../../state/useGameStore';
import { NeighborhoodInspector } from './NeighborhoodInspector';
import { BUTTON_PRIMARY_ON_LIGHT, PanelTitle, Rule, SectionLabel } from './primitives';
import { HUD_PALETTES } from './palettes';

interface NeighborhoodPanelProps {
  state: GameState;
  activeId: EntityId | null;
  onSelect(id: EntityId): void;
}

export function NeighborhoodPanel({ state, activeId, onSelect }: NeighborhoodPanelProps) {
  const createNeighborhood = useGameStore((store) => store.createNeighborhood);

  const [name, setName] = useState('');
  const [paletteId, setPaletteId] = useState(HUD_PALETTES[0]?.id ?? '');

  const entries = Object.entries(state.neighborhoods);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = name.trim();

    // US-02 CA-01 defers empty-name validation to the UI, where the save button lives.
    if (trimmed.length === 0) {
      return;
    }

    const createdId = await createNeighborhood({ name: trimmed, paletteId });
    setName('');
    onSelect(createdId);
  }

  return (
    /* The block group never exceeds 65% of the content width on desktop: the
       remaining black is breathing room, not an empty panel. The sidebar keeps
       its fixed 17rem and the navbar still spans the full window. */
    <div className="grid gap-6 lg:max-w-[65%] lg:grid-cols-[17rem_1fr]">
      {/* One zone, one pearl block: the list and the create form share the same
          surface and are split only by an inset hairline. */}
      <aside className="rounded-none bg-pearl text-black">
        <PanelTitle
          meta={
            <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
              {entries.length} NV
            </span>
          }
        >
          Distritos
        </PanelTitle>

        <ul>
          {entries.length === 0 && (
            <li className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-neutral-600">
              Sin distritos.
            </li>
          )}

          {entries.map(([id, neighborhood]) => {
            const isActive = id === activeId;

            return (
              <li
                key={id}
                className="relative after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-black/15 last:after:hidden"
              >
                {/* The selected row is the option inverted to the opposite
                    colour — the only black fill the sidebar owns. */}
                <button
                  type="button"
                  onClick={() => onSelect(id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`block w-full rounded-none px-4 py-3 text-left transition-colors ${
                    isActive ? 'bg-black text-pearl' : 'text-black hover:bg-black/5'
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-black uppercase tracking-tight">
                      {neighborhood.name}
                    </span>
                    {isActive && (
                      <span className="font-mono text-[10px] uppercase tracking-widest text-red-500">
                        Activo
                      </span>
                    )}
                  </span>
                  <span
                    className={`mt-1 block font-mono text-[10px] uppercase tracking-widest ${
                      isActive ? 'text-neutral-400' : 'text-neutral-600'
                    }`}
                  >
                    NV.{neighborhood.infrastructureLevel} · {neighborhood.treasuryCoins} CR ·{' '}
                    {Math.round(neighborhood.urbanizationProgress)}%
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <Rule className="mx-4" />

        <form onSubmit={(event) => void handleCreate(event)} className="p-4">
          <SectionLabel>Crear Distrito</SectionLabel>

          <div className="mt-3">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre"
              className="w-full rounded-none border border-black/30 bg-transparent px-2.5 py-2 font-mono text-xs text-black placeholder:text-neutral-500 focus:border-black focus:outline-none"
            />

            <div className="mt-3 flex gap-2">
              {HUD_PALETTES.map((palette) => (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => setPaletteId(palette.id)}
                  aria-pressed={paletteId === palette.id}
                  aria-label={palette.label}
                  title={palette.label}
                  className={`h-8 w-8 rounded-none border-2 transition-colors ${
                    paletteId === palette.id
                      ? 'border-black'
                      : 'border-black/30 hover:border-black'
                  }`}
                  style={{ backgroundColor: palette.swatch }}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={name.trim().length === 0}
              className={`${BUTTON_PRIMARY_ON_LIGHT} mt-4 w-full`}
            >
              Crear
            </button>
          </div>
        </form>
      </aside>

      {activeId === null ? (
        <p className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          Sin distritos. Creá el primero.
        </p>
      ) : (
        <NeighborhoodInspector state={state} neighborhoodId={activeId} />
      )}
    </div>
  );
}

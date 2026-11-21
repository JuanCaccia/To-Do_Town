import { useState } from 'react';
import type { FormEvent } from 'react';
import type { EntityId, GameState } from '../../core/types';
import { useGameStore } from '../../state/useGameStore';
import { NeighborhoodInspector } from './NeighborhoodInspector';
import { BUTTON_PRIMARY, INPUT, PanelTitle, Rule, SectionLabel, Zone } from './primitives';
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
      <Zone as="aside" className="self-start">
        <PanelTitle meta={<span className="text-label uppercase tracking-widest text-ink-muted">{entries.length} NV</span>}>
          Distritos
        </PanelTitle>

        <ul>
          {entries.length === 0 && (
            <li className="px-4 py-4 text-label text-ink-muted">Sin distritos.</li>
          )}

          {entries.map(([id, neighborhood]) => {
            const isActive = id === activeId;

            return (
              <li
                key={id}
                className={`relative after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-line last:after:hidden ${isActive ? 'after:hidden' : ''}`}
              >
                {/* The selected row is the option inverted to the opposite
                    context, prefixed with `>` and labelled ACTIVO (§4.2). */}
                <button
                  type="button"
                  onClick={() => onSelect(id)}
                  aria-current={isActive ? 'true' : undefined}
                  data-surface={isActive ? 'dark' : undefined}
                  className={`block w-full rounded-none px-4 py-3 text-left transition-colors focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink ${
                    isActive ? 'bg-surface text-ink' : 'text-ink hover:bg-black/5'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm">
                      {isActive && <span aria-hidden>&gt;</span>}
                      {neighborhood.name}
                    </span>
                    {isActive && (
                      <span className="rounded-none border border-accent-ink px-1 text-label uppercase tracking-widest text-accent-ink">
                        ACTIVO
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-label uppercase tracking-widest text-ink-muted tabular-nums">
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
            <label className="block">
              <span className="sr-only">Nombre del distrito</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nombre"
                className={`${INPUT} w-full`}
              />
            </label>

            <div className="mt-3 flex gap-2" role="group" aria-label="Paleta del distrito">
              {HUD_PALETTES.map((palette) => (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => setPaletteId(palette.id)}
                  aria-pressed={paletteId === palette.id}
                  aria-label={palette.label}
                  title={palette.label}
                  className={`h-8 w-8 rounded-none border-2 transition-colors ${
                    paletteId === palette.id ? 'border-ink' : 'border-ink-muted hover:border-ink'
                  }`}
                  style={{ backgroundColor: palette.swatch }}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={name.trim().length === 0}
              className={`${BUTTON_PRIMARY} mt-4`}
            >
              Crear
            </button>
          </div>
        </form>
      </Zone>

      {activeId === null ? (
        <p className="text-sm text-ink-muted">Sin distritos. Creá el primero.</p>
      ) : (
        <NeighborhoodInspector state={state} neighborhoodId={activeId} />
      )}
    </div>
  );
}

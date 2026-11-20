import { useState } from 'react';
import { DECORATION_CATALOG } from '../../core/constants/economyConstants';
import { levelNeighborhoodBlock } from '../../core/rules/blockLeveling';
import { getDistrictProductionRate } from '../../core/rules/districtProduction';
import { upgradeNeighborhoodInfrastructure } from '../../core/rules/infrastructureUpgrade';
import type { DecorationKind, EntityId, GameState } from '../../core/types';
import { useGameStore } from '../../state/useGameStore';
import { HabitDistrict } from './HabitDistrict';
import {
  BUTTON_OUTLINE,
  BUTTON_PRIMARY,
  Chip,
  ErrorNote,
  Marker,
  Meter,
  PanelTitle,
  Rule,
  SectionLabel,
  StatCell,
  Zone,
} from './primitives';

interface NeighborhoodInspectorProps {
  state: GameState;
  neighborhoodId: EntityId;
}

const DECORATION_LABELS: Record<DecorationKind, string> = {
  SMALL_PLAZA: 'PLAZA PEQUEÑA',
  FOUNTAIN_PARK: 'PARQUE C/ FUENTE',
  CIVIC_MONUMENT: 'MONUMENTO CÍVICO',
};

const REJECTION_TEXT = {
  INSUFFICIENT_COINS: 'Saldo insuficiente en este barrio.',
  ALREADY_MAX_LEVEL: 'El barrio ya está en el Nivel 4.',
  NEIGHBORHOOD_NOT_FOUND: 'El barrio ya no existe.',
  BLOCK_NOT_FOUND: 'La cuadra ya no existe.',
  INFRASTRUCTURE_LEVEL_TOO_LOW: 'Primero subí la infraestructura a Nivel 2.',
  BLOCK_ALREADY_LEVELED: 'La cuadra ya está nivelada.',
} as const satisfies Record<string, string>;

export function NeighborhoodInspector({ state, neighborhoodId }: NeighborhoodInspectorProps) {
  const upgradeInfrastructure = useGameStore((store) => store.upgradeInfrastructure);
  const levelBlock = useGameStore((store) => store.levelBlock);
  const purchaseDecoration = useGameStore((store) => store.purchaseDecoration);

  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const neighborhood = state.neighborhoods[neighborhoodId];

  if (neighborhood === undefined) {
    return null;
  }

  // Dry run against the pure rule: the HUD never recomputes a cost formula.
  const upgradePreview = upgradeNeighborhoodInfrastructure(state, neighborhoodId);
  const upgradeCost = upgradePreview.status === 'UPGRADED' ? upgradePreview.cost : null;
  const isMaxLevel = neighborhood.infrastructureLevel === 4;

  const totalHouses = neighborhood.blocks.reduce(
    (total, block) => total + block.houses.length,
    0,
  );

  // UX-02: la tasa del distrito en este instante. Se lee del motor en cada
  // render —el HUD ya re-renderiza en cada tick—, nunca se persiste ni se
  // recalcula acá: la curva y el multiplicador son de `core/rules`.
  const production = getDistrictProductionRate(state, neighborhoodId, Date.now());

  async function handleUpgrade() {
    setPending(true);
    const result = await upgradeInfrastructure(neighborhoodId);
    setPending(false);
    setMessage(result.status === 'REJECTED' ? REJECTION_TEXT[result.reason] : null);
  }

  async function handleLevelBlock(x: number, y: number) {
    setPending(true);
    const result = await levelBlock(neighborhoodId, { x, y });
    setPending(false);
    setMessage(result.status === 'REJECTED' ? REJECTION_TEXT[result.reason] : null);
  }

  async function handleBuyDecoration(kind: DecorationKind) {
    setPending(true);
    const result = await purchaseDecoration(neighborhoodId, kind);
    setPending(false);
    setMessage(result.status === 'REJECTED' ? REJECTION_TEXT[result.reason] : null);
  }

  return (
    /* One zone, one pearl block. Infrastructure, decorations and blocks are
       sections of the same window, split by inset hairlines — never by
       interleaved fills or extra ribbons. */
    <Zone id="inspector" className="scroll-mt-4">
      <PanelTitle
        meta={
          <span className="flex items-center gap-3">
            {/* UX-02: eficiencia y tasa del distrito, junto a su nivel. Vive
                sólo acá —el inspector es la vista desplegada—; la sidebar se
                queda con su fila escueta. */}
            <span className="flex items-baseline gap-1">
              <span className="text-label uppercase tracking-widest text-ink-muted">Prod</span>
              <span className="text-label uppercase tracking-widest text-ink tabular-nums">
                {Math.round(production.efficiency * 100)}%
              </span>
              <span className="text-label uppercase tracking-widest text-ink tabular-nums">
                {production.coinsPerHour.toFixed(2)} CR/h
              </span>
            </span>
            <span className={Chip}>NV.{neighborhood.infrastructureLevel}</span>
          </span>
        }
      >
        <Marker tone="muted" />
        {neighborhood.name}
      </PanelTitle>

      <div className="p-5">
        <div className="flex items-end justify-between gap-4">
          <span className="text-label uppercase tracking-widest text-ink-muted">Urbanización</span>
          <span className="text-4xl leading-none text-ink tabular-nums">
            {Math.round(neighborhood.urbanizationProgress)}%
          </span>
        </div>
        <div className="mt-3">
          <Meter value={neighborhood.urbanizationProgress} label="Urbanización del barrio" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 pb-5 sm:grid-cols-4">
        <StatCell label="Tesorería" value={`${neighborhood.treasuryCoins} CR`} />
        <StatCell label="Cuadras" value={String(neighborhood.blocks.length)} />
        <StatCell label="Casas" value={String(totalHouses)} />
        <StatCell label="Tareas Hoy" value={String(neighborhood.dailyTasksCompletedCount)} />
      </div>

      <Rule />

      <div className="p-5">
        <SectionLabel>Infraestructura</SectionLabel>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pending || upgradeCost === null}
            onClick={() => void handleUpgrade()}
            className={BUTTON_PRIMARY}
          >
            <Marker />
            {isMaxLevel
              ? 'Nivel Máximo'
              : `Subir a Nv.${neighborhood.infrastructureLevel + 1}${upgradeCost === null ? '' : ` · ${upgradeCost} CR`}`}
          </button>
        </div>

        {message !== null && <ErrorNote className="mt-3">{message}</ErrorNote>}
      </div>

      <Rule />

      {/* Plaza de Infraestructura + Museo de Hábitos (US-06). Both are
          sections of this same zone: no extra ribbon, no extra surface. */}
      <HabitDistrict state={state} neighborhoodId={neighborhoodId} />

      <Rule />

      <div className="p-5">
        <SectionLabel>Decoraciones</SectionLabel>

        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(DECORATION_CATALOG) as DecorationKind[]).map((kind) => {
            const offer = DECORATION_CATALOG[kind];
            const affordable = neighborhood.treasuryCoins >= offer.cost;

            return (
              <button
                key={kind}
                type="button"
                disabled={pending || !affordable}
                onClick={() => void handleBuyDecoration(kind)}
                className={BUTTON_OUTLINE}
              >
                {DECORATION_LABELS[kind]} · {offer.cost} CR
              </button>
            );
          })}
        </div>
      </div>

      <Rule />

      <div className="p-5">
        <SectionLabel>Cuadras</SectionLabel>

        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {neighborhood.blocks.map((block) => {
            const preview = levelNeighborhoodBlock(state, neighborhoodId, block.gridPosition);
            const cost = preview.status === 'LEVELED' ? preview.cost : null;

            return (
              <li
                key={`${block.gridPosition.x}:${block.gridPosition.y}`}
                className="rounded-none border border-line p-4"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-label uppercase tracking-widest text-ink-muted">Cuadra</span>
                  <span className="text-2xl leading-none text-ink tabular-nums">
                    {block.gridPosition.x}:{block.gridPosition.y}
                  </span>
                </div>

                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="text-label uppercase tracking-widest text-ink-muted">Casas</span>
                  <span className="text-sm text-ink tabular-nums">
                    {block.houses.length}
                    <span className="text-ink-muted">/6</span>
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-label uppercase tracking-widest text-ink-muted">Estado</span>
                  <span className="text-label uppercase tracking-widest text-ink">
                    {block.isLeveled ? 'Nivelada' : 'Rústica'}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={pending || cost === null}
                  onClick={() => void handleLevelBlock(block.gridPosition.x, block.gridPosition.y)}
                  className={`${BUTTON_OUTLINE} mt-4 w-full`}
                >
                  {block.isLeveled ? 'Nivelada' : `Nivelar${cost === null ? '' : ` · ${cost} CR`}`}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Zone>
  );
}

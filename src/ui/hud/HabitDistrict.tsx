import { useState } from 'react';
import type { EntityId, GameState } from '../../core/types';
import { HabitMuseum } from './HabitMuseum';
import { HabitPlaza } from './HabitPlaza';
import { Rule, TAB_ITEM, TAB_ITEM_ACTIVE, TAB_ITEM_IDLE } from './primitives';

type HabitTab = 'PLAZA' | 'MUSEUM';

const TAB_LABELS: Record<HabitTab, string> = {
  PLAZA: 'Plaza',
  MUSEUM: 'Museo',
};

interface HabitDistrictProps {
  state: GameState;
  neighborhoodId: EntityId;
}

/**
 * Habit section of a barrio inspector: the Plaza de Infraestructura with its
 * productive lots, and the Museo de Hábitos where retired habits are exhibited.
 * Both live inside the inspector zone, so neither paints a surface of its own.
 */
export function HabitDistrict({ state, neighborhoodId }: HabitDistrictProps) {
  const [tab, setTab] = useState<HabitTab>('PLAZA');

  return (
    <div>
      <div className="px-2 pt-2">
        <div role="tablist" aria-label="Secciones de hábitos" className="flex gap-1">
          {(Object.keys(TAB_LABELS) as HabitTab[]).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              data-surface={tab === value ? 'dark' : undefined}
              onClick={() => setTab(value)}
              className={`flex-1 ${TAB_ITEM} ${tab === value ? TAB_ITEM_ACTIVE : TAB_ITEM_IDLE}`}
            >
              {TAB_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <Rule className="mx-4" />
      </div>

      {tab === 'PLAZA' ? (
        <HabitPlaza state={state} neighborhoodId={neighborhoodId} />
      ) : (
        <HabitMuseum state={state} neighborhoodId={neighborhoodId} />
      )}
    </div>
  );
}

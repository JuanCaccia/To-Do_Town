import type { EntityId, GameState, Neighborhood } from '../types';

export interface NewNeighborhoodInput {
  id: EntityId;
  name: string;
  paletteId: string;
}

const DEFAULT_ARCHITECTURAL_THEME_ID = 'CLASSIC_DIORAMA';
const FIRST_BLOCK_POSITION = { x: 0, y: 0 };

export function createNeighborhood(state: GameState, input: NewNeighborhoodInput): GameState {
  const neighborhood: Neighborhood = {
    name: input.name,
    paletteId: input.paletteId,
    architecturalThemeId: DEFAULT_ARCHITECTURAL_THEME_ID,
    infrastructureLevel: 1,
    treasuryCoins: 0,
    pendingCoinsRemainder: 0,
    urbanizationProgress: 0,
    dailyTasksCompletedCount: 0,
    lastOperationalDay: state.lastOperationalDay,
    reactivationPenaltyUntil: null,
    decorations: [],
    blocks: [
      {
        gridPosition: { ...FIRST_BLOCK_POSITION },
        houses: [],
        isLeveled: false,
      },
    ],
  };

  const tutorialNeighborhoodIds = findTutorialNeighborhoodIds(state);

  return {
    ...state,
    neighborhoods: {
      ...withoutNeighborhoods(state.neighborhoods, tutorialNeighborhoodIds),
      [input.id]: neighborhood,
    },
    habits: withoutEntitiesOf(state.habits, tutorialNeighborhoodIds),
    tasks: withoutEntitiesOf(state.tasks, tutorialNeighborhoodIds),
  };
}

function findTutorialNeighborhoodIds(state: GameState): ReadonlySet<EntityId> {
  return new Set(
    Object.entries(state.neighborhoods)
      .filter(([, neighborhood]) => neighborhood.isTutorial === true)
      .map(([id]) => id),
  );
}

function withoutNeighborhoods(
  neighborhoods: GameState['neighborhoods'],
  removedIds: ReadonlySet<EntityId>,
): GameState['neighborhoods'] {
  return Object.fromEntries(Object.entries(neighborhoods).filter(([id]) => !removedIds.has(id)));
}

function withoutEntitiesOf<T extends { neighborhoodId: EntityId }>(
  entities: Record<EntityId, T>,
  removedIds: ReadonlySet<EntityId>,
): Record<EntityId, T> {
  return Object.fromEntries(
    Object.entries(entities).filter(([, entity]) => !removedIds.has(entity.neighborhoodId)),
  );
}

import { BLOCK_LEVELING_COSTS, BLOCK_LEVELING_TOWN_HALL_XP } from '../constants/economyConstants';
import type { CityBlock, EntityId, GameState } from '../types';
import { withQualityOfLifeXp } from './townHallLevel';

export type BlockLevelingRejection =
  | 'NEIGHBORHOOD_NOT_FOUND'
  | 'BLOCK_NOT_FOUND'
  | 'INFRASTRUCTURE_LEVEL_TOO_LOW'
  | 'BLOCK_ALREADY_LEVELED'
  | 'INSUFFICIENT_COINS';

export type BlockLevelingResult =
  | { status: 'LEVELED'; state: GameState; cost: number }
  | { status: 'REJECTED'; reason: BlockLevelingRejection };

export function levelNeighborhoodBlock(
  state: GameState,
  neighborhoodId: EntityId,
  position: CityBlock['gridPosition'],
): BlockLevelingResult {
  const neighborhood = state.neighborhoods[neighborhoodId];

  if (neighborhood === undefined) {
    return { status: 'REJECTED', reason: 'NEIGHBORHOOD_NOT_FOUND' };
  }

  if (neighborhood.infrastructureLevel === 1) {
    return { status: 'REJECTED', reason: 'INFRASTRUCTURE_LEVEL_TOO_LOW' };
  }

  const target = neighborhood.blocks.find(
    (block) => block.gridPosition.x === position.x && block.gridPosition.y === position.y,
  );

  if (target === undefined) {
    return { status: 'REJECTED', reason: 'BLOCK_NOT_FOUND' };
  }

  if (target.isLeveled) {
    return { status: 'REJECTED', reason: 'BLOCK_ALREADY_LEVELED' };
  }

  const cost = BLOCK_LEVELING_COSTS[neighborhood.infrastructureLevel];

  if (neighborhood.treasuryCoins < cost) {
    return { status: 'REJECTED', reason: 'INSUFFICIENT_COINS' };
  }

  return {
    status: 'LEVELED',
    cost,
    state: {
      ...state,
      neighborhoods: {
        ...state.neighborhoods,
        [neighborhoodId]: {
          ...neighborhood,
          treasuryCoins: neighborhood.treasuryCoins - cost,
          blocks: neighborhood.blocks.map((block) =>
            block === target ? { ...block, isLeveled: true } : block,
          ),
        },
      },
      globals: {
        ...state.globals,
        townHall: withQualityOfLifeXp(state.globals.townHall, BLOCK_LEVELING_TOWN_HALL_XP),
      },
    },
  };
}

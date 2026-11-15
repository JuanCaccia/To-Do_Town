import { INFRASTRUCTURE_UPGRADE_TIERS } from '../constants/economyConstants';
import type { EntityId, GameState, Neighborhood } from '../types';
import { withQualityOfLifeXp } from './townHallLevel';

export type InfrastructureUpgradeRejection =
  | 'INSUFFICIENT_COINS'
  | 'ALREADY_MAX_LEVEL'
  | 'NEIGHBORHOOD_NOT_FOUND';

export type InfrastructureUpgradeResult =
  | { status: 'UPGRADED'; state: GameState; cost: number }
  | { status: 'REJECTED'; reason: InfrastructureUpgradeRejection };

export function upgradeNeighborhoodInfrastructure(
  state: GameState,
  neighborhoodId: EntityId,
): InfrastructureUpgradeResult {
  const neighborhood = state.neighborhoods[neighborhoodId];

  if (neighborhood === undefined) {
    return { status: 'REJECTED', reason: 'NEIGHBORHOOD_NOT_FOUND' };
  }

  if (neighborhood.infrastructureLevel === 4) {
    return { status: 'REJECTED', reason: 'ALREADY_MAX_LEVEL' };
  }

  const targetLevel = (neighborhood.infrastructureLevel + 1) as 2 | 3 | 4;
  const tier = INFRASTRUCTURE_UPGRADE_TIERS[targetLevel];
  const cost = tier.baseCost + tier.costPerLeveledBlock * countLeveledBlocks(neighborhood);

  if (neighborhood.treasuryCoins < cost) {
    return { status: 'REJECTED', reason: 'INSUFFICIENT_COINS' };
  }

  return {
    status: 'UPGRADED',
    cost,
    state: {
      ...state,
      neighborhoods: {
        ...state.neighborhoods,
        [neighborhoodId]: {
          ...neighborhood,
          infrastructureLevel: targetLevel,
          treasuryCoins: neighborhood.treasuryCoins - cost,
        },
      },
      globals: {
        ...state.globals,
        townHall: withQualityOfLifeXp(state.globals.townHall, tier.townHallXp),
      },
    },
  };
}

function countLeveledBlocks(neighborhood: Neighborhood): number {
  return neighborhood.blocks.filter((block) => block.isLeveled).length;
}

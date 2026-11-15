import { DECORATION_CATALOG } from '../constants/economyConstants';
import type { DecorationKind, EntityId, GameState } from '../types';
import { withQualityOfLifeXp } from './townHallLevel';

export type DecorationPurchaseRejection = 'NEIGHBORHOOD_NOT_FOUND' | 'INSUFFICIENT_COINS';

export type DecorationPurchaseResult =
  | { status: 'PURCHASED'; state: GameState; cost: number }
  | { status: 'REJECTED'; reason: DecorationPurchaseRejection };

export interface DecorationPurchaseInput {
  neighborhoodId: EntityId;
  decorationId: EntityId;
  kind: DecorationKind;
}

export function purchaseNeighborhoodDecoration(
  state: GameState,
  input: DecorationPurchaseInput,
): DecorationPurchaseResult {
  const neighborhood = state.neighborhoods[input.neighborhoodId];

  if (neighborhood === undefined) {
    return { status: 'REJECTED', reason: 'NEIGHBORHOOD_NOT_FOUND' };
  }

  const offer = DECORATION_CATALOG[input.kind];

  if (neighborhood.treasuryCoins < offer.cost) {
    return { status: 'REJECTED', reason: 'INSUFFICIENT_COINS' };
  }

  return {
    status: 'PURCHASED',
    cost: offer.cost,
    state: {
      ...state,
      neighborhoods: {
        ...state.neighborhoods,
        [input.neighborhoodId]: {
          ...neighborhood,
          treasuryCoins: neighborhood.treasuryCoins - offer.cost,
          decorations: [...neighborhood.decorations, { id: input.decorationId, kind: input.kind }],
        },
      },
      globals: {
        ...state.globals,
        townHall: withQualityOfLifeXp(state.globals.townHall, offer.townHallXp),
      },
    },
  };
}

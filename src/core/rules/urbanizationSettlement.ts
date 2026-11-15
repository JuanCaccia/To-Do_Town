import type { CityBlock, EntityId, GameState, House, TimestampMs } from '../types';
import { withQualityOfLifeXp } from './townHallLevel';

const URBANIZATION_POINTS_PER_HOUSE = 100;
const HOUSE_TOWN_HALL_XP = 10;
const LOT_INDICES: ReadonlyArray<House['lotIndex']> = [0, 1, 2, 3, 4, 5];
const ORTHOGONAL_OFFSETS: ReadonlyArray<CityBlock['gridPosition']> = [
  { x: 0, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
];
const DESIGN_VARIANT_BY_LOT: Readonly<Record<House['lotIndex'], House['designVariant']>> = {
  0: 1,
  1: 2,
  2: 3,
  3: 1,
  4: 2,
  5: 3,
};

export function settleUrbanization(
  state: GameState,
  neighborhoodId: EntityId,
  now: TimestampMs,
): GameState {
  const neighborhood = state.neighborhoods[neighborhoodId];

  if (neighborhood === undefined || neighborhood.blocks.length === 0) {
    return state;
  }

  const houseCount = Math.floor(neighborhood.urbanizationProgress / URBANIZATION_POINTS_PER_HOUSE);

  if (houseCount === 0) {
    return state;
  }

  return {
    ...state,
    neighborhoods: {
      ...state.neighborhoods,
      [neighborhoodId]: {
        ...neighborhood,
        urbanizationProgress:
          neighborhood.urbanizationProgress - houseCount * URBANIZATION_POINTS_PER_HOUSE,
        blocks: placeHouses(neighborhood.blocks, houseCount, now),
      },
    },
    globals: {
      ...state.globals,
      townHall: withQualityOfLifeXp(state.globals.townHall, houseCount * HOUSE_TOWN_HALL_XP),
    },
  };
}

function placeHouses(
  blocks: readonly CityBlock[],
  houseCount: number,
  now: TimestampMs,
): CityBlock[] {
  const result = [...blocks];
  let activeIndex = result.length - 1;
  let activeBlock = result[activeIndex];
  let pending = houseCount;

  while (pending > 0 && activeBlock !== undefined) {
    const occupiedLots = new Set(activeBlock.houses.map((house) => house.lotIndex));
    const freeLots = LOT_INDICES.filter((lotIndex) => !occupiedLots.has(lotIndex));
    const placing = freeLots.slice(0, pending);

    if (placing.length === 0) {
      activeIndex = result.length;
      activeBlock = inaugurateBlock(result);
      result.push(activeBlock);
      continue;
    }

    activeBlock = {
      ...activeBlock,
      houses: [...activeBlock.houses, ...placing.map((lotIndex) => createHouse(lotIndex, now))],
    };
    result[activeIndex] = activeBlock;
    pending -= placing.length;
  }

  return result;
}

function createHouse(lotIndex: House['lotIndex'], now: TimestampMs): House {
  return { lotIndex, designVariant: DESIGN_VARIANT_BY_LOT[lotIndex], createdAt: now };
}

function inaugurateBlock(blocks: readonly CityBlock[]): CityBlock {
  return { gridPosition: freePosition(blocks), houses: [], isLeveled: false };
}

// US-03 CA-04: compact growth — the free orthogonal slot with the most neighbouring
// blocks of this neighborhood wins; ties fall back to distance from the origin and,
// finally, to reading order (y asc, then x asc).
function freePosition(blocks: readonly CityBlock[]): CityBlock['gridPosition'] {
  const taken = new Set(blocks.map((block) => positionKey(block.gridPosition)));
  const candidates = new Map<string, CityBlock['gridPosition']>();

  for (const block of blocks) {
    for (const offset of ORTHOGONAL_OFFSETS) {
      const position = {
        x: block.gridPosition.x + offset.x,
        y: block.gridPosition.y + offset.y,
      };
      const key = positionKey(position);

      if (!taken.has(key)) {
        candidates.set(key, position);
      }
    }
  }

  const [chosen] = [...candidates.values()].sort(
    (left, right) =>
      countAdjacentBlocks(right, taken) - countAdjacentBlocks(left, taken) ||
      manhattanDistance(left) - manhattanDistance(right) ||
      left.y - right.y ||
      left.x - right.x,
  );

  if (chosen === undefined) {
    throw new Error('freePosition: no hay coordenada libre lindante a una cuadra existente');
  }

  return chosen;
}

function countAdjacentBlocks(
  position: CityBlock['gridPosition'],
  taken: ReadonlySet<string>,
): number {
  return ORTHOGONAL_OFFSETS.filter((offset) =>
    taken.has(positionKey({ x: position.x + offset.x, y: position.y + offset.y })),
  ).length;
}

function manhattanDistance({ x, y }: CityBlock['gridPosition']): number {
  return Math.abs(x) + Math.abs(y);
}

function positionKey({ x, y }: CityBlock['gridPosition']): string {
  return `${x}:${y}`;
}

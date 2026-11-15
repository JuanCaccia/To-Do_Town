import type { TownHall } from '../types';

const TOWN_HALL_LEVELS: ReadonlyArray<{ level: TownHall['level']; minXp: number }> = [
  { level: 1, minXp: 0 },
  { level: 2, minXp: 100 },
  { level: 3, minXp: 350 },
  { level: 4, minXp: 1_000 },
  { level: 5, minXp: 2_500 },
];

export function getTownHallLevel(qualityOfLifeXP: number): TownHall['level'] {
  const reached = TOWN_HALL_LEVELS.filter((entry) => qualityOfLifeXP >= entry.minXp).at(-1);

  return reached?.level ?? 1;
}

export function withQualityOfLifeXp(townHall: TownHall, gainedXp: number): TownHall {
  const qualityOfLifeXP = townHall.qualityOfLifeXP + gainedXp;

  return { level: getTownHallLevel(qualityOfLifeXP), qualityOfLifeXP };
}

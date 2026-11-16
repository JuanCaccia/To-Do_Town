import { TOWN_HALL_LEVEL_THRESHOLDS } from '../constants/economyConstants';
import type { TownHall } from '../types';
import { resolveLevel } from './levelThreshold';

export function withQualityOfLifeXp(townHall: TownHall, gainedXp: number): TownHall {
  const qualityOfLifeXP = townHall.qualityOfLifeXP + gainedXp;

  return { level: resolveLevel(TOWN_HALL_LEVEL_THRESHOLDS, qualityOfLifeXP), qualityOfLifeXP };
}

import type { DecorationKind, TaskWeight } from '../types';

export interface InfrastructureUpgradeTier {
  baseCost: number;
  costPerLeveledBlock: number;
  townHallXp: number;
}

export interface DecorationOffer {
  cost: number;
  townHallXp: number;
}

export interface TaskReward {
  coins: number;
  urbanizationProgress: number;
}

export const INFRASTRUCTURE_UPGRADE_TIERS: Record<2 | 3 | 4, InfrastructureUpgradeTier> = {
  2: { baseCost: 600, costPerLeveledBlock: 200, townHallXp: 50 },
  3: { baseCost: 1_500, costPerLeveledBlock: 400, townHallXp: 120 },
  4: { baseCost: 3_500, costPerLeveledBlock: 800, townHallXp: 300 },
};

export const BLOCK_LEVELING_COSTS: Record<2 | 3 | 4, number> = {
  2: 300,
  3: 600,
  4: 1_000,
};

export const BLOCK_LEVELING_TOWN_HALL_XP = 30;

export const DECORATION_CATALOG: Record<DecorationKind, DecorationOffer> = {
  SMALL_PLAZA: { cost: 500, townHallXp: 25 },
  FOUNTAIN_PARK: { cost: 1_200, townHallXp: 60 },
  CIVIC_MONUMENT: { cost: 2_500, townHallXp: 125 },
};

export const TASK_REWARDS: Record<TaskWeight, TaskReward> = {
  SIMPLE: { coins: 20, urbanizationProgress: 10 },
  STANDARD: { coins: 50, urbanizationProgress: 25 },
  COMPLEX: { coins: 100, urbanizationProgress: 50 },
};

export interface TaskFatigueModel {
  localOptimalQuota: number;
  localFatigueQuota: number;
  globalOptimalQuota: number;
  globalFatigueQuota: number;
  fatigueMultiplier: number;
  exhaustionMultiplier: number;
  maxWaterBonusTasks: number;
}

/** ECONOMY §2.3: fatiga laboral de doble capa (cupo local y estamina global). */
export const TASK_FATIGUE: TaskFatigueModel = {
  localOptimalQuota: 5,
  localFatigueQuota: 5,
  globalOptimalQuota: 8,
  globalFatigueQuota: 6,
  fatigueMultiplier: 0.5,
  exhaustionMultiplier: 0.1,
  maxWaterBonusTasks: 2,
};

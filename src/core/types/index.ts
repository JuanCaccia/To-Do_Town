export type TimestampMs = number;

export type EntityId = string;
export type ArchitecturalThemeId = string;

export interface UserProfileAndEntitlements {
  userId: string;
  planTier: 'LOCAL_FREE' | 'CLOUD_SYNC_PRO' | 'PERSONAL_DEV';
  cloudSyncEnabled: boolean;
  unlockedThemes: ArchitecturalThemeId[];
}

export interface DayCycleConfig {
  dayCutoffHour: number;
  gracePeriodHours: number;
}

export interface PomodoroPreset {
  workMinutes: number;
  shortBreakMinutes: number;
  cyclesBeforeLongBreak: number;
}

export interface TownHall {
  level: 1 | 2 | 3 | 4 | 5;
  qualityOfLifeXP: number;
}

export interface CentralLibrary {
  level: 1 | 2 | 3 | 4 | 5;
  totalPagesRead: number;
}

export interface CentralAqueduct {
  level: 1 | 2 | 3 | 4 | 5;
  totalHistoricalLiters: number;
  dailyLiters: number;
  dailyTargetLiters: number;
  lastOperationalDay: string;
}

export interface House {
  lotIndex: 0 | 1 | 2 | 3 | 4 | 5;
  designVariant: 1 | 2 | 3;
}

export interface CityBlock {
  gridPosition: { x: number; y: number };
  houses: House[];
  isLeveled: boolean;
}

export interface Neighborhood {
  name: string;
  isTutorial?: boolean;
  infrastructureLevel: 1 | 2 | 3 | 4;
  treasuryCoins: number;
  urbanizationProgress: number;
  blocks: CityBlock[];
}

export interface GameState {
  cityStatus: 'ACTIVE' | 'MANUAL_PAUSE' | 'AUTO_PAUSED_HIBERNATION';
  lastTickAt: TimestampMs;
  lastUserInteractionAt: TimestampMs;
  account: UserProfileAndEntitlements;
  config: {
    dayCycle: DayCycleConfig;
    pomodoroPresets: PomodoroPreset[];
  };
  globals: {
    townHall: TownHall;
    library: CentralLibrary;
    aqueduct: CentralAqueduct;
  };
  neighborhoods: Record<EntityId, Neighborhood>;
}

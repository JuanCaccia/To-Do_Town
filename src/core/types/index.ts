export type TimestampMs = number;

export type EntityId = string;

export interface DomainEventRecord {
  eventId: EntityId;
  userId: string;
  deviceId: string;
  timestamp: TimestampMs;
  type: string;
  payload: Record<string, unknown>;
  syncedAt: TimestampMs | null;
}

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
}

export interface House {
  lotIndex: 0 | 1 | 2 | 3 | 4 | 5;
  designVariant: 1 | 2 | 3;
  createdAt: TimestampMs;
}

export interface CityBlock {
  gridPosition: { x: number; y: number };
  houses: House[];
  isLeveled: boolean;
}

export type DecorationKind = 'SMALL_PLAZA' | 'FOUNTAIN_PARK' | 'CIVIC_MONUMENT';

export interface DecorationItem {
  id: EntityId;
  kind: DecorationKind;
}

export interface Neighborhood {
  name: string;
  isTutorial?: boolean;
  paletteId: string;
  architecturalThemeId: ArchitecturalThemeId;
  infrastructureLevel: 1 | 2 | 3 | 4;
  treasuryCoins: number;
  urbanizationProgress: number;
  dailyTasksCompletedCount: number;
  lastOperationalDay: string;
  reactivationPenaltyUntil: TimestampMs | null;
  decorations: DecorationItem[];
  blocks: CityBlock[];
}

export type HabitFrequency =
  | { type: 'DAILY' }
  | { type: 'TIMES_PER_WEEK'; count: number };

export type HabitCheckpointLevel = 1 | 2 | 3 | 4 | 5;

export interface HabitBuilding {
  neighborhoodId: EntityId;
  title: string;
  frequency: HabitFrequency;
  currentStreakDays: number;
  checkpointLevel: HabitCheckpointLevel;
  lastCompletedAt: TimestampMs | null;
  createdAt: TimestampMs;
  lastFrequencyChangeAt: TimestampMs | null;
  retiredAt: TimestampMs | null;
  status: 'ACTIVE' | 'PAUSED' | 'RETIRED_TO_MUSEUM';
}

export type TaskWeight = 'SIMPLE' | 'STANDARD' | 'COMPLEX';

export interface OneOffTask {
  neighborhoodId: EntityId;
  title: string;
  weight: TaskWeight;
  boardStatus: 'MASTER_PLAN' | 'IN_CONSTRUCTION' | 'COMPLETED';
  createdAt: TimestampMs;
  completedAt: TimestampMs | null;
}

export interface GameState {
  cityStatus: 'ACTIVE' | 'MANUAL_PAUSE' | 'AUTO_PAUSED_HIBERNATION';
  lastTickAt: TimestampMs;
  lastUserInteractionAt: TimestampMs;
  lastOperationalDay: string;
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
  habits: Record<EntityId, HabitBuilding>;
  tasks: Record<EntityId, OneOffTask>;
}

export type TimestampMs = number;

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

export interface GameState {
  cityStatus: 'ACTIVE' | 'MANUAL_PAUSE' | 'AUTO_PAUSED_HIBERNATION';
  lastTickAt: TimestampMs;
  lastUserInteractionAt: TimestampMs;
  account: UserProfileAndEntitlements;
  config: {
    dayCycle: DayCycleConfig;
    pomodoroPresets: PomodoroPreset[];
  };
}

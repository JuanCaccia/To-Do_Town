import type { GameState, TimestampMs } from '../types';

export function createDayZeroState(now: TimestampMs): GameState {
  return {
    cityStatus: 'ACTIVE',
    lastTickAt: now,
    lastUserInteractionAt: now,
    account: {
      userId: 'local-owner',
      planTier: 'PERSONAL_DEV',
      cloudSyncEnabled: false,
      unlockedThemes: ['CLASSIC_DIORAMA'],
    },
    config: {
      dayCycle: {
        dayCutoffHour: 0,
        gracePeriodHours: 4,
      },
      pomodoroPresets: [
        { workMinutes: 25, shortBreakMinutes: 5, cyclesBeforeLongBreak: 4 },
        { workMinutes: 50, shortBreakMinutes: 15, cyclesBeforeLongBreak: 4 },
      ],
    },
  };
}

import type { DayCycleConfig, GameState, TimestampMs } from '../types';
import { getOperationalDay } from '../rules/dayCycle';

const DAY_ZERO_DAY_CYCLE: DayCycleConfig = {
  dayCutoffHour: 0,
  gracePeriodHours: 4,
};

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
      dayCycle: DAY_ZERO_DAY_CYCLE,
      pomodoroPresets: [
        { workMinutes: 25, shortBreakMinutes: 5, cyclesBeforeLongBreak: 4 },
        { workMinutes: 50, shortBreakMinutes: 15, cyclesBeforeLongBreak: 4 },
      ],
    },
    globals: {
      townHall: { level: 1, qualityOfLifeXP: 0 },
      library: { level: 1, totalPagesRead: 0 },
      aqueduct: {
        level: 1,
        totalHistoricalLiters: 0,
        dailyLiters: 0,
        dailyTargetLiters: 2.0,
        lastOperationalDay: getOperationalDay(now, DAY_ZERO_DAY_CYCLE),
      },
    },
  };
}

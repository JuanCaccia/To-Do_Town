import type { DayCycleConfig, GameState, TimestampMs } from '../types';
import { getOperationalDay } from '../rules/dayCycle';

const DAY_ZERO_DAY_CYCLE: DayCycleConfig = {
  dayCutoffHour: 0,
  gracePeriodHours: 4,
};

export function createDayZeroState(now: TimestampMs): GameState {
  const operationalDay = getOperationalDay(now, DAY_ZERO_DAY_CYCLE);

  return {
    cityStatus: 'ACTIVE',
    lastTickAt: now,
    lastUserInteractionAt: now,
    lastOperationalDay: operationalDay,
    account: {
      userId: 'local-owner',
      planTier: 'PERSONAL_DEV',
      cloudSyncEnabled: false,
      unlockedThemes: ['CLASSIC_DIORAMA'],
    },
    config: {
      dayCycle: DAY_ZERO_DAY_CYCLE,
      pomodoroPresets: [
        {
          id: 'pomodoro-25-5',
          name: '25/5',
          workMinutes: 25,
          shortBreakMinutes: 5,
          cyclesBeforeLongBreak: 4,
          longBreakMinutes: null,
        },
        {
          id: 'pomodoro-50-15',
          name: '50/15',
          workMinutes: 50,
          shortBreakMinutes: 15,
          cyclesBeforeLongBreak: 4,
          longBreakMinutes: null,
        },
      ],
    },
    globals: {
      townHall: { level: 1, qualityOfLifeXP: 0 },
      library: { level: 1, totalPagesRead: 0, dailyPagesRead: 0 },
      aqueduct: {
        level: 1,
        totalHistoricalLiters: 0,
        dailyLiters: 0,
        dailyTargetLiters: 2.0,
      },
    },
    neighborhoods: {
      'tutorial-neighborhood-id': {
        name: 'Barrio Tutorial',
        isTutorial: true,
        paletteId: 'TUTORIAL_DEFAULT',
        architecturalThemeId: 'CLASSIC_DIORAMA',
        infrastructureLevel: 1,
        treasuryCoins: 500,
        pendingCoinsRemainder: 0,
        urbanizationProgress: 50,
        dailyTasksCompletedCount: 0,
        lastOperationalDay: operationalDay,
        reactivationPenaltyUntil: null,
        decorations: [],
        blocks: [
          {
            gridPosition: { x: 0, y: 0 },
            isLeveled: false,
            houses: [
              { lotIndex: 0, designVariant: 1, createdAt: now },
              { lotIndex: 1, designVariant: 2, createdAt: now },
              { lotIndex: 2, designVariant: 3, createdAt: now },
            ],
          },
        ],
      },
    },
    habits: {
      'tutorial-habit-id': {
        neighborhoodId: 'tutorial-neighborhood-id',
        title: 'Hábito Tutorial',
        frequency: { type: 'DAILY' },
        currentStreakDays: 0,
        checkpointLevel: 1,
        lastCompletedAt: null,
        createdAt: now,
        lastFrequencyChangeAt: null,
        retiredAt: null,
        status: 'ACTIVE',
      },
    },
    tasks: {
      'tutorial-complex-task-id': {
        neighborhoodId: 'tutorial-neighborhood-id',
        title: 'Tarea Tutorial Compleja',
        weight: 'COMPLEX',
        boardStatus: 'IN_CONSTRUCTION',
        createdAt: now,
        completedAt: null,
      },
      'tutorial-standard-task-id': {
        neighborhoodId: 'tutorial-neighborhood-id',
        title: 'Tarea Tutorial Estándar',
        weight: 'STANDARD',
        boardStatus: 'MASTER_PLAN',
        createdAt: now,
        completedAt: null,
      },
    },
    focusSessions: {},
    dailyFocusMinutes: 0,
  };
}

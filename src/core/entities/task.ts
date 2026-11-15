import { TASK_REWARDS } from '../constants/economyConstants';
import { getTaskFatigueMultiplier } from '../rules/taskFatigue';
import { settleUrbanization } from '../rules/urbanizationSettlement';
import type { EntityId, GameState, OneOffTask, TaskWeight, TimestampMs } from '../types';

export interface NewTaskInput {
  id: EntityId;
  neighborhoodId: EntityId;
  title: string;
  weight: TaskWeight;
}

export interface TaskUpdateInput {
  title?: string;
  weight?: TaskWeight;
}

export function createTask(state: GameState, input: NewTaskInput, now: TimestampMs): GameState {
  const task: OneOffTask = {
    neighborhoodId: input.neighborhoodId,
    title: input.title,
    weight: input.weight,
    boardStatus: 'MASTER_PLAN',
    createdAt: now,
    completedAt: null,
  };

  return {
    ...state,
    tasks: {
      ...state.tasks,
      [input.id]: task,
    },
  };
}

export function moveTask(
  state: GameState,
  taskId: EntityId,
  target: 'MASTER_PLAN' | 'IN_CONSTRUCTION',
): GameState {
  const task = state.tasks[taskId];

  if (task === undefined || task.boardStatus === 'COMPLETED') {
    return state;
  }

  return {
    ...state,
    tasks: {
      ...state.tasks,
      [taskId]: { ...task, boardStatus: target },
    },
  };
}

export function completeTask(state: GameState, taskId: EntityId, now: TimestampMs): GameState {
  const task = state.tasks[taskId];

  if (task === undefined || task.boardStatus !== 'IN_CONSTRUCTION') {
    return state;
  }

  const neighborhood = state.neighborhoods[task.neighborhoodId];

  if (neighborhood === undefined) {
    return state;
  }

  const globalTasksCompletedCount = Object.values(state.neighborhoods).reduce(
    (total, current) => total + current.dailyTasksCompletedCount,
    0,
  );

  const multiplier = getTaskFatigueMultiplier(
    neighborhood.dailyTasksCompletedCount,
    globalTasksCompletedCount,
    state.globals.aqueduct.dailyLiters,
  );

  const reward = TASK_REWARDS[task.weight];
  const coins = reward.coins * multiplier;
  const urbanizationGain = reward.urbanizationProgress * multiplier;

  const completed: GameState = {
    ...state,
    tasks: {
      ...state.tasks,
      [taskId]: { ...task, boardStatus: 'COMPLETED', completedAt: now },
    },
    neighborhoods: {
      ...state.neighborhoods,
      [task.neighborhoodId]: {
        ...neighborhood,
        treasuryCoins: neighborhood.treasuryCoins + coins,
        urbanizationProgress: neighborhood.urbanizationProgress + urbanizationGain,
        dailyTasksCompletedCount: neighborhood.dailyTasksCompletedCount + 1,
      },
    },
  };

  return settleUrbanization(completed, task.neighborhoodId, now);
}

export function updateTask(
  state: GameState,
  taskId: EntityId,
  changes: TaskUpdateInput,
): GameState {
  const task = state.tasks[taskId];

  if (task === undefined || task.boardStatus === 'COMPLETED') {
    return state;
  }

  const updated: OneOffTask = {
    ...task,
    title: changes.title ?? task.title,
    weight: changes.weight ?? task.weight,
  };

  return {
    ...state,
    tasks: {
      ...state.tasks,
      [taskId]: updated,
    },
  };
}

export function deleteTask(state: GameState, taskId: EntityId): GameState {
  const task = state.tasks[taskId];

  if (task === undefined || task.boardStatus === 'COMPLETED') {
    return state;
  }

  const remaining = Object.fromEntries(
    Object.entries(state.tasks).filter(([id]) => id !== taskId),
  );

  return {
    ...state,
    tasks: remaining,
  };
}

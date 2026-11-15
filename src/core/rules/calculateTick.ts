import type { GameState, Neighborhood, OneOffTask, TimestampMs } from '../types';
import { getOperationalDay } from './dayCycle';

/**
 * Orquestador de jornada (DEC-016). Detecta el cambio de día operativo y
 * recicla lo que no sobrevive la noche.
 *
 * No liquida producción pasiva: el delta `now - lastTickAt` queda impago a
 * propósito. US-07 CA-03 extiende esta misma función con esa liquidación y es
 * la única dueña de adelantar `lastTickAt`.
 */
export function calculateTick(state: GameState, now: TimestampMs): GameState {
  const operationalDay = getOperationalDay(now, state.config.dayCycle);

  if (operationalDay === state.lastOperationalDay) {
    return state;
  }

  return {
    ...state,
    lastOperationalDay: operationalDay,
    globals: {
      ...state.globals,
      aqueduct: { ...state.globals.aqueduct, dailyLiters: 0 },
    },
    neighborhoods: recycleNeighborhoods(state.neighborhoods, operationalDay),
    tasks: recycleTasks(state.tasks),
  };
}

function recycleNeighborhoods(
  neighborhoods: GameState['neighborhoods'],
  operationalDay: string,
): GameState['neighborhoods'] {
  return Object.fromEntries(
    Object.entries(neighborhoods).map(([id, neighborhood]): [string, Neighborhood] => [
      id,
      { ...neighborhood, dailyTasksCompletedCount: 0, lastOperationalDay: operationalDay },
    ]),
  );
}

function recycleTasks(tasks: GameState['tasks']): GameState['tasks'] {
  return Object.fromEntries(
    Object.entries(tasks).map(([id, task]): [string, OneOffTask] => [
      id,
      task.boardStatus === 'IN_CONSTRUCTION' ? { ...task, boardStatus: 'MASTER_PLAN' } : task,
    ]),
  );
}

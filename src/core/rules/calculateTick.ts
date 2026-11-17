import type { GameState, Neighborhood, OneOffTask, TimestampMs } from '../types';
import { getOperationalDay } from './dayCycle';
import { applySafeFloor } from './habitDecay';
import { settlePassiveProduction } from './passiveProduction';

/**
 * Orquestador de producción pasiva, piso seguro y jornada (DEC-016, DEC-018).
 *
 * El orden importa: liquidar primero (cobra lo devengado con la eficiencia que
 * regía en cada tramo), después aplicar la caída a Apagón —que adelanta
 * `lastTickAt`— y recién entonces reciclar la jornada. Si ninguna regla mutó,
 * devuelve la misma referencia y `lastTickAt` no se adelanta: el latido técnico
 * no es evento de negocio.
 */
export function calculateTick(state: GameState, now: TimestampMs): GameState {
  const settled = settlePassiveProduction(state, now);
  const decayed = applySafeFloor(settled, now);
  const operationalDay = getOperationalDay(now, state.config.dayCycle);

  if (operationalDay === decayed.lastOperationalDay) {
    return decayed;
  }

  return {
    ...decayed,
    lastOperationalDay: operationalDay,
    // US-09 CA-03: `F_día` también es del día operativo.
    dailyFocusMinutes: 0,
    globals: {
      ...decayed.globals,
      aqueduct: { ...decayed.globals.aqueduct, dailyLiters: 0 },
      // US-09 CA-01: el cupo de lectura también es del día operativo.
      library: { ...decayed.globals.library, dailyPagesRead: 0 },
    },
    neighborhoods: recycleNeighborhoods(decayed.neighborhoods, operationalDay),
    tasks: recycleTasks(decayed.tasks),
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

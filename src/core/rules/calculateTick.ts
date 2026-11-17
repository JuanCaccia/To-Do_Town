import type { GameState, Neighborhood, OneOffTask, TimestampMs } from '../types';
import { getCityNow } from './cityClock';
import { getOperationalDay } from './dayCycle';
import { applySafeFloor } from './habitDecay';
import { hibernateCity, shouldHibernate } from './hibernation';
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
  // US-10 CA-02: durante la pausa el reloj de la ciudad no avanza: liquidación y
  // caída se evalúan en el instante de pausa, no en el `now` de pared.
  const decayed = settleCity(state, now);
  const operationalDay = getOperationalDay(now, state.config.dayCycle);

  if (operationalDay === decayed.lastOperationalDay) {
    return shouldHibernate(decayed, now) ? hibernateCity(decayed, now) : decayed;
  }

  const recycled: GameState = {
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

  return shouldHibernate(recycled, now) ? hibernateCity(recycled, now) : recycled;
}

/**
 * Liquidación completa de la ciudad en su reloj operativo (US-10 CA-02,
 * DEC-019). `getCityNow` congela el tiempo durante la pausa, así que este es el
 * único lugar donde el congelamiento y el orden producción → piso seguro viven
 * juntos: tick y acciones no pueden divergir.
 */
export function settleCity(state: GameState, now: TimestampMs): GameState {
  const cityNow = getCityNow(state, now);

  return applySafeFloor(settlePassiveProduction(state, cityNow), cityNow);
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

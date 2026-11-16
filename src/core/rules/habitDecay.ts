import type { GameState, HabitCheckpointLevel, EntityId, TimestampMs } from '../types';
import { HABIT_CHECKPOINTS } from '../constants/economyConstants';
import { isHabitInBlackout } from './habitEfficiency';

/**
 * Piso de días de cada checkpoint. No es una segunda tabla: el piso de un nivel
 * **es** el `streakDays` del escalón que lo desbloqueó (US-06 CA-02), así que se
 * deriva de `HABIT_CHECKPOINTS` y no puede desincronizarse de él. El Nv.1 no
 * figura porque no hay checkpoint previo: su piso es cero.
 */
const SAFE_FLOOR_DAYS: Record<number, number> = Object.fromEntries(
  HABIT_CHECKPOINTS.map((tier) => [tier.level, tier.streakDays]),
);

export function getSafeFloorDays(checkpointLevel: HabitCheckpointLevel): number {
  return SAFE_FLOOR_DAYS[checkpointLevel] ?? 0;
}

/**
 * US-07 CA-04: protege el piso seguro. Un hábito activo que superó su ventana y
 * cayó en Apagón pierde producción, pero no su edificio ni su checkpoint: su
 * racha retrocede **sólo hasta** el piso de ese checkpoint.
 *
 * Debe correr **después** de liquidar la producción: cuando muta, adelanta
 * `lastTickAt = now` (DEC-018), y hacerlo antes dejaría el intervalo sin cobrar.
 *
 * Es idempotente por construcción (`Math.min` contra el piso), así que no hace
 * falta marca persistida: una segunda pasada devuelve el mismo `GameState` y
 * DEC-018 la descarta por igualdad de estado.
 */
export function applySafeFloor(state: GameState, now: TimestampMs): GameState {
  const habits: GameState['habits'] = {};
  const lowered: EntityId[] = [];

  for (const [id, habit] of Object.entries(state.habits)) {
    const neighborhood = state.neighborhoods[habit.neighborhoodId];
    const floor = getSafeFloorDays(habit.checkpointLevel);

    if (
      neighborhood === undefined ||
      !isHabitInBlackout(habit, neighborhood.infrastructureLevel, now) ||
      habit.currentStreakDays <= floor
    ) {
      habits[id] = habit;
      continue;
    }

    habits[id] = { ...habit, currentStreakDays: floor };
    lowered.push(id);
  }

  return lowered.length === 0 ? state : { ...state, habits, lastTickAt: now };
}

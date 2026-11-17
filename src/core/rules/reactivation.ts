import type { EntityId, GameState, HabitBuilding, TimestampMs } from '../types';
import { isWaterDailyTargetMet } from './dailyCaps';

/** US-11 CA-02: el Arranque de Motores dura 24 horas. */
export const REACTIVATION_PENALTY_MS = 24 * 60 * 60 * 1000;

/**
 * US-11 CA-02: reactiva el barrio donde el usuario vuelve a actuar.
 *
 * Devuelve la ciudad a `ACTIVE`, despierta los hábitos `PAUSED` de ese barrio y
 * abre la ventana de Arranque de Motores, salvo que la meta diaria de agua ya
 * esté cumplida (Presión de Calderas, US-09 CA-02).
 *
 * `lastTickAt = now` es deliberado: la hibernación ya liquidó hasta ese
 * instante, y sin este corte el primer tick posterior cobraría el período
 * hibernado. Una pausa manual no se reactiva por acción: la libera su propio CA.
 * Sin nada pendiente devuelve la misma referencia (DEC-018).
 */
export function reactivateNeighborhood(
  state: GameState,
  neighborhoodId: EntityId,
  now: TimestampMs,
): GameState {
  if (state.cityStatus === 'MANUAL_PAUSE') {
    return state;
  }

  const neighborhood = state.neighborhoods[neighborhoodId];

  if (neighborhood === undefined) {
    return state;
  }

  const pausedHabits = Object.entries(state.habits).filter(
    ([, habit]) => habit.neighborhoodId === neighborhoodId && habit.status === 'PAUSED',
  );
  const isHibernated = state.cityStatus === 'AUTO_PAUSED_HIBERNATION';

  if (!isHibernated && pausedHabits.length === 0) {
    return state;
  }

  const habits: GameState['habits'] = { ...state.habits };

  for (const [id, habit] of pausedHabits) {
    habits[id] = { ...habit, status: 'ACTIVE' } satisfies HabitBuilding;
  }

  return {
    ...state,
    cityStatus: 'ACTIVE',
    lastTickAt: now,
    lastUserInteractionAt: now,
    habits,
    neighborhoods: {
      ...state.neighborhoods,
      [neighborhoodId]: {
        ...neighborhood,
        reactivationPenaltyUntil: isWaterDailyTargetMet(state)
          ? null
          : now + REACTIVATION_PENALTY_MS,
      },
    },
  };
}

import { HABIT_COINS_PER_HOUR, REACTIVATION_PENALTY_MULTIPLIER } from '../constants/economyConstants';
import type { EntityId, GameState, Neighborhood, TimestampMs } from '../types';
import { getHabitEfficiencyRatio } from './habitEfficiency';

/**
 * UX-02: lo que un distrito está produciendo en el instante `now`.
 *
 * Es aritmética sobre las reglas que ya existen —`getHabitEfficiencyRatio`
 * (US-07) y el multiplicador de Arranque de Motores (US-11)—, no una segunda
 * implementación de la producción pasiva. La liquidación sigue siendo de
 * `settlePassiveProduction`; esto sólo lee la tasa del momento para mostrarla.
 */
export interface DistrictProductionRate {
  /** Monedas por hora que el distrito devenga ahora mismo. */
  coinsPerHour: number;
  /** Lo que devengaría con todos sus hábitos activos al 100% y sin penalización. */
  fullCapacityCoinsPerHour: number;
  /**
   * `coinsPerHour / fullCapacityCoinsPerHour`. Incluye la penalización: un
   * distrito en Arranque de Motores no puede mostrar más del 50%, porque el
   * número describe lo que produce, no lo que podría producir.
   */
  efficiency: number;
}

/**
 * US-11 CA-03: `M_barrio`. El borde es exclusivo —cuando `now` alcanza la marca
 * la ventana ya terminó—, igual que en la liquidación.
 */
export function getNeighborhoodMultiplier(
  neighborhood: Neighborhood,
  now: TimestampMs,
): number {
  const penaltyUntil = neighborhood.reactivationPenaltyUntil;

  return penaltyUntil !== null && now < penaltyUntil ? REACTIVATION_PENALTY_MULTIPLIER : 1;
}

/**
 * `EntityId` inexistente devuelve ceros en vez de lanzar: el HUD puede quedar
 * con una selección vieja un render después de borrar un distrito.
 */
export function getDistrictProductionRate(
  state: GameState,
  neighborhoodId: EntityId,
  now: TimestampMs,
): DistrictProductionRate {
  const neighborhood = state.neighborhoods[neighborhoodId];

  if (neighborhood === undefined) {
    return { coinsPerHour: 0, fullCapacityCoinsPerHour: 0, efficiency: 0 };
  }

  const multiplier = getNeighborhoodMultiplier(neighborhood, now);

  let activeHabits = 0;
  let yieldAtFullEfficiency = 0;

  for (const habit of Object.values(state.habits)) {
    if (habit.neighborhoodId !== neighborhoodId || habit.status !== 'ACTIVE') {
      continue;
    }

    const ratio = getHabitEfficiencyRatio(habit, neighborhood.infrastructureLevel, now);

    activeHabits += 1;
    yieldAtFullEfficiency += (HABIT_COINS_PER_HOUR * ratio.numerator) / ratio.denominator;
  }

  const fullCapacityCoinsPerHour = HABIT_COINS_PER_HOUR * activeHabits;
  const coinsPerHour = yieldAtFullEfficiency * multiplier;

  return {
    coinsPerHour,
    fullCapacityCoinsPerHour,
    efficiency: fullCapacityCoinsPerHour === 0 ? 0 : coinsPerHour / fullCapacityCoinsPerHour,
  };
}

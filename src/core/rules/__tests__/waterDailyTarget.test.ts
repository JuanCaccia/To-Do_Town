import { describe, expect, it } from 'vitest';
import { createDayZeroState } from '../../entities/dayZero';
import { createNeighborhood } from '../../entities/neighborhood';
import type { GameState, TimestampMs } from '../../types';
import {
  applyWaterDailyCap,
  clearReactivationPenaltiesAtWaterTarget,
  isWaterDailyTargetMet,
} from '../dailyCaps';

const NOW: TimestampMs = 1_700_000_000_000;
const MS_PER_HOUR = 3_600_000;
const PENALTY_UNTIL = NOW + 24 * MS_PER_HOUR;

const TUTORIAL_ID = 'tutorial-neighborhood-id';
const SECOND_ID = 'second-neighborhood';

/** Un `dailyLiters` ya consumido hoy, sin pasar por la regla de acreditación. */
function withWater(state: GameState, liters: number): GameState {
  return {
    ...state,
    globals: {
      ...state.globals,
      aqueduct: { ...state.globals.aqueduct, dailyLiters: liters },
    },
  };
}

/**
 * El test inyecta `reactivationPenaltyUntil` directamente para aislar la
 * liberación contra la meta: quien lo escribe en producción es US-11 CA-02.
 */
function withPenalty(state: GameState, neighborhoodId: string, until: TimestampMs | null): GameState {
  const neighborhood = state.neighborhoods[neighborhoodId]!;

  return {
    ...state,
    neighborhoods: {
      ...state.neighborhoods,
      [neighborhoodId]: { ...neighborhood, reactivationPenaltyUntil: until },
    },
  };
}

/** Dos barrios penalizados: el CA habla de "todos los barrios", no sólo del tutorial. */
function withTwoPenalizedNeighborhoods(state: GameState): GameState {
  const created = createNeighborhood(state, {
    id: SECOND_ID,
    name: 'Segundo Barrio',
    paletteId: 'SECOND_PALETTE',
  });

  return withPenalty(withPenalty(created, TUTORIAL_ID, PENALTY_UNTIL), SECOND_ID, PENALTY_UNTIL);
}

describe('isWaterDailyTargetMet — US-09 CA-02: predicado compartido con US-11', () => {
  it('es falso mientras el acumulado del día queda por debajo de la meta', () => {
    const state = withWater(createDayZeroState(NOW), 1.5);

    expect(isWaterDailyTargetMet(state)).toBe(false);
  });

  it('es verdadero al alcanzar exactamente la meta diaria', () => {
    const state = withWater(createDayZeroState(NOW), 2);

    expect(isWaterDailyTargetMet(state)).toBe(true);
  });
});

describe('clearReactivationPenaltiesAtWaterTarget — US-09 CA-02: Presión de Calderas', () => {
  it('anula la penalización de todos los barrios cuando la meta está cumplida', () => {
    const state = withWater(withTwoPenalizedNeighborhoods(createDayZeroState(NOW)), 2);

    const next = clearReactivationPenaltiesAtWaterTarget(state);

    expect(next.neighborhoods[TUTORIAL_ID]!.reactivationPenaltyUntil).toBeNull();
    expect(next.neighborhoods[SECOND_ID]!.reactivationPenaltyUntil).toBeNull();
  });

  it('no toca la penalización si la meta todavía no se cumplió', () => {
    const state = withWater(withTwoPenalizedNeighborhoods(createDayZeroState(NOW)), 1.5);

    const next = clearReactivationPenaltiesAtWaterTarget(state);

    expect(next).toBe(state);
    expect(next.neighborhoods[TUTORIAL_ID]!.reactivationPenaltyUntil).toBe(PENALTY_UNTIL);
  });

  it('devuelve la misma referencia cuando todos los barrios ya están limpios', () => {
    const state = withWater(createDayZeroState(NOW), 2);

    expect(clearReactivationPenaltiesAtWaterTarget(state)).toBe(state);
  });
});

describe('applyWaterDailyCap — US-09 CA-02: el registro de agua libera la penalización', () => {
  it('limpia la penalización cuando el aporte llega a la meta', () => {
    const state = withWater(withTwoPenalizedNeighborhoods(createDayZeroState(NOW)), 1.5);

    const result = applyWaterDailyCap(state, 1);

    expect(result.creditedLiters).toBe(0.5);
    expect(result.state.neighborhoods[TUTORIAL_ID]!.reactivationPenaltyUntil).toBeNull();
    expect(result.state.neighborhoods[SECOND_ID]!.reactivationPenaltyUntil).toBeNull();
  });

  it('no limpia la penalización si el aporte no alcanza la meta', () => {
    const state = withWater(withTwoPenalizedNeighborhoods(createDayZeroState(NOW)), 0.5);

    const result = applyWaterDailyCap(state, 1);

    expect(result.creditedLiters).toBe(1);
    expect(result.state.neighborhoods[TUTORIAL_ID]!.reactivationPenaltyUntil).toBe(PENALTY_UNTIL);
  });
});

import { AQUEDUCT_LEVEL_THRESHOLDS } from '../constants/economyConstants';
import type { GameState } from '../types';
import { resolveLevel } from './levelThreshold';

/** US-08 CA-01: los dos aportes que ofrecen los botones de la Barra Superior. */
export type WaterIntakeAmount = 0.5 | 1;

/**
 * Acredita agua declarada por el usuario en el Acueducto Central.
 *
 * Sin tope diario a propósito: el *hard cap* de 3.0 L/día es de US-09 CA-01 y lo
 * envuelve desde afuera (GOVERNANCE DEC-020). Sin `now`: el CA no tiene lógica
 * temporal, el reset del acumulado diario es de `calculateTick`.
 */
export function registerWaterIntake(state: GameState, amount: WaterIntakeAmount): GameState {
  const totalHistoricalLiters = state.globals.aqueduct.totalHistoricalLiters + amount;

  return {
    ...state,
    globals: {
      ...state.globals,
      aqueduct: {
        ...state.globals.aqueduct,
        level: resolveLevel(AQUEDUCT_LEVEL_THRESHOLDS, totalHistoricalLiters),
        dailyLiters: state.globals.aqueduct.dailyLiters + amount,
        totalHistoricalLiters,
      },
    },
  };
}

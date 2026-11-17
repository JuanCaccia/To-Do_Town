import { describe, expect, it } from 'vitest';
import type { GameState } from '../../types';
import { createDayZeroState } from '../../entities/dayZero';
import { calculateTick } from '../calculateTick';
import { REACTIVATION_PENALTY_MS } from '../reactivation';

const START = 1_700_000_000_000;
const ONE_HOUR = 3_600_000;

const TUTORIAL_NEIGHBORHOOD = 'tutorial-neighborhood-id';
const TUTORIAL_HABIT = 'tutorial-habit-id';

/** Día Cero con el barrio en Arranque de Motores hasta `penaltyUntil`. */
function penalizedState(penaltyUntil: number): GameState {
  const state = createDayZeroState(START);
  const neighborhood = state.neighborhoods[TUTORIAL_NEIGHBORHOOD]!;

  return {
    ...state,
    neighborhoods: {
      ...state.neighborhoods,
      [TUTORIAL_NEIGHBORHOOD]: { ...neighborhood, reactivationPenaltyUntil: penaltyUntil },
    },
  };
}

function treasuryAfter(state: GameState): number {
  return state.neighborhoods[TUTORIAL_NEIGHBORHOOD]?.treasuryCoins ?? 0;
}

describe('US-11 CA-03: Arranque de Motores al 50% durante la ventana', () => {
  it('reduce a la mitad la producción mientras la ventana sigue vigente', () => {
    // 10 h × 5 🪙/h × 0.5 = 25.
    const result = calculateTick(penalizedState(START + REACTIVATION_PENALTY_MS), START + 10 * ONE_HOUR);

    expect(treasuryAfter(result)).toBe(525);
  });

  it('cobra al 50% hasta el borde y al 100% después', () => {
    // 2 h × 5 × 0.5 = 5; 2 h × 5 = 10.
    const result = calculateTick(penalizedState(START + 2 * ONE_HOUR), START + 4 * ONE_HOUR);

    expect(treasuryAfter(result)).toBe(515);
  });

  it('limpia la penalización al alcanzar el instante exacto', () => {
    const until = START + 2 * ONE_HOUR;
    const result = calculateTick(penalizedState(until), until);

    // 2 h × 5 × 0.5 = 5.
    expect(treasuryAfter(result)).toBe(505);
    expect(result.neighborhoods[TUTORIAL_NEIGHBORHOOD]?.reactivationPenaltyUntil).toBeNull();
  });

  it('cobra mitad y luego completo y expira la ventana en el mismo tick', () => {
    // 24 h × 5 × 0.5 = 60; 4 h plenas antes del Apagón (T = 28 h) = 20.
    const result = calculateTick(
      penalizedState(START + REACTIVATION_PENALTY_MS),
      START + 30 * ONE_HOUR,
    );

    expect(treasuryAfter(result)).toBe(580);
    expect(result.neighborhoods[TUTORIAL_NEIGHBORHOOD]?.reactivationPenaltyUntil).toBeNull();
  });

  it('limpia una ventana vencida aunque no haya producción que liquidar', () => {
    const hibernated = {
      ...penalizedState(START + 40 * ONE_HOUR),
      lastTickAt: START + 41 * ONE_HOUR,
    };

    const result = calculateTick(hibernated, START + 42 * ONE_HOUR);

    expect(treasuryAfter(result)).toBe(500);
    expect(result.neighborhoods[TUTORIAL_NEIGHBORHOOD]?.reactivationPenaltyUntil).toBeNull();
    expect(result.habits[TUTORIAL_HABIT]?.status).toBe('ACTIVE');
  });
});

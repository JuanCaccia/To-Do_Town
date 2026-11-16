import { describe, expect, it } from 'vitest';
import type { CentralAqueduct, GameState } from '../../types';
import { createDayZeroState } from '../../entities/dayZero';
import { registerWaterIntake } from '../waterIntake';

const NOW = 1_700_000_000_000;

function stateWithAqueduct(overrides: Partial<CentralAqueduct> = {}): GameState {
  const base = createDayZeroState(NOW);

  return {
    ...base,
    globals: {
      ...base.globals,
      aqueduct: { ...base.globals.aqueduct, ...overrides },
    },
  };
}

describe('registerWaterIntake — US-08 CA-01: registro rápido de agua y evolución del Acueducto', () => {
  it('acredita 0.5 L en el día y en el histórico sin mover el nivel', () => {
    const state = stateWithAqueduct();

    const next = registerWaterIntake(state, 0.5);

    expect(next.globals.aqueduct.dailyLiters).toBe(0.5);
    expect(next.globals.aqueduct.totalHistoricalLiters).toBe(0.5);
    expect(next.globals.aqueduct.level).toBe(1);
  });

  it('acredita 1.0 L como un solo aporte sobre los acumulados existentes', () => {
    const state = stateWithAqueduct({ dailyLiters: 1.5, totalHistoricalLiters: 4 });

    const next = registerWaterIntake(state, 1);

    expect(next.globals.aqueduct.dailyLiters).toBe(2.5);
    expect(next.globals.aqueduct.totalHistoricalLiters).toBe(5);
    expect(next.globals.aqueduct.level).toBe(1);
  });

  it('no muta el estado de entrada', () => {
    const state = stateWithAqueduct();

    registerWaterIntake(state, 1);

    expect(state.globals.aqueduct.dailyLiters).toBe(0);
    expect(state.globals.aqueduct.totalHistoricalLiters).toBe(0);
  });

  it.each([
    [15, 2],
    [60, 3],
    [200, 4],
    [500, 5],
  ])('sube a Nivel %#: cruzando %i L históricos el Acueducto sube a Nivel %i', (threshold, level) => {
    const state = stateWithAqueduct({ totalHistoricalLiters: threshold - 1 });

    const next = registerWaterIntake(state, 1);

    expect(next.globals.aqueduct.level).toBe(level);
  });

  it('conserva el Nivel alcanzado aunque el acumulado diario vuelva a cero', () => {
    const state = stateWithAqueduct({ dailyLiters: 0, totalHistoricalLiters: 60 });

    const next = registerWaterIntake(state, 0.5);

    expect(next.globals.aqueduct.level).toBe(3);
    expect(next.globals.aqueduct.dailyLiters).toBe(0.5);
  });
});

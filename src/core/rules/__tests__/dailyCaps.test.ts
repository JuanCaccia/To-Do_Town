import { describe, expect, it } from 'vitest';
import { createDayZeroState } from '../../entities/dayZero';
import type { CentralLibrary, GameState, TimestampMs } from '../../types';
import { calculateTick } from '../calculateTick';
import { applyPageDailyCap, applyWaterDailyCap } from '../dailyCaps';

const NOW: TimestampMs = 1_700_000_000_000;
const MS_PER_HOUR = 3_600_000;

/**
 * `dailyPagesRead` todavía no está en el tipo: lo inyecta este helper para que
 * el RED falle por la regla ausente y no por la forma del estado.
 */
function withDailyConsumption(
  state: GameState,
  consumption: { liters?: number; pages?: number },
): GameState {
  return {
    ...state,
    globals: {
      ...state.globals,
      aqueduct: { ...state.globals.aqueduct, dailyLiters: consumption.liters ?? 0 },
      library: {
        ...state.globals.library,
        dailyPagesRead: consumption.pages ?? 0,
      } as CentralLibrary,
    },
  };
}

describe('applyWaterDailyCap — US-09 CA-01 / DEC-021: tope diario de 2.0 L', () => {
  it('acredita el aporte completo cuando hay cupo', () => {
    const state = withDailyConsumption(createDayZeroState(NOW), { liters: 0.5 });

    const result = applyWaterDailyCap(state, 1);

    expect(result.creditedLiters).toBe(1);
    expect(result.state.globals.aqueduct.dailyLiters).toBe(1.5);
    expect(result.state.globals.aqueduct.totalHistoricalLiters).toBe(1);
  });

  it('recorta el aporte al remanente del cupo', () => {
    const state = withDailyConsumption(createDayZeroState(NOW), { liters: 1.5 });

    const result = applyWaterDailyCap(state, 1);

    expect(result.creditedLiters).toBe(0.5);
    expect(result.state.globals.aqueduct.dailyLiters).toBe(2);
    expect(result.state.globals.aqueduct.totalHistoricalLiters).toBe(0.5);
  });

  it('no muta nada cuando el cupo ya está agotado', () => {
    const state = withDailyConsumption(createDayZeroState(NOW), { liters: 2 });

    const result = applyWaterDailyCap(state, 1);

    expect(result.creditedLiters).toBe(0);
    expect(result.state).toBe(state);
  });
});

describe('applyPageDailyCap — US-09 CA-01: tope diario de 150 páginas', () => {
  it('acredita el registro completo cuando hay cupo', () => {
    const state = withDailyConsumption(createDayZeroState(NOW), { pages: 100 });

    const result = applyPageDailyCap(state, 30);

    expect(result.status).toBe('READING_REGISTERED');

    if (result.status !== 'READING_REGISTERED') {
      return;
    }

    expect(result.creditedPages).toBe(30);
    expect(result.state.globals.library.totalPagesRead).toBe(30);
    expect(result.state.globals.library.dailyPagesRead).toBe(130);
  });

  it('recorta el registro al remanente del cupo', () => {
    const state = withDailyConsumption(createDayZeroState(NOW), { pages: 100 });

    const result = applyPageDailyCap(state, 100);

    expect(result.status).toBe('READING_REGISTERED');

    if (result.status !== 'READING_REGISTERED') {
      return;
    }

    expect(result.creditedPages).toBe(50);
    expect(result.state.globals.library.totalPagesRead).toBe(50);
    expect(result.state.globals.library.dailyPagesRead).toBe(150);
  });

  it('no muta nada cuando el cupo ya está agotado', () => {
    const state = withDailyConsumption(createDayZeroState(NOW), { pages: 150 });

    const result = applyPageDailyCap(state, 10);

    expect(result.status).toBe('READING_REGISTERED');

    if (result.status !== 'READING_REGISTERED') {
      return;
    }

    expect(result.creditedPages).toBe(0);
    expect(result.state).toBe(state);
  });

  it('sigue rechazando un conteo que no es un entero positivo', () => {
    const state = withDailyConsumption(createDayZeroState(NOW), {});

    expect(applyPageDailyCap(state, 0)).toEqual({
      status: 'REJECTED',
      reason: 'INVALID_PAGE_COUNT',
    });
  });
});

describe('calculateTick — US-09 CA-01: el cupo se reinicia en el corte de jornada', () => {
  it('devuelve a cero el consumo diario de agua y de páginas', () => {
    const state = withDailyConsumption(createDayZeroState(NOW), { liters: 2, pages: 150 });

    const next = calculateTick(state, NOW + 48 * MS_PER_HOUR);

    expect(next.globals.aqueduct.dailyLiters).toBe(0);
    expect(next.globals.library.dailyPagesRead).toBe(0);
  });
});

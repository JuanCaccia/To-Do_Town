import { describe, expect, it } from 'vitest';
import { createDayZeroState } from '../../entities/dayZero';
import type { GameState, TimestampMs } from '../../types';
import { calculateTick } from '../calculateTick';
import { liquidateFocus, getFocusTier } from '../focusLiquidation';

const NOW: TimestampMs = 1_700_000_000_000;
const MS_PER_HOUR = 3_600_000;
const TUTORIAL_ID = 'tutorial-neighborhood-id';

/**
 * `dailyFocusMinutes` es `F_día`: el acumulador de la ciudad que esta regla lee
 * y mueve.
 */
function withDailyFocus(state: GameState, minutes: number): GameState {
  return { ...state, dailyFocusMinutes: minutes };
}

function focusMinutesOf(state: GameState): number {
  return state.dailyFocusMinutes;
}

describe('liquidateFocus — US-09 CA-03: Foco Óptimo (minutos 1 al 100 del día)', () => {
  it('acredita 2 monedas y 1 XP cada 5 minutos al barrio y al Ayuntamiento', () => {
    const state = withDailyFocus(createDayZeroState(NOW), 0);

    const next = liquidateFocus(state, TUTORIAL_ID, 25);

    expect(next.neighborhoods[TUTORIAL_ID]!.treasuryCoins).toBe(550);
    expect(next.globals.townHall.qualityOfLifeXP).toBe(5);
    expect(focusMinutesOf(next)).toBe(25);
  });

  it('cuenta el XP sobre el acumulado del día, no sobre la sesión aislada', () => {
    const state = withDailyFocus(createDayZeroState(NOW), 3);

    const next = liquidateFocus(state, TUTORIAL_ID, 2);

    expect(next.neighborhoods[TUTORIAL_ID]!.treasuryCoins).toBe(504);
    expect(next.globals.townHall.qualityOfLifeXP).toBe(1);
    expect(focusMinutesOf(next)).toBe(5);
  });

  it('topea el tramo en 20 XP al llegar al minuto 100', () => {
    const state = withDailyFocus(createDayZeroState(NOW), 0);

    const next = liquidateFocus(state, TUTORIAL_ID, 100);

    expect(next.globals.townHall.qualityOfLifeXP).toBe(20);
    expect(next.neighborhoods[TUTORIAL_ID]!.treasuryCoins).toBe(700);
  });
});

describe('liquidateFocus — US-09 CA-03: tramos mixtos cuando la sesión cruza un umbral', () => {
  it('parte la sesión entre Foco Óptimo y Fatiga Mental al cruzar el minuto 100', () => {
    const state = withDailyFocus(createDayZeroState(NOW), 90);

    const next = liquidateFocus(state, TUTORIAL_ID, 20);

    // 10 min óptimos (20 🪙, +2 XP) + 10 min de fatiga (10 🪙, +1 XP)
    expect(next.neighborhoods[TUTORIAL_ID]!.treasuryCoins).toBe(530);
    expect(next.globals.townHall.qualityOfLifeXP).toBe(3);
    expect(focusMinutesOf(next)).toBe(110);
  });

  it('topea la Fatiga Mental en 10 XP al llegar al minuto 200', () => {
    const state = withDailyFocus(createDayZeroState(NOW), 100);

    const next = liquidateFocus(state, TUTORIAL_ID, 100);

    // 100 min de fatiga: 100 🪙 y 10 XP (el tope del tramo)
    expect(next.neighborhoods[TUTORIAL_ID]!.treasuryCoins).toBe(600);
    expect(next.globals.townHall.qualityOfLifeXP).toBe(10);
    expect(focusMinutesOf(next)).toBe(200);
  });
});

describe('liquidateFocus — US-09 CA-03: Agotamiento (minuto 201 en adelante)', () => {
  it('acredita 0.2 monedas por minuto y ningún XP', () => {
    const state = withDailyFocus(createDayZeroState(NOW), 200);

    const next = liquidateFocus(state, TUTORIAL_ID, 5);

    expect(next.neighborhoods[TUTORIAL_ID]!.treasuryCoins).toBe(501);
    expect(next.globals.townHall.qualityOfLifeXP).toBe(0);
    expect(focusMinutesOf(next)).toBe(205);
  });

  it('acumula las fracciones en el resto del barrio en vez de perderlas', () => {
    const state = withDailyFocus(createDayZeroState(NOW), 200);

    const partial = liquidateFocus(state, TUTORIAL_ID, 3);

    expect(partial.neighborhoods[TUTORIAL_ID]!.treasuryCoins).toBe(500);
    expect(partial.neighborhoods[TUTORIAL_ID]!.pendingCoinsRemainder).toBeCloseTo(0.6, 10);

    const completed = liquidateFocus(partial, TUTORIAL_ID, 2);

    expect(completed.neighborhoods[TUTORIAL_ID]!.treasuryCoins).toBe(501);
    expect(completed.neighborhoods[TUTORIAL_ID]!.pendingCoinsRemainder).toBeCloseTo(0, 10);
  });
});

describe('liquidateFocus — US-09 CA-03: sin mutación no hay evento', () => {
  it('devuelve la misma referencia cuando no hay minutos que liquidar', () => {
    const state = withDailyFocus(createDayZeroState(NOW), 10);

    expect(liquidateFocus(state, TUTORIAL_ID, 0)).toBe(state);
  });
});

describe('calculateTick — US-09 CA-03: F_día se reinicia en el corte de jornada', () => {
  it('devuelve a cero los minutos de foco del día', () => {
    const state = withDailyFocus(createDayZeroState(NOW), 150);

    const next = calculateTick(state, NOW + 48 * MS_PER_HOUR);

    expect(focusMinutesOf(next)).toBe(0);
  });
});

describe('getFocusTier — US-09 CA-03: tramo del siguiente minuto', () => {
  it('reporta el tramo del próximo minuto, no el del último cobrado', () => {
    expect(getFocusTier(0)).toBe('OPTIMAL');
    expect(getFocusTier(99)).toBe('OPTIMAL');
    expect(getFocusTier(100)).toBe('FATIGUE');
    expect(getFocusTier(199)).toBe('FATIGUE');
    expect(getFocusTier(200)).toBe('EXHAUSTION');
  });
});

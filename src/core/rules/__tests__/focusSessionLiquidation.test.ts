import { describe, expect, it } from 'vitest';
import { createDayZeroState } from '../../entities/dayZero';
import type { GameState, TimestampMs } from '../../types';
import { recordFocusSession } from '../focusSession';
import { liquidateFocusSession } from '../focusLiquidation';

const NOW: TimestampMs = 1_700_000_000_000;
const MS_PER_MINUTE = 60_000;
const TUTORIAL_ID = 'tutorial-neighborhood-id';
const PRESET_25 = 'pomodoro-25-5';
const SESSION_ID = 'focus-session-1';

/**
 * Registra la sesión con la regla de US-08 y la deja lista para liquidar: la
 * interrupción no puede inventarse desde el test porque el registro es el que
 * valida la duración y guarda `focusMinutes`.
 */
function withSession(
  state: GameState,
  session: { elapsedMinutes: number; outcome: 'COMPLETED' | 'INTERRUPTED' },
): GameState {
  const result = recordFocusSession(state, {
    id: SESSION_ID,
    neighborhoodId: TUTORIAL_ID,
    presetId: PRESET_25,
    startedAt: NOW,
    endedAt: NOW + session.elapsedMinutes * MS_PER_MINUTE,
    outcome: session.outcome,
  });

  if (result.status !== 'RECORDED') {
    throw new Error(`setup: la sesión no se registró (${result.reason})`);
  }

  return result.state;
}

describe('liquidateFocusSession — US-09 CA-04: regla del 80% al interrumpir', () => {
  it('liquida la duración completa cuando la sesión terminó', () => {
    const state = withSession(createDayZeroState(NOW), { elapsedMinutes: 25, outcome: 'COMPLETED' });

    const next = liquidateFocusSession(state, SESSION_ID);

    expect(next.neighborhoods[TUTORIAL_ID]!.treasuryCoins).toBe(550);
    expect(next.globals.townHall.qualityOfLifeXP).toBe(5);
    expect(next.dailyFocusMinutes).toBe(25);
  });

  it('liquida el 80% de los minutos transcurridos cuando la sesión se interrumpió', () => {
    const state = withSession(createDayZeroState(NOW), {
      elapsedMinutes: 20,
      outcome: 'INTERRUPTED',
    });

    const next = liquidateFocusSession(state, SESSION_ID);

    // 20 transcurridos → 16 efectivos: 32 🪙 y ⌊16 / 5⌋ = 3 XP
    expect(next.neighborhoods[TUTORIAL_ID]!.treasuryCoins).toBe(532);
    expect(next.globals.townHall.qualityOfLifeXP).toBe(3);
    expect(next.dailyFocusMinutes).toBe(16);
  });

  it('no liquida nada cuando el 80% no alcanza un minuto entero', () => {
    const state = withSession(createDayZeroState(NOW), {
      elapsedMinutes: 1,
      outcome: 'INTERRUPTED',
    });

    expect(liquidateFocusSession(state, SESSION_ID)).toBe(state);
  });

  it('la sesión registrada conserva los minutos crudos, no los efectivos', () => {
    const state = withSession(createDayZeroState(NOW), {
      elapsedMinutes: 20,
      outcome: 'INTERRUPTED',
    });

    const next = liquidateFocusSession(state, SESSION_ID);

    expect(next.focusSessions[SESSION_ID]!.focusMinutes).toBe(20);
    expect(next.dailyFocusMinutes).toBe(16);
  });

  it('cruza el umbral de fatiga con los minutos efectivos, no con los crudos', () => {
    const base = { ...createDayZeroState(NOW), dailyFocusMinutes: 95 };
    const state = withSession(base, { elapsedMinutes: 10, outcome: 'INTERRUPTED' });

    const next = liquidateFocusSession(state, SESSION_ID);

    // 10 transcurridos → 8 efectivos: 5 óptimos (10 🪙, +1 XP) y 3 de fatiga (3 🪙)
    expect(next.neighborhoods[TUTORIAL_ID]!.treasuryCoins).toBe(513);
    expect(next.globals.townHall.qualityOfLifeXP).toBe(1);
    expect(next.dailyFocusMinutes).toBe(103);
  });

  it('no muta nada cuando la sesión no existe', () => {
    const state = createDayZeroState(NOW);

    expect(liquidateFocusSession(state, 'missing-session')).toBe(state);
  });
});

import { describe, expect, it } from 'vitest';
import type { GameState } from '../../types';
import { createDayZeroState } from '../../entities/dayZero';
import { recordFocusSession } from '../focusSession';

const STARTED_AT = 1_700_000_000_000;
const ONE_MINUTE = 60_000;

const TUTORIAL_NEIGHBORHOOD = 'tutorial-neighborhood-id';
const CLASSIC_PRESET = 'pomodoro-25-5';

function dayZeroState(): GameState {
  return createDayZeroState(STARTED_AT);
}

function input(overrides: Partial<Parameters<typeof recordFocusSession>[1]> = {}) {
  return {
    id: 'focus-session-id',
    neighborhoodId: TUTORIAL_NEIGHBORHOOD,
    presetId: CLASSIC_PRESET,
    startedAt: STARTED_AT,
    endedAt: STARTED_AT + 25 * ONE_MINUTE,
    outcome: 'COMPLETED' as const,
    ...overrides,
  };
}

describe('recordFocusSession — US-08 CA-04: sesión de foco asignada a un barrio', () => {
  it('registra la sesión completada a W minutos, vinculada a su barrio', () => {
    const result = recordFocusSession(dayZeroState(), input());

    if (result.status !== 'RECORDED') throw new Error('esperaba registro');

    expect(result.state.focusSessions['focus-session-id']).toEqual({
      neighborhoodId: TUTORIAL_NEIGHBORHOOD,
      presetId: CLASSIC_PRESET,
      startedAt: STARTED_AT,
      endedAt: STARTED_AT + 25 * ONE_MINUTE,
      focusMinutes: 25,
      outcome: 'COMPLETED',
    });
  });

  it('una sesión completada acredita W aunque el reloj haya corrido de más', () => {
    const result = recordFocusSession(
      dayZeroState(),
      input({ endedAt: STARTED_AT + 40 * ONE_MINUTE }),
    );

    if (result.status !== 'RECORDED') throw new Error('esperaba registro');

    expect(result.state.focusSessions['focus-session-id']?.focusMinutes).toBe(25);
  });

  it('una interrupción acredita los minutos transcurridos', () => {
    const result = recordFocusSession(
      dayZeroState(),
      input({ endedAt: STARTED_AT + 12 * ONE_MINUTE, outcome: 'INTERRUPTED' }),
    );

    if (result.status !== 'RECORDED') throw new Error('esperaba registro');

    expect(result.state.focusSessions['focus-session-id']).toMatchObject({
      focusMinutes: 12,
      outcome: 'INTERRUPTED',
    });
  });

  it('acepta una interrupción de exactamente 1 minuto', () => {
    const result = recordFocusSession(
      dayZeroState(),
      input({ endedAt: STARTED_AT + ONE_MINUTE, outcome: 'INTERRUPTED' }),
    );

    if (result.status !== 'RECORDED') throw new Error('esperaba registro');

    expect(result.state.focusSessions['focus-session-id']?.focusMinutes).toBe(1);
  });

  it('rechaza una interrupción de menos de 1 minuto', () => {
    const result = recordFocusSession(
      dayZeroState(),
      input({ endedAt: STARTED_AT + ONE_MINUTE - 1, outcome: 'INTERRUPTED' }),
    );

    expect(result).toEqual({ status: 'REJECTED', reason: 'SESSION_TOO_SHORT' });
  });

  it('rechaza un barrio inexistente', () => {
    const result = recordFocusSession(
      dayZeroState(),
      input({ neighborhoodId: 'missing-neighborhood-id' }),
    );

    expect(result).toEqual({ status: 'REJECTED', reason: 'NEIGHBORHOOD_NOT_FOUND' });
  });

  it('rechaza un preset inexistente', () => {
    const result = recordFocusSession(dayZeroState(), input({ presetId: 'missing-preset-id' }));

    expect(result).toEqual({ status: 'REJECTED', reason: 'PRESET_NOT_FOUND' });
  });

  it('no muta el estado de entrada', () => {
    const state = dayZeroState();

    recordFocusSession(state, input());

    expect(state.focusSessions).toEqual({});
  });
});

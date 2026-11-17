import { describe, expect, it } from 'vitest';
import type { PomodoroPreset } from '../../types';
import { getBreakAfterWork, isPomodoroSetComplete } from '../pomodoroCycle';

function createPreset(overrides: Partial<PomodoroPreset> = {}): PomodoroPreset {
  return {
    id: 'pomodoro-25-5',
    name: '25/5',
    workMinutes: 25,
    shortBreakMinutes: 5,
    cyclesBeforeLongBreak: 4,
    longBreakMinutes: null,
    ...overrides,
  };
}

describe('getBreakAfterWork — US-08 CA-04: ciclo trabajo/descanso', () => {
  it('ofrece descanso corto tras el primer bloque de trabajo', () => {
    expect(getBreakAfterWork(createPreset(), 1)).toEqual({
      kind: 'SHORT_BREAK',
      minutes: 5,
    });
  });

  it('sigue ofreciendo descanso corto antes de completar el ciclo', () => {
    expect(getBreakAfterWork(createPreset(), 3)).toEqual({
      kind: 'SHORT_BREAK',
      minutes: 5,
    });
  });

  it('repite el descanso corto al cerrar el ciclo si el preset no define descanso largo', () => {
    expect(getBreakAfterWork(createPreset(), 4)).toEqual({
      kind: 'SHORT_BREAK',
      minutes: 5,
    });
  });

  it('ofrece descanso largo al completar cyclesBeforeLongBreak bloques', () => {
    expect(getBreakAfterWork(createPreset({ longBreakMinutes: 20 }), 4)).toEqual({
      kind: 'LONG_BREAK',
      minutes: 20,
    });
  });

  it('vuelve a ofrecer descanso largo en cada ciclo siguiente', () => {
    const preset = createPreset({ longBreakMinutes: 20 });

    expect(getBreakAfterWork(preset, 8)).toEqual({ kind: 'LONG_BREAK', minutes: 20 });
  });
});

describe('isPomodoroSetComplete — US-08 CA-04: el set son 4 bloques, no infinitos', () => {
  it('el set sigue abierto mientras falten bloques de trabajo', () => {
    expect(isPomodoroSetComplete(createPreset(), 3)).toBe(false);
  });

  it('el set termina al completar cyclesBeforeLongBreak bloques', () => {
    expect(isPomodoroSetComplete(createPreset(), 4)).toBe(true);
  });

  it('un contador que ya pasó el cierre sigue cerrado', () => {
    expect(isPomodoroSetComplete(createPreset(), 5)).toBe(true);
  });
});

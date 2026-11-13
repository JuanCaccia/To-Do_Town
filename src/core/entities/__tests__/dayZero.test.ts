import { describe, expect, it } from 'vitest';
import { createDayZeroState } from '../dayZero';

const NOW = 1_700_000_000_000;

describe('createDayZeroState — US-00 CA-01: inicialización de cuenta, reloj y configuración', () => {
  it('nace con la ciudad activa y el reloj anclado a now', () => {
    const state = createDayZeroState(NOW);

    expect(state.cityStatus).toBe('ACTIVE');
    expect(state.lastTickAt).toBe(NOW);
    expect(state.lastUserInteractionAt).toBe(NOW);
  });

  it('configura la cuenta local por defecto', () => {
    const state = createDayZeroState(NOW);

    expect(state.account).toEqual({
      userId: 'local-owner',
      planTier: 'PERSONAL_DEV',
      cloudSyncEnabled: false,
      unlockedThemes: ['CLASSIC_DIORAMA'],
    });
  });

  it('configura el ciclo de día con corte a las 00:00 y 4 horas de gracia', () => {
    const state = createDayZeroState(NOW);

    expect(state.config.dayCycle.dayCutoffHour).toBe(0);
    expect(state.config.dayCycle.gracePeriodHours).toBe(4);
  });

  it('siembra los dos presets Pomodoro por defecto con 4 ciclos', () => {
    const state = createDayZeroState(NOW);

    const presets = state.config.pomodoroPresets.map((preset) => ({
      workMinutes: preset.workMinutes,
      shortBreakMinutes: preset.shortBreakMinutes,
      cyclesBeforeLongBreak: preset.cyclesBeforeLongBreak,
    }));

    expect(presets).toEqual([
      { workMinutes: 25, shortBreakMinutes: 5, cyclesBeforeLongBreak: 4 },
      { workMinutes: 50, shortBreakMinutes: 15, cyclesBeforeLongBreak: 4 },
    ]);
  });
});

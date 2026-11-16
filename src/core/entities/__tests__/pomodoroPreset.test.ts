import { describe, expect, it } from 'vitest';
import type { GameState } from '../../types';
import { createDayZeroState } from '../dayZero';
import { createPomodoroPreset } from '../pomodoroPreset';

const NOW = 1_700_000_000_000;

function dayZeroState(): GameState {
  return createDayZeroState(NOW);
}

describe('createPomodoroPreset — US-08 CA-03: presets personalizados', () => {
  it('sugiere el descanso corto como W/5 truncado', () => {
    const result = createPomodoroPreset(dayZeroState(), {
      id: 'deep-work-preset',
      name: 'Trabajo profundo',
      workMinutes: 27,
    });

    if (result.status !== 'CREATED') throw new Error('esperaba creación');

    const preset = result.state.config.pomodoroPresets.at(-1);

    expect(preset).toMatchObject({ workMinutes: 27, shortBreakMinutes: 5 });
  });

  it('completa los valores por defecto: 4 bloques y sin descanso largo', () => {
    const result = createPomodoroPreset(dayZeroState(), {
      id: 'study-preset',
      name: 'Estudio',
      workMinutes: 25,
    });

    if (result.status !== 'CREATED') throw new Error('esperaba creación');

    expect(result.state.config.pomodoroPresets.at(-1)).toEqual({
      id: 'study-preset',
      name: 'Estudio',
      workMinutes: 25,
      shortBreakMinutes: 5,
      cyclesBeforeLongBreak: 4,
      longBreakMinutes: null,
    });
  });

  it('respeta los valores editables que el usuario define', () => {
    const result = createPomodoroPreset(dayZeroState(), {
      id: 'custom-preset',
      name: 'A medida',
      workMinutes: 40,
      shortBreakMinutes: 12,
      cyclesBeforeLongBreak: 3,
      longBreakMinutes: 30,
    });

    if (result.status !== 'CREATED') throw new Error('esperaba creación');

    const preset = result.state.config.pomodoroPresets.at(-1);

    expect(preset).toMatchObject({ shortBreakMinutes: 12, cyclesBeforeLongBreak: 3, longBreakMinutes: 30 });
  });

  it('agrega el preset sin tocar los semilla 25/5 y 50/15', () => {
    const state = dayZeroState();

    const result = createPomodoroPreset(state, {
      id: 'extra-preset',
      name: 'Extra',
      workMinutes: 15,
    });

    if (result.status !== 'CREATED') throw new Error('esperaba creación');

    const presets = result.state.config.pomodoroPresets;

    expect(presets).toHaveLength(3);
    expect(presets.slice(0, 2)).toEqual(state.config.pomodoroPresets);
  });

  it('no muta el estado de entrada', () => {
    const state = dayZeroState();

    createPomodoroPreset(state, { id: 'noop-preset', name: 'Noop', workMinutes: 20 });

    expect(state.config.pomodoroPresets).toHaveLength(2);
  });

  it.each([0, -10, 2.5])('rechaza workMinutes inválido (%s) sin agregar el preset', (workMinutes) => {
    const result = createPomodoroPreset(dayZeroState(), {
      id: 'invalid-preset',
      name: 'Inválido',
      workMinutes,
    });

    expect(result).toEqual({ status: 'REJECTED', reason: 'INVALID_WORK_MINUTES' });
  });
});

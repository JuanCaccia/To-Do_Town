import {
  POMODORO_DEFAULT_CYCLES_BEFORE_LONG_BREAK,
  POMODORO_SHORT_BREAK_DIVISOR,
} from '../constants/economyConstants';
import type { GameState, PomodoroPreset } from '../types';

export interface NewPomodoroPresetInput {
  id: string;
  name: string;
  workMinutes: number;
  shortBreakMinutes?: number;
  cyclesBeforeLongBreak?: number;
  longBreakMinutes?: number | null;
}

export type PomodoroPresetCreationRejection = 'INVALID_WORK_MINUTES';

export type PomodoroPresetCreationResult =
  | { status: 'CREATED'; state: GameState }
  | { status: 'REJECTED'; reason: PomodoroPresetCreationRejection };

/**
 * Crea un preset Pomodoro personalizado (US-08 CA-03).
 *
 * El nombre no se valida acá: es texto de formulario y su normalización es del
 * borde (GOVERNANCE DEC-017). `workMinutes` sí, porque define la duración de la
 * sesión que después liquida US-09. `shortBreakMinutes` es una **sugerencia**
 * editable: si el usuario la omite se calcula `W/5`, si la manda se respeta.
 */
export function createPomodoroPreset(
  state: GameState,
  input: NewPomodoroPresetInput,
): PomodoroPresetCreationResult {
  if (!Number.isInteger(input.workMinutes) || input.workMinutes <= 0) {
    return { status: 'REJECTED', reason: 'INVALID_WORK_MINUTES' };
  }

  const preset: PomodoroPreset = {
    id: input.id,
    name: input.name,
    workMinutes: input.workMinutes,
    shortBreakMinutes:
      input.shortBreakMinutes ??
      Math.floor(input.workMinutes / POMODORO_SHORT_BREAK_DIVISOR),
    cyclesBeforeLongBreak:
      input.cyclesBeforeLongBreak ?? POMODORO_DEFAULT_CYCLES_BEFORE_LONG_BREAK,
    longBreakMinutes: input.longBreakMinutes ?? null,
  };

  return {
    status: 'CREATED',
    state: {
      ...state,
      config: {
        ...state.config,
        pomodoroPresets: [...state.config.pomodoroPresets, preset],
      },
    },
  };
}

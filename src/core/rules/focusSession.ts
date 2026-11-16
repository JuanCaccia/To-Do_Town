import type { EntityId, FocusSession, GameState, TimestampMs } from '../types';

const MILLISECONDS_PER_MINUTE = 60_000;

/** US-08 CA-04: una interrupción deja de contar por debajo de este umbral. */
const MINIMUM_INTERRUPTED_MINUTES = 1;

export interface NewFocusSessionInput {
  id: EntityId;
  neighborhoodId: EntityId;
  presetId: string;
  startedAt: TimestampMs;
  endedAt: TimestampMs;
  outcome: 'COMPLETED' | 'INTERRUPTED';
}

export type FocusSessionRejection =
  | 'NEIGHBORHOOD_NOT_FOUND'
  | 'PRESET_NOT_FOUND'
  | 'SESSION_TOO_SHORT';

export type FocusSessionResult =
  | { status: 'RECORDED'; state: GameState }
  | { status: 'REJECTED'; reason: FocusSessionRejection };

/**
 * Registra una sesión de foco terminada (US-08 CA-04).
 *
 * No acredita monedas ni XP: la curva de fatiga diaria `F_día` y la regla del 80%
 * son US-09 CA-03/CA-04 y consumen `focusMinutes` desde afuera (DEC-020).
 *
 * Una sesión completada aporta los minutos del preset, no el reloj: se completa
 * *al llegar* a `workMinutes` y el excedente no es foco.
 */
export function recordFocusSession(
  state: GameState,
  input: NewFocusSessionInput,
): FocusSessionResult {
  if (state.neighborhoods[input.neighborhoodId] === undefined) {
    return { status: 'REJECTED', reason: 'NEIGHBORHOOD_NOT_FOUND' };
  }

  const preset = state.config.pomodoroPresets.find((candidate) => candidate.id === input.presetId);

  if (preset === undefined) {
    return { status: 'REJECTED', reason: 'PRESET_NOT_FOUND' };
  }

  const elapsedMinutes = Math.floor((input.endedAt - input.startedAt) / MILLISECONDS_PER_MINUTE);

  if (input.outcome === 'INTERRUPTED' && elapsedMinutes < MINIMUM_INTERRUPTED_MINUTES) {
    return { status: 'REJECTED', reason: 'SESSION_TOO_SHORT' };
  }

  const session: FocusSession = {
    neighborhoodId: input.neighborhoodId,
    presetId: input.presetId,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    focusMinutes: input.outcome === 'COMPLETED' ? preset.workMinutes : elapsedMinutes,
    outcome: input.outcome,
  };

  return {
    status: 'RECORDED',
    state: {
      ...state,
      focusSessions: { ...state.focusSessions, [input.id]: session },
    },
  };
}

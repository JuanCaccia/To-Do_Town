import type { GameState, HabitBuilding, Neighborhood, TimestampMs } from '../types';
import { calculateTick } from './calculateTick';

export type ManualPauseRejection = 'EMPTY_REASON';

export type ManualPauseResult =
  | { status: 'PAUSED'; state: GameState }
  | { status: 'REJECTED'; reason: ManualPauseRejection };

/**
 * US-10 CA-01: activa la pausa manual sobre una ciudad activa.
 *
 * Liquida primero (`calculateTick`) para no perder la producción devengada
 * hasta el segundo exacto de la pausa; recién después congela el estado y
 * adelanta los relojes. Un motivo vacío o de solo espacios rechaza sin mutar.
 */
export function activateManualPause(
  state: GameState,
  reason: string,
  now: TimestampMs,
): ManualPauseResult {
  if (reason.trim().length === 0) {
    return { status: 'REJECTED', reason: 'EMPTY_REASON' };
  }

  const settled = calculateTick(state, now);

  return {
    status: 'PAUSED',
    state: {
      ...settled,
      cityStatus: 'MANUAL_PAUSE',
      manualPauseReason: reason,
      lastTickAt: now,
      lastUserInteractionAt: now,
    },
  };
}

/**
 * US-10 CA-03: reanuda la ciudad sin penalización de retorno.
 *
 * La duración de la pausa es `now − lastTickAt`: CA-01 fijó `lastTickAt` al
 * instante de pausa y `getCityNow` lo mantuvo congelado. Se desplaza hacia
 * adelante el `lastCompletedAt` de los hábitos **activos** para que su curva de
 * enfriamiento retome el mismo punto donde quedó, y se limpia cualquier
 * `reactivationPenaltyUntil` (sin Arranque de Motores al volver).
 */
export function resumeManualPause(state: GameState, now: TimestampMs): GameState {
  const pausedForMs = now - state.lastTickAt;

  const habits = Object.fromEntries(
    Object.entries(state.habits).map(([id, habit]): [string, HabitBuilding] => [
      id,
      habit.status === 'ACTIVE' && habit.lastCompletedAt !== null
        ? { ...habit, lastCompletedAt: habit.lastCompletedAt + pausedForMs }
        : habit,
    ]),
  );

  const neighborhoods = Object.fromEntries(
    Object.entries(state.neighborhoods).map(([id, neighborhood]): [string, Neighborhood] => [
      id,
      { ...neighborhood, reactivationPenaltyUntil: null },
    ]),
  );

  return {
    ...state,
    cityStatus: 'ACTIVE',
    manualPauseReason: undefined,
    lastTickAt: now,
    lastUserInteractionAt: now,
    habits,
    neighborhoods,
  };
}

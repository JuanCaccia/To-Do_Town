import type { GameState, TimestampMs, UndoSnapshot } from '../types';

export type UndoRejectionReason = 'UNDO_WINDOW_EXPIRED';

/**
 * US-13 CA-02: el rechazo no lleva `state`. Esa ausencia es lo que vuelve
 * imposible que el store emita `ACTION_UNDONE` con una reversión vencida: sin
 * estado en el resultado no hay nada que commitear.
 */
export type UndoResult =
  | { status: 'UNDONE'; state: GameState }
  | { status: 'REJECTED'; reason: UndoRejectionReason };

/**
 * Revierte el estado al previo de una instantánea, si sigue vigente.
 *
 * La ventana es inclusiva en el borde: el CA rechaza cuando `now` **supera**
 * `expiresAt`, así que `now === expiresAt` todavía revierte (US-13 CA-02).
 *
 * Devuelve `previousState` tal cual: la instantánea ya es una copia aislada
 * (`createUndoSnapshot`) y el motor no muta en el lugar. Tampoco emite el evento
 * `ACTION_UNDONE`: las reglas devuelven estado y el store construye el evento al
 * hacer `commit`.
 */
export function undoAction(snapshot: UndoSnapshot, now: TimestampMs): UndoResult {
  if (now > snapshot.expiresAt) {
    return { status: 'REJECTED', reason: 'UNDO_WINDOW_EXPIRED' };
  }

  return { status: 'UNDONE', state: snapshot.previousState };
}

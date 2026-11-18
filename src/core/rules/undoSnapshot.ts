import type { EntityId, GameState, TimestampMs, UndoSnapshot } from '../types';

/** US-13 CA-01: ventana de reversibilidad de 5 minutos. */
export const UNDO_WINDOW_MS = 300_000;

/**
 * Registra la instantánea de reversibilidad de una acción que mutó el estado
 * (US-13 CA-01).
 *
 * `actionId` entra por parámetro y no se genera acá: la unicidad es del
 * `IdPort`, y una regla que llame a `crypto` deja de ser determinista y deja de
 * poder testearse sin mockear el generador. Mismo criterio que `now`.
 *
 * `previousState` se clona con `structuredClone` en vez de guardar la
 * referencia: el motor es inmutable hoy por disciplina, no por construcción, y
 * una instantánea que comparte nodos devolvería un estado ya contaminado el día
 * que alguien mute en el lugar.
 */
export function createUndoSnapshot(
  state: GameState,
  actionId: EntityId,
  description: string,
  now: TimestampMs,
): UndoSnapshot {
  return {
    actionId,
    description,
    createdAt: now,
    expiresAt: now + UNDO_WINDOW_MS,
    previousState: structuredClone(state),
  };
}

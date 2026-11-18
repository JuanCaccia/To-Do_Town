import type { TimestampMs, UndoSnapshot } from '../types';

/**
 * Descarta las instantáneas vencidas de la cola de reversibilidad (US-13 CA-03).
 *
 * Devuelve una cola nueva en vez de mutar la recibida: el motor no muta en el
 * lugar, y el store reemplaza la referencia entera en cada tick.
 *
 * El borde es consistente con `undoAction` (US-13 CA-02): una instantánea que
 * expira exactamente en `now` todavía se puede deshacer, así que sólo se
 * descarta cuando `expiresAt < now`. Si cambia uno de los dos bordes, el otro
 * tiene que cambiar con él.
 *
 * Al sacar la entrada del arreglo se sueltan las referencias a `previousState`;
 * el ocultamiento sincronizado del UndoToast es de la capa de UI.
 */
export function pruneExpiredSnapshots(
  snapshots: UndoSnapshot[],
  now: TimestampMs,
): UndoSnapshot[] {
  return snapshots.filter((snapshot) => snapshot.expiresAt >= now);
}

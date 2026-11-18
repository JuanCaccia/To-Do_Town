import type { DomainEventRecord, GameState } from '../types';

/**
 * US-12 CA-04: transferencia completa de la ciudad hacia/desde un archivo.
 *
 * Es un puerto aparte y no una extensión de `StoragePort` porque el respaldo
 * reemplaza **los dos** almacenes a la vez: importar sólo el snapshot dejaría
 * el Outbox del estado anterior mezclado con el nuevo.
 */
export interface BackupPort {
  /** Historial completo, no sólo lo pendiente de sincronizar (CloudSync). */
  listEvents(): Promise<DomainEventRecord[]>;
  /** Reemplazo atómico de `game_state` y `domain_events`. */
  replaceAll(backup: { gameState: GameState; domainEvents: DomainEventRecord[] }): Promise<void>;
}

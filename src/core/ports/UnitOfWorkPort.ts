import type { DomainEventRecord, GameState } from '../types';

export type PendingDomainEvent = Pick<DomainEventRecord, 'eventId' | 'timestamp' | 'type' | 'payload'>;

export interface UnitOfWorkPort {
  commit(state: GameState, event: PendingDomainEvent): Promise<DomainEventRecord>;
}

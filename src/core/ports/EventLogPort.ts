import type { DomainEventRecord } from '../types';

export type DomainEventInput = Omit<DomainEventRecord, 'syncedAt'>;

export interface EventLogPort {
  appendEvent(event: DomainEventRecord): Promise<void>;
  listPendingEvents(): Promise<DomainEventRecord[]>;
}

export function createDomainEvent(input: DomainEventInput): DomainEventRecord {
  return { ...input, syncedAt: null };
}

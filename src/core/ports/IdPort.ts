import type { EntityId } from '../types';

export interface IdPort {
  generateId(): EntityId;
}

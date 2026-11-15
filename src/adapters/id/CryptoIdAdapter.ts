import type { IdPort } from '../../core/ports/IdPort';
import type { EntityId } from '../../core/types';

export class CryptoIdAdapter implements IdPort {
  generateId(): EntityId {
    return crypto.randomUUID();
  }
}

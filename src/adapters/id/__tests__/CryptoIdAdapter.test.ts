import { describe, expect, it } from 'vitest';
import type { IdPort } from '../../../core/ports/IdPort';
import { CryptoIdAdapter } from '../CryptoIdAdapter';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SAMPLE_SIZE = 100;

describe('CryptoIdAdapter — borde: puerto de identidad (GOVERNANCE §2.6)', () => {
  it('cumple el contrato IdPort devolviendo un identificador no vacío', () => {
    const idGenerator: IdPort = new CryptoIdAdapter();

    const id = idGenerator.generateId();

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('emite UUID v4, el formato sellado para la identidad de entidades y eventos', () => {
    const idGenerator = new CryptoIdAdapter();

    expect(idGenerator.generateId()).toMatch(UUID_V4);
  });

  it('no repite identificadores entre llamadas consecutivas', () => {
    const idGenerator = new CryptoIdAdapter();

    const ids = Array.from({ length: SAMPLE_SIZE }, () => idGenerator.generateId());

    expect(new Set(ids).size).toBe(SAMPLE_SIZE);
  });
});

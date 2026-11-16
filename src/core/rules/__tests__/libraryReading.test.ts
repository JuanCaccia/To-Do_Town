import { describe, expect, it } from 'vitest';
import type { CentralLibrary, GameState } from '../../types';
import { createDayZeroState } from '../../entities/dayZero';
import { registerPageReading } from '../libraryReading';

const NOW = 1_700_000_000_000;

function stateWithLibrary(overrides: Partial<CentralLibrary> = {}): GameState {
  const base = createDayZeroState(NOW);

  return {
    ...base,
    globals: {
      ...base.globals,
      library: { ...base.globals.library, ...overrides },
    },
  };
}

describe('registerPageReading — US-08 CA-02: páginas leídas y evolución de la Gran Biblioteca', () => {
  it('acredita las páginas del día y sube a Nivel 2 al cruzar 100', () => {
    const result = registerPageReading(stateWithLibrary(), 120);

    if (result.status !== 'READING_REGISTERED') throw new Error('esperaba acreditación');

    expect(result.state.globals.library.totalPagesRead).toBe(120);
    expect(result.state.globals.library.level).toBe(2);
  });

  it('acumula sobre el histórico existente sin reemplazarlo', () => {
    const result = registerPageReading(stateWithLibrary({ totalPagesRead: 90 }), 20);

    if (result.status !== 'READING_REGISTERED') throw new Error('esperaba acreditación');

    expect(result.state.globals.library.totalPagesRead).toBe(110);
    expect(result.state.globals.library.level).toBe(2);
  });

  it('no muta el estado de entrada', () => {
    const state = stateWithLibrary();

    registerPageReading(state, 40);

    expect(state.globals.library.totalPagesRead).toBe(0);
    expect(state.globals.library.level).toBe(1);
  });

  it.each([
    [100, 2],
    [500, 3],
    [1_500, 4],
    [5_000, 5],
  ])('cruzando %i páginas históricas la Biblioteca alcanza el Nivel %i', (threshold, level) => {
    const result = registerPageReading(stateWithLibrary({ totalPagesRead: threshold - 1 }), 1);

    if (result.status !== 'READING_REGISTERED') throw new Error('esperaba acreditación');

    expect(result.state.globals.library.level).toBe(level);
  });

  it.each([0, -5, 2.5])('rechaza %s páginas sin tocar el histórico', (pages) => {
    const result = registerPageReading(stateWithLibrary({ totalPagesRead: 40 }), pages);

    expect(result).toEqual({ status: 'REJECTED', reason: 'INVALID_PAGE_COUNT' });
  });
});

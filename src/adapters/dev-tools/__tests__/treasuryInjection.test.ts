import { describe, expect, it } from 'vitest';
import { createDayZeroState } from '../../../core/entities/dayZero';
import { injectTreasury } from '../treasuryInjection';

const NOW = 1_700_000_000_000;
const TUTORIAL_ID = 'tutorial-neighborhood-id';

describe('DEV-01: inyección de tesorería para pruebas manuales', () => {
  it('reemplaza el saldo del barrio indicado sin tocar el resto del estado', () => {
    const state = createDayZeroState(NOW);

    const next = injectTreasury(state, TUTORIAL_ID, 1000);

    expect(next.neighborhoods[TUTORIAL_ID]?.treasuryCoins).toBe(1000);
    expect(next.globals).toEqual(state.globals);
    expect(next.tasks).toEqual(state.tasks);
    expect(next.lastTickAt).toBe(state.lastTickAt);
  });

  it('no muta el estado recibido', () => {
    const state = createDayZeroState(NOW);

    injectTreasury(state, TUTORIAL_ID, 1000);

    expect(state.neighborhoods[TUTORIAL_ID]?.treasuryCoins).toBe(500);
  });

  it('devuelve el mismo estado si el barrio no existe o el saldo no es finito', () => {
    const state = createDayZeroState(NOW);

    expect(injectTreasury(state, 'barrio-inexistente', 1000)).toBe(state);
    expect(injectTreasury(state, TUTORIAL_ID, Number.NaN)).toBe(state);
    expect(injectTreasury(state, TUTORIAL_ID, -1)).toBe(state);
  });
});

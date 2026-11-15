import { describe, expect, it } from 'vitest';
import { createDayZeroState } from '../../entities/dayZero';
import { createNeighborhood } from '../../entities/neighborhood';
import type { GameState } from '../../types';
import { purchaseNeighborhoodDecoration } from '../decorationPurchase';

const NOW = 1_700_000_000_000;
const GYM_ID = 'gym-neighborhood-id';
const STUDIO_ID = 'studio-neighborhood-id';

function createCity(options: { gymCoins?: number; studioCoins?: number; xp?: number } = {}): GameState {
  const { gymCoins = 0, studioCoins = 0, xp = 0 } = options;

  const withGym = createNeighborhood(createDayZeroState(NOW), {
    id: GYM_ID,
    name: 'GYM',
    paletteId: 'MINT_MORNING',
  });
  const state = createNeighborhood(withGym, {
    id: STUDIO_ID,
    name: 'Estudio',
    paletteId: 'OCEAN_BLUE',
  });

  const gym = state.neighborhoods[GYM_ID];
  const studio = state.neighborhoods[STUDIO_ID];

  if (gym === undefined || studio === undefined) {
    throw new Error('setup: no se crearon los barrios');
  }

  gym.treasuryCoins = gymCoins;
  studio.treasuryCoins = studioCoins;
  state.globals.townHall.qualityOfLifeXP = xp;

  return state;
}

describe('purchaseNeighborhoodDecoration — US-02 CA-04: decoraciones puntuales', () => {
  it('cobra la Plaza Pequeña, la agrega al barrio y acredita 25 XP', () => {
    const state = createCity({ gymCoins: 500 });

    const result = purchaseNeighborhoodDecoration(state, {
      neighborhoodId: GYM_ID,
      decorationId: 'decoration-1',
      kind: 'SMALL_PLAZA',
    });

    expect(result).toMatchObject({ status: 'PURCHASED', cost: 500 });
    if (result.status !== 'PURCHASED') return;

    const gym = result.state.neighborhoods[GYM_ID];
    expect(gym?.treasuryCoins).toBe(0);
    expect(gym?.decorations).toEqual([{ id: 'decoration-1', kind: 'SMALL_PLAZA' }]);
    expect(result.state.globals.townHall.qualityOfLifeXP).toBe(25);
  });

  it('respeta el catálogo completo: 1200 monedas / 60 XP y 2500 monedas / 125 XP', () => {
    const fountain = purchaseNeighborhoodDecoration(createCity({ gymCoins: 1_200 }), {
      neighborhoodId: GYM_ID,
      decorationId: 'decoration-2',
      kind: 'FOUNTAIN_PARK',
    });
    const monument = purchaseNeighborhoodDecoration(createCity({ gymCoins: 2_500 }), {
      neighborhoodId: GYM_ID,
      decorationId: 'decoration-3',
      kind: 'CIVIC_MONUMENT',
    });

    expect(fountain).toMatchObject({ status: 'PURCHASED', cost: 1_200 });
    expect(monument).toMatchObject({ status: 'PURCHASED', cost: 2_500 });

    if (fountain.status !== 'PURCHASED' || monument.status !== 'PURCHASED') return;

    expect(fountain.state.globals.townHall.qualityOfLifeXP).toBe(60);
    expect(monument.state.globals.townHall.qualityOfLifeXP).toBe(125);
  });

  it('recalcula el nivel del Ayuntamiento al cruzar un umbral', () => {
    const state = createCity({ gymCoins: 500, xp: 80 });

    const result = purchaseNeighborhoodDecoration(state, {
      neighborhoodId: GYM_ID,
      decorationId: 'decoration-1',
      kind: 'SMALL_PLAZA',
    });

    if (result.status !== 'PURCHASED') throw new Error('esperaba compra');

    expect(result.state.globals.townHall.qualityOfLifeXP).toBe(105);
    expect(result.state.globals.townHall.level).toBe(2);
  });

  it('no puede gastar las monedas de otro barrio (economía estanca)', () => {
    const state = createCity({ gymCoins: 10_000, studioCoins: 0 });
    const before = structuredClone(state);

    const result = purchaseNeighborhoodDecoration(state, {
      neighborhoodId: STUDIO_ID,
      decorationId: 'decoration-1',
      kind: 'SMALL_PLAZA',
    });

    expect(result).toEqual({ status: 'REJECTED', reason: 'INSUFFICIENT_COINS' });
    expect(state).toEqual(before);
  });

  it('rechaza sin mutar cuando la tesorería del propio barrio no alcanza', () => {
    const state = createCity({ gymCoins: 499 });
    const before = structuredClone(state);

    const result = purchaseNeighborhoodDecoration(state, {
      neighborhoodId: GYM_ID,
      decorationId: 'decoration-1',
      kind: 'SMALL_PLAZA',
    });

    expect(result).toEqual({ status: 'REJECTED', reason: 'INSUFFICIENT_COINS' });
    expect(state).toEqual(before);
  });
});

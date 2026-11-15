import { describe, expect, it } from 'vitest';
import { createDayZeroState } from '../../entities/dayZero';
import { createNeighborhood } from '../../entities/neighborhood';
import type { CityBlock, GameState } from '../../types';
import { levelNeighborhoodBlock } from '../blockLeveling';

const NOW = 1_700_000_000_000;
const ID = 'gym-neighborhood-id';
const ORIGIN = { x: 0, y: 0 };

interface CityOptions {
  level?: 1 | 2 | 3 | 4;
  coins?: number;
  xp?: number;
  blocks?: Array<{ position: { x: number; y: number }; isLeveled: boolean }>;
}

function createCity(options: CityOptions = {}): GameState {
  const {
    level = 2,
    coins = 0,
    xp = 0,
    blocks = [{ position: ORIGIN, isLeveled: false }],
  } = options;

  const state = createNeighborhood(createDayZeroState(NOW), {
    id: ID,
    name: 'GYM',
    paletteId: 'MINT_MORNING',
  });
  const neighborhood = state.neighborhoods[ID];

  if (neighborhood === undefined) {
    throw new Error('setup: no se creó el barrio');
  }

  neighborhood.infrastructureLevel = level;
  neighborhood.treasuryCoins = coins;
  neighborhood.blocks = blocks.map(({ position, isLeveled }): CityBlock => ({
    gridPosition: { ...position },
    houses: [],
    isLeveled,
  }));

  state.globals.townHall.qualityOfLifeXP = xp;

  return state;
}

describe('levelNeighborhoodBlock — US-02 CA-03: nivelación de cuadra rústica', () => {
  it('descuenta 300 monedas en Nv.2, nivela la cuadra y acredita 30 XP', () => {
    const state = createCity({ level: 2, coins: 300 });

    const result = levelNeighborhoodBlock(state, ID, ORIGIN);

    expect(result).toMatchObject({ status: 'LEVELED', cost: 300 });
    if (result.status !== 'LEVELED') return;

    const neighborhood = result.state.neighborhoods[ID];
    expect(neighborhood?.treasuryCoins).toBe(0);
    expect(neighborhood?.blocks[0]?.isLeveled).toBe(true);
    expect(result.state.globals.townHall.qualityOfLifeXP).toBe(30);
  });

  it('escala el costo según el nivel del barrio: 600 en Nv.3 y 1000 en Nv.4', () => {
    const levelThree = levelNeighborhoodBlock(createCity({ level: 3, coins: 600 }), ID, ORIGIN);
    const levelFour = levelNeighborhoodBlock(createCity({ level: 4, coins: 1_000 }), ID, ORIGIN);

    expect(levelThree).toMatchObject({ status: 'LEVELED', cost: 600 });
    expect(levelFour).toMatchObject({ status: 'LEVELED', cost: 1_000 });
  });

  it('recalcula el nivel del Ayuntamiento al cruzar un umbral', () => {
    const state = createCity({ level: 2, coins: 300, xp: 90 });

    const result = levelNeighborhoodBlock(state, ID, ORIGIN);

    if (result.status !== 'LEVELED') throw new Error('esperaba nivelación');

    expect(result.state.globals.townHall.qualityOfLifeXP).toBe(120);
    expect(result.state.globals.townHall.level).toBe(2);
  });

  it('rechaza sin mutar cuando el barrio sigue en Nivel 1', () => {
    const state = createCity({ level: 1, coins: 10_000 });
    const before = structuredClone(state);

    const result = levelNeighborhoodBlock(state, ID, ORIGIN);

    expect(result).toEqual({ status: 'REJECTED', reason: 'INFRASTRUCTURE_LEVEL_TOO_LOW' });
    expect(state).toEqual(before);
  });

  it('rechaza una cuadra que ya estaba nivelada', () => {
    const state = createCity({ level: 2, coins: 300, blocks: [{ position: ORIGIN, isLeveled: true }] });

    const result = levelNeighborhoodBlock(state, ID, ORIGIN);

    expect(result).toEqual({ status: 'REJECTED', reason: 'BLOCK_ALREADY_LEVELED' });
  });

  it('rechaza sin mutar cuando la tesorería no alcanza', () => {
    const state = createCity({ level: 2, coins: 299 });
    const before = structuredClone(state);

    const result = levelNeighborhoodBlock(state, ID, ORIGIN);

    expect(result).toEqual({ status: 'REJECTED', reason: 'INSUFFICIENT_COINS' });
    expect(state).toEqual(before);
  });

  it('rechaza una cuadra que no existe en la posición indicada', () => {
    const state = createCity({ level: 2, coins: 300 });

    const result = levelNeighborhoodBlock(state, ID, { x: 9, y: 9 });

    expect(result).toEqual({ status: 'REJECTED', reason: 'BLOCK_NOT_FOUND' });
  });
});

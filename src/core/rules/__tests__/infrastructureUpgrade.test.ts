import { describe, expect, it } from 'vitest';
import { createDayZeroState } from '../../entities/dayZero';
import { createNeighborhood } from '../../entities/neighborhood';
import type { GameState } from '../../types';
import { upgradeNeighborhoodInfrastructure } from '../infrastructureUpgrade';

const NOW = 1_700_000_000_000;
const ID = 'gym-neighborhood-id';

interface CityOptions {
  level?: 1 | 2 | 3 | 4;
  leveledBlocks?: number;
  coins?: number;
  xp?: number;
}

function createCity(options: CityOptions = {}): GameState {
  const { level = 1, leveledBlocks = 0, coins = 0, xp = 0 } = options;

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
  neighborhood.blocks = Array.from({ length: 1 + leveledBlocks }, (_, index) => ({
    gridPosition: { x: index, y: 0 },
    houses: [],
    isLeveled: index < leveledBlocks,
  }));

  state.globals.townHall.qualityOfLifeXP = xp;

  return state;
}

describe('upgradeNeighborhoodInfrastructure — US-02 CA-02: mejora de infraestructura', () => {
  it('cobra el costo base y acredita el XP del nivel destino sin cuadras niveladas', () => {
    const state = createCity({ level: 1, coins: 600 });

    const result = upgradeNeighborhoodInfrastructure(state, ID);

    expect(result).toEqual({ status: 'UPGRADED', state: expect.any(Object), cost: 600 });
    if (result.status !== 'UPGRADED') return;

    const neighborhood = result.state.neighborhoods[ID];
    expect(neighborhood?.infrastructureLevel).toBe(2);
    expect(neighborhood?.treasuryCoins).toBe(0);
    expect(result.state.globals.townHall.qualityOfLifeXP).toBe(50);
    expect(result.state.globals.townHall.level).toBe(1);
  });

  it('suma el recargo por cada cuadra ya nivelada', () => {
    const state = createCity({ level: 2, leveledBlocks: 2, coins: 2300 });

    const result = upgradeNeighborhoodInfrastructure(state, ID);

    expect(result).toMatchObject({ status: 'UPGRADED', cost: 2300 });
    if (result.status !== 'UPGRADED') return;

    const neighborhood = result.state.neighborhoods[ID];
    expect(neighborhood?.infrastructureLevel).toBe(3);
    expect(neighborhood?.treasuryCoins).toBe(0);
    expect(result.state.globals.townHall.qualityOfLifeXP).toBe(120);
  });

  it('recalcula el nivel del Ayuntamiento cuando el XP cruza más de un umbral', () => {
    const state = createCity({ level: 3, coins: 3500, xp: 80 });

    const result = upgradeNeighborhoodInfrastructure(state, ID);

    if (result.status !== 'UPGRADED') throw new Error('esperaba mejora');

    expect(result.state.globals.townHall.qualityOfLifeXP).toBe(380);
    expect(result.state.globals.townHall.level).toBe(3);
  });

  it('rechaza sin mutar el estado cuando la tesorería no alcanza', () => {
    const state = createCity({ level: 1, coins: 599 });
    const before = structuredClone(state);

    const result = upgradeNeighborhoodInfrastructure(state, ID);

    expect(result).toEqual({ status: 'REJECTED', reason: 'INSUFFICIENT_COINS' });
    expect(state).toEqual(before);
  });

  it('rechaza cuando el barrio ya está en el nivel máximo', () => {
    const state = createCity({ level: 4, coins: 10_000 });

    const result = upgradeNeighborhoodInfrastructure(state, ID);

    expect(result).toEqual({ status: 'REJECTED', reason: 'ALREADY_MAX_LEVEL' });
  });

  it('rechaza un barrio que no existe en el estado', () => {
    const state = createCity();

    const result = upgradeNeighborhoodInfrastructure(state, 'unknown-neighborhood-id');

    expect(result).toEqual({ status: 'REJECTED', reason: 'NEIGHBORHOOD_NOT_FOUND' });
  });
});

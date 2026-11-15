import { describe, expect, it } from 'vitest';
import { createDayZeroState } from '../../entities/dayZero';
import { createNeighborhood } from '../../entities/neighborhood';
import type { CityBlock, GameState, House } from '../../types';
import { settleUrbanization } from '../urbanizationSettlement';

const NOW = 1_700_000_000_000;
const ID = 'gym-neighborhood-id';
const ALL_LOTS = [0, 1, 2, 3, 4, 5] as const;

interface CityOptions {
  progress?: number;
  xp?: number;
  level?: 1 | 2 | 3 | 4;
  houses?: House[];
  blocks?: CityBlock[];
}

function fullBlock(position = { x: 0, y: 0 }): CityBlock {
  return {
    gridPosition: position,
    isLeveled: false,
    houses: ALL_LOTS.map(
      (lotIndex): House => ({ lotIndex, designVariant: 1, createdAt: NOW }),
    ),
  };
}

function createCity({
  progress = 0,
  xp = 0,
  level = 1,
  houses = [],
  blocks,
}: CityOptions = {}): GameState {
  const state = createNeighborhood(createDayZeroState(NOW), {
    id: ID,
    name: 'GYM',
    paletteId: 'MINT_MORNING',
  });

  const neighborhood = state.neighborhoods[ID];

  if (neighborhood === undefined) {
    throw new Error('setup: no se creó el barrio');
  }

  neighborhood.urbanizationProgress = progress;
  neighborhood.infrastructureLevel = level;

  if (blocks !== undefined) {
    neighborhood.blocks = blocks;
  } else {
    const firstBlock = neighborhood.blocks[0];

    if (firstBlock === undefined) {
      throw new Error('setup: el barrio no tiene cuadra inicial');
    }

    firstBlock.houses = houses;
  }

  state.globals.townHall.qualityOfLifeXP = xp;

  return state;
}

describe('settleUrbanization — US-03 CA-01: la barra de urbanización se convierte en casa', () => {
  it('consume 100 puntos, conserva el excedente y acredita 10 XP de Calidad de Vida', () => {
    const state = createCity({ progress: 125 });

    const next = settleUrbanization(state, ID, NOW);

    const neighborhood = next.neighborhoods[ID];
    const block = neighborhood?.blocks[0];

    expect(neighborhood?.urbanizationProgress).toBe(25);
    expect(neighborhood?.blocks).toHaveLength(1);
    expect(block?.houses).toHaveLength(1);
    expect(next.globals.townHall.qualityOfLifeXP).toBe(10);
  });

  it('nace con createdAt igual al instante recibido y una variante visual del catálogo', () => {
    const state = createCity({ progress: 100 });

    const next = settleUrbanization(state, ID, NOW);

    const house = next.neighborhoods[ID]?.blocks[0]?.houses[0];

    expect(house?.createdAt).toBe(NOW);
    expect([1, 2, 3]).toContain(house?.designVariant);
  });

  it('convierte cada 100 puntos acumulados en una casa, no solo el primer umbral', () => {
    const state = createCity({ progress: 325 });

    const next = settleUrbanization(state, ID, NOW);

    const neighborhood = next.neighborhoods[ID];

    expect(neighborhood?.urbanizationProgress).toBe(25);
    expect(neighborhood?.blocks[0]?.houses).toHaveLength(3);
    expect(next.globals.townHall.qualityOfLifeXP).toBe(30);
  });

  it('no construye nada ni muta el estado cuando el progreso no alcanza 100', () => {
    const state = createCity({ progress: 99 });
    const before = structuredClone(state);

    const next = settleUrbanization(state, ID, NOW);

    expect(next).toEqual(before);
    expect(state).toEqual(before);
  });

  it('recalcula el nivel del Ayuntamiento cuando el XP de las casas cruza un umbral', () => {
    const state = createCity({ progress: 100, xp: 95 });

    const next = settleUrbanization(state, ID, NOW);

    expect(next.globals.townHall.qualityOfLifeXP).toBe(105);
    expect(next.globals.townHall.level).toBe(2);
  });
});

describe('settleUrbanization — US-03 CA-02: asignación secuencial de lotes en la cuadra activa', () => {
  it('ubica la primera casa en el lote 0 de una cuadra vacía sin inaugurar otra', () => {
    const state = createCity({ progress: 100 });

    const next = settleUrbanization(state, ID, NOW);

    const neighborhood = next.neighborhoods[ID];

    expect(neighborhood?.blocks).toHaveLength(1);
    expect(neighborhood?.blocks[0]?.houses.map((house) => house.lotIndex)).toEqual([0]);
  });

  it('continúa la secuencia estricta desde el último lote contiguo ocupado', () => {
    const state = createCity({
      progress: 100,
      houses: [
        { lotIndex: 0, designVariant: 1, createdAt: NOW },
        { lotIndex: 1, designVariant: 2, createdAt: NOW },
      ],
    });

    const next = settleUrbanization(state, ID, NOW);

    expect(next.neighborhoods[ID]?.blocks[0]?.houses.map((house) => house.lotIndex)).toEqual([
      0, 1, 2,
    ]);
  });

  it('ocupa el primer lote libre real y nunca pisa una casa existente', () => {
    const state = createCity({
      progress: 100,
      houses: [
        { lotIndex: 0, designVariant: 1, createdAt: NOW },
        { lotIndex: 2, designVariant: 3, createdAt: NOW },
      ],
    });

    const next = settleUrbanization(state, ID, NOW);

    const lots = next.neighborhoods[ID]?.blocks[0]?.houses.map((house) => house.lotIndex) ?? [];

    expect([...lots].sort()).toEqual([0, 1, 2]);
    expect(new Set(lots).size).toBe(3);
  });

  it('con 5 lotes ocupados usa el lote 5 y no inaugura una segunda cuadra', () => {
    const state = createCity({
      progress: 100,
      houses: [
        { lotIndex: 0, designVariant: 1, createdAt: NOW },
        { lotIndex: 1, designVariant: 2, createdAt: NOW },
        { lotIndex: 2, designVariant: 3, createdAt: NOW },
        { lotIndex: 3, designVariant: 1, createdAt: NOW },
        { lotIndex: 4, designVariant: 2, createdAt: NOW },
      ],
    });

    const next = settleUrbanization(state, ID, NOW);

    const neighborhood = next.neighborhoods[ID];

    expect(neighborhood?.blocks).toHaveLength(1);
    expect(neighborhood?.blocks[0]?.houses).toHaveLength(6);
    expect(neighborhood?.blocks[0]?.houses.at(-1)?.lotIndex).toBe(5);
  });
});

describe('settleUrbanization — US-03 CA-03: inauguración automática de cuadra rústica', () => {
  it('inaugura una segunda cuadra cuando la activa está llena y aloja la casa en el lote 0', () => {
    const state = createCity({ progress: 100, blocks: [fullBlock()] });

    const next = settleUrbanization(state, ID, NOW);

    const neighborhood = next.neighborhoods[ID];
    const inaugurated = neighborhood?.blocks[1];

    expect(neighborhood?.blocks).toHaveLength(2);
    expect(neighborhood?.blocks[0]?.houses).toHaveLength(6);
    expect(inaugurated?.isLeveled).toBe(false);
    expect(inaugurated?.houses).toHaveLength(1);
    expect(inaugurated?.houses[0]?.lotIndex).toBe(0);
    expect(neighborhood?.urbanizationProgress).toBe(0);
    expect(next.globals.townHall.qualityOfLifeXP).toBe(10);
  });

  it('inaugura otra cuadra con la 13ra casa sin tocar las anteriores', () => {
    const state = createCity({
      progress: 100,
      blocks: [fullBlock({ x: 0, y: 0 }), fullBlock({ x: 1, y: 0 })],
    });

    const next = settleUrbanization(state, ID, NOW);

    const neighborhood = next.neighborhoods[ID];

    expect(neighborhood?.blocks).toHaveLength(3);
    expect(neighborhood?.blocks[0]?.houses).toHaveLength(6);
    expect(neighborhood?.blocks[1]?.houses).toHaveLength(6);
    expect(neighborhood?.blocks[2]?.houses).toHaveLength(1);
    expect(neighborhood?.blocks[2]?.houses[0]?.lotIndex).toBe(0);
  });

  it('la cuadra nueva nace rústica aunque el barrio esté en Nivel 4', () => {
    const state = createCity({ progress: 100, level: 4, blocks: [fullBlock()] });

    const next = settleUrbanization(state, ID, NOW);

    expect(next.neighborhoods[ID]?.blocks[1]?.isLeveled).toBe(false);
  });

  it('reparte varias casas entre la cuadra llena y la nueva en una sola liquidación', () => {
    const state = createCity({ progress: 250, blocks: [fullBlock()] });

    const next = settleUrbanization(state, ID, NOW);

    const neighborhood = next.neighborhoods[ID];

    expect(neighborhood?.blocks).toHaveLength(2);
    expect(neighborhood?.blocks[1]?.houses.map((house) => house.lotIndex)).toEqual([0, 1]);
    expect(neighborhood?.urbanizationProgress).toBe(50);
    expect(next.globals.townHall.qualityOfLifeXP).toBe(20);
  });
});

describe('settleUrbanization — US-03 CA-04: posicionamiento compacto por mayor adyacencia', () => {
  it('elige la coordenada con más cuadras lindantes antes que el orden de lectura', () => {
    const state = createCity({
      progress: 100,
      blocks: [fullBlock({ x: 0, y: 2 }), fullBlock({ x: 2, y: 2 })],
    });

    const next = settleUrbanization(state, ID, NOW);

    expect(next.neighborhoods[ID]?.blocks[2]?.gridPosition).toEqual({ x: 1, y: 2 });
  });

  it('desempata por menor distancia al origen y luego por orden de lectura', () => {
    const state = createCity({
      progress: 100,
      blocks: [fullBlock({ x: 0, y: 0 }), fullBlock({ x: 1, y: 0 })],
    });

    const next = settleUrbanization(state, ID, NOW);

    expect(next.neighborhoods[ID]?.blocks[2]?.gridPosition).toEqual({ x: 0, y: -1 });
  });

  it('crece junto a las cuadras existentes aunque estén lejos del origen', () => {
    const state = createCity({
      progress: 100,
      blocks: [fullBlock({ x: 2, y: 0 }), fullBlock({ x: 3, y: 0 })],
    });

    const next = settleUrbanization(state, ID, NOW);

    expect(next.neighborhoods[ID]?.blocks[2]?.gridPosition).toEqual({ x: 1, y: 0 });
  });
});

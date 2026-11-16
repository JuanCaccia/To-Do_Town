import { describe, expect, it } from 'vitest';
import type { HabitBuilding, HabitFrequency } from '../../types';
import { getHabitCooldownHours, getHabitEfficiency } from '../habitEfficiency';

const NOW = 1_700_000_000_000;
const HOUR = 3_600_000;

const weekly = (count: number): HabitFrequency => ({ type: 'TIMES_PER_WEEK', count });
const DAILY: HabitFrequency = { type: 'DAILY' };

function habit(overrides: Partial<HabitBuilding> = {}): HabitBuilding {
  return {
    neighborhoodId: 'gym-neighborhood-id',
    title: 'Entrenar Fuerza',
    frequency: weekly(3),
    currentStreakDays: 0,
    checkpointLevel: 1,
    lastCompletedAt: NOW,
    createdAt: NOW - 30 * 24 * HOUR,
    lastFrequencyChangeAt: null,
    retiredAt: null,
    status: 'ACTIVE',
    ...overrides,
  };
}

const hoursAfter = (hours: number) => NOW + hours * HOUR;

describe('getHabitCooldownHours — US-07 CA-01: ventana de enfriamiento T', () => {
  // ECONOMY §2.1.1: T = (7/X)·24 + 12h + InerciaUrbana
  it.each([
    { count: 1, expected: 180 },
    { count: 2, expected: 96 },
    { count: 3, expected: 68 },
    { count: 4, expected: 54 },
    { count: 6, expected: 40 },
  ])(
    'con $count cumplimientos por semana y sin Inercia Urbana (Nv.1), T = $expected h',
    ({ count, expected }) => {
      expect(getHabitCooldownHours(weekly(count), 1)).toBe(expected);
    },
  );

  it('conserve la fracción cuando la frecuencia no divide las 24 h (X = 5)', () => {
    expect(getHabitCooldownHours(weekly(5), 1)).toBeCloseTo(45.6, 10);
  });

  // ECONOMY §2.1.1: el DAILY es un switch, no una curva: 24 h + 4 h de gracia.
  it('para DAILY, T = 24 h + 4 h de gracia en un barrio Nv.1', () => {
    expect(getHabitCooldownHours(DAILY, 1)).toBe(28);
  });

  // ECONOMY §4.1: Inercia Urbana +0h / +2h / +4h / +6h.
  it.each([
    { level: 1 as const, expected: 68 },
    { level: 2 as const, expected: 70 },
    { level: 3 as const, expected: 72 },
    { level: 4 as const, expected: 74 },
  ])('suma la Inercia Urbana del barrio en Nv.$level sobre la base semanal', ({ level, expected }) => {
    expect(getHabitCooldownHours(weekly(3), level)).toBe(expected);
  });

  it.each([
    { level: 1 as const, expected: 28 },
    { level: 2 as const, expected: 30 },
    { level: 3 as const, expected: 32 },
    { level: 4 as const, expected: 34 },
  ])('suma la Inercia Urbana del barrio en Nv.$level también al switch DAILY', ({ level, expected }) => {
    expect(getHabitCooldownHours(DAILY, level)).toBe(expected);
  });
});

describe('getHabitEfficiency — US-07 CA-02: curva escalonada de decaimiento', () => {
  // weekly(3) en Nv.1 da T = 68 h: Pleno hasta 34 h, Desgaste hasta 51 h,
  // Crítico hasta 68 h, Apagón desde 68 h.
  it.each([
    { at: 0, expected: 1, stage: 'Pleno' },
    { at: 34, expected: 1, stage: 'Pleno (borde superior inclusivo)' },
    { at: 34.5, expected: 2 / 3, stage: 'Desgaste' },
    { at: 51, expected: 2 / 3, stage: 'Desgaste (borde superior inclusivo)' },
    { at: 51.5, expected: 1 / 3, stage: 'Crítico' },
    { at: 67.5, expected: 1 / 3, stage: 'Crítico (todavía no Apagón)' },
    { at: 68, expected: 0, stage: 'Apagón (borde inferior inclusivo)' },
  ])('con T = 68 h y $at h transcurridas, $stage', ({ at, expected }) => {
    expect(getHabitEfficiency(habit(), 1, hoursAfter(at))).toBe(expected);
  });

  it('usa los valores canónicos exactos {1, 2/3, 1/3, 0} y no su presentación redondeada', () => {
    const degraded = getHabitEfficiency(habit(), 1, hoursAfter(40));

    expect(degraded).toBe(2 / 3);
    expect(degraded).not.toBe(0.66);
  });

  // ECONOMY §2.1.1: el DAILY no atraviesa Desgaste ni Crítico.
  it.each([
    { at: 0, expected: 1 },
    { at: 14, expected: 1 },
    { at: 27.5, expected: 1 },
    { at: 28, expected: 0 },
    { at: 40, expected: 0 },
  ])('un DAILY (T = 28 h) a las $at h vale $expected: es un switch, no una curva', ({ at, expected }) => {
    const dailyHabit = habit({ frequency: DAILY });

    expect(getHabitEfficiency(dailyHabit, 1, hoursAfter(at))).toBe(expected);
  });

  it('sin cumplimiento previo mide desde createdAt y puede caer en Apagón (DEC-013)', () => {
    const neverCompleted = habit({
      frequency: DAILY,
      lastCompletedAt: null,
      createdAt: hoursAfter(-30),
    });

    expect(getHabitEfficiency(neverCompleted, 1, NOW)).toBe(0);
  });

  it('la Inercia Urbana retrasa el decaimiento: a las 51.5 h Nv.1 ya es Crítico y Nv.2 sigue en Desgaste', () => {
    expect(getHabitEfficiency(habit(), 1, hoursAfter(51.5))).toBe(1 / 3);
    expect(getHabitEfficiency(habit(), 2, hoursAfter(51.5))).toBe(2 / 3);
  });

  it.each(['PAUSED', 'RETIRED_TO_MUSEUM'] as const)(
    'un hábito %s tiene eficiencia derivada 0.0 aunque su ventana siga vigente',
    (status) => {
      const inactive = habit({ status });

      expect(getHabitEfficiency(inactive, 1, NOW)).toBe(0);
    },
  );
});

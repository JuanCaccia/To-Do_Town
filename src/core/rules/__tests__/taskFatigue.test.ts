import { describe, expect, it } from 'vitest';
import {
  getGlobalTaskMultiplier,
  getLocalTaskMultiplier,
  getTaskFatigueMultiplier,
  getWaterBonusTasks,
} from '../taskFatigue';

describe('getWaterBonusTasks — US-05 CA-03: B_agua según ECONOMY §2.3', () => {
  it.each([
    [0, 0],
    [0.5, 0],
    [1, 1],
    [1.5, 1],
    [2, 2],
    [3, 2],
  ])('con %f L del día el bono es +%i tareas', (dailyLiters, expected) => {
    expect(getWaterBonusTasks(dailyLiters)).toBe(expected);
  });
});

describe('getLocalTaskMultiplier — US-05 CA-03: cupo local del barrio', () => {
  it.each([
    [0, 1],
    [4, 1],
    [5, 0.5],
    [9, 0.5],
    [10, 0.1],
    [25, 0.1],
  ])('sin bono de agua, con %i tareas completadas el multiplicador es %f', (count, expected) => {
    expect(getLocalTaskMultiplier(count, 0)).toBe(expected);
  });

  it.each([
    [6, 1],
    [7, 0.5],
    [11, 0.5],
    [12, 0.1],
  ])('con 2 L de agua, con %i tareas completadas el multiplicador es %f', (count, expected) => {
    expect(getLocalTaskMultiplier(count, 2)).toBe(expected);
  });
});

describe('getGlobalTaskMultiplier — US-05 CA-04: estamina global de la ciudad', () => {
  it.each([
    [0, 1],
    [7, 1],
    [8, 0.5],
    [13, 0.5],
    [14, 0.1],
    [40, 0.1],
  ])('sin bono de agua, con %i tareas globales el multiplicador es %f', (count, expected) => {
    expect(getGlobalTaskMultiplier(count, 0)).toBe(expected);
  });

  it.each([
    [9, 1],
    [10, 0.5],
    [15, 0.5],
    [16, 0.1],
  ])('con 2 L de agua, con %i tareas globales el multiplicador es %f', (count, expected) => {
    expect(getGlobalTaskMultiplier(count, 2)).toBe(expected);
  });
});

describe('getTaskFatigueMultiplier — US-05 CA-04: regla del mínimo', () => {
  it('toma el local cuando es el más bajo', () => {
    expect(getTaskFatigueMultiplier(10, 0, 0)).toBe(0.1);
  });

  it('toma el global cuando es el más bajo', () => {
    expect(getTaskFatigueMultiplier(0, 14, 0)).toBe(0.1);
  });

  it('devuelve 1.0 cuando ambos están en tramo óptimo', () => {
    expect(getTaskFatigueMultiplier(3, 4, 0)).toBe(1);
  });
});

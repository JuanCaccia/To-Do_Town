import { describe, expect, it } from 'vitest';
import { HABIT_COINS_PER_HOUR } from '../../constants/economyConstants';
import { createDayZeroState } from '../../entities/dayZero';
import type { EntityId, GameState, HabitBuilding } from '../../types';
import { getDistrictProductionRate, getNeighborhoodMultiplier } from '../districtProduction';

const NOW = 1_700_000_000_000;
const NEIGHBORHOOD: EntityId = 'tutorial-neighborhood-id';

function firstHabit(state: GameState): [EntityId, HabitBuilding] {
  const entry = Object.entries(state.habits)[0];

  if (entry === undefined) {
    throw new Error('fixture sin hábitos');
  }

  return entry;
}

function withHabit(state: GameState, patch: Partial<HabitBuilding>): GameState {
  const [habitId, habit] = firstHabit(state);

  return { ...state, habits: { ...state.habits, [habitId]: { ...habit, ...patch } } };
}

/**
 * UX-02: el Inspector muestra cuánto produce el distrito **ahora**. El número
 * tiene que salir de las mismas reglas que liquidan la producción pasiva, no de
 * una segunda implementación en el HUD.
 */
describe('UX-02: tasa de producción de un distrito en el instante `now`', () => {
  it('un hábito diario cumplido hoy rinde el 100% de su capacidad', () => {
    const state = withHabit(createDayZeroState(NOW), { lastCompletedAt: NOW });

    const rate = getDistrictProductionRate(state, NEIGHBORHOOD, NOW);

    expect(rate.fullCapacityCoinsPerHour).toBe(HABIT_COINS_PER_HOUR);
    expect(rate.coinsPerHour).toBe(HABIT_COINS_PER_HOUR);
    expect(rate.efficiency).toBe(1);
  });

  it('durante el Arranque de Motores rinde la mitad y lo declara en la eficiencia', () => {
    const base = withHabit(createDayZeroState(NOW), { lastCompletedAt: NOW });
    const neighborhood = base.neighborhoods[NEIGHBORHOOD]!;

    const state: GameState = {
      ...base,
      neighborhoods: {
        ...base.neighborhoods,
        [NEIGHBORHOOD]: { ...neighborhood, reactivationPenaltyUntil: NOW + 3_600_000 },
      },
    };

    const rate = getDistrictProductionRate(state, NEIGHBORHOOD, NOW);

    expect(rate.coinsPerHour).toBe(HABIT_COINS_PER_HOUR / 2);
    expect(rate.fullCapacityCoinsPerHour).toBe(HABIT_COINS_PER_HOUR);
    expect(rate.efficiency).toBe(0.5);
  });

  it('un hábito en Apagón no aporta aunque esté activo', () => {
    const base = createDayZeroState(NOW);
    const [habitId, habit] = firstHabit(base);

    // La ventana diaria es 24 h + gracia + inercia del nivel 1: cinco días
    // después no queda nada por devengar.
    const stale: GameState = {
      ...base,
      habits: {
        ...base.habits,
        [habitId]: { ...habit, lastCompletedAt: NOW - 5 * 24 * 3_600_000 },
      },
    };

    const rate = getDistrictProductionRate(stale, NEIGHBORHOOD, NOW);

    expect(rate.coinsPerHour).toBe(0);
    expect(rate.fullCapacityCoinsPerHour).toBe(HABIT_COINS_PER_HOUR);
    expect(rate.efficiency).toBe(0);
  });

  it('un hábito en pausa no ocupa capacidad ni produce', () => {
    const state = withHabit(createDayZeroState(NOW), { status: 'PAUSED' });

    const rate = getDistrictProductionRate(state, NEIGHBORHOOD, NOW);

    expect(rate.coinsPerHour).toBe(0);
    expect(rate.fullCapacityCoinsPerHour).toBe(0);
    expect(rate.efficiency).toBe(0);
  });

  it('un distrito sin hábitos no divide por cero', () => {
    const state = createDayZeroState(NOW);
    const empty: GameState = { ...state, habits: {} };

    const rate = getDistrictProductionRate(empty, NEIGHBORHOOD, NOW);

    expect(rate).toEqual({ coinsPerHour: 0, fullCapacityCoinsPerHour: 0, efficiency: 0 });
  });

  it('el multiplicador del barrio sólo baja mientras la ventana está vigente', () => {
    const base = createDayZeroState(NOW);
    const neighborhood = base.neighborhoods[NEIGHBORHOOD]!;

    expect(getNeighborhoodMultiplier({ ...neighborhood, reactivationPenaltyUntil: null }, NOW)).toBe(
      1,
    );
    expect(
      getNeighborhoodMultiplier({ ...neighborhood, reactivationPenaltyUntil: NOW + 1 }, NOW),
    ).toBe(0.5);
    expect(
      getNeighborhoodMultiplier({ ...neighborhood, reactivationPenaltyUntil: NOW }, NOW),
    ).toBe(1);
  });
});

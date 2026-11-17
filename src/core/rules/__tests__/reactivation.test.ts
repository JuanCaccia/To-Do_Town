import { describe, expect, it } from 'vitest';
import type { GameState } from '../../types';
import { createDayZeroState } from '../../entities/dayZero';
import { calculateTick } from '../calculateTick';
import { activateManualPause } from '../manualPause';
import { reactivateNeighborhood, REACTIVATION_PENALTY_MS } from '../reactivation';

const START = 1_700_000_000_000;
const ONE_HOUR = 3_600_000;
const SEVENTY_TWO_HOURS = 72 * ONE_HOUR;
const RETURN_AT = START + 100 * ONE_HOUR;

const TUTORIAL_NEIGHBORHOOD = 'tutorial-neighborhood-id';
const TUTORIAL_HABIT = 'tutorial-habit-id';
const OTHER_NEIGHBORHOOD = 'other-neighborhood-id';
const OTHER_HABIT = 'other-habit-id';

function hibernatedState(): GameState {
  return calculateTick(createDayZeroState(START), START + SEVENTY_TWO_HOURS);
}

function twoBarriosHibernated(): GameState {
  const state = hibernatedState();
  const tutorialNeighborhood = state.neighborhoods[TUTORIAL_NEIGHBORHOOD]!;
  const tutorialHabit = state.habits[TUTORIAL_HABIT]!;

  return {
    ...state,
    neighborhoods: {
      ...state.neighborhoods,
      [OTHER_NEIGHBORHOOD]: { ...tutorialNeighborhood, name: 'Otro Barrio', isTutorial: false },
    },
    habits: {
      ...state.habits,
      [OTHER_HABIT]: {
        ...tutorialHabit,
        neighborhoodId: OTHER_NEIGHBORHOOD,
        title: 'Otro Hábito',
      },
    },
  };
}

describe('US-11 CA-02: reactivación de la ciudad y Arranque de Motores por barrio', () => {
  it('reactiva la ciudad y el barrio con una ventana de 24 horas', () => {
    const result = reactivateNeighborhood(hibernatedState(), TUTORIAL_NEIGHBORHOOD, RETURN_AT);

    expect(result.cityStatus).toBe('ACTIVE');
    expect(result.lastUserInteractionAt).toBe(RETURN_AT);
    expect(result.lastTickAt).toBe(RETURN_AT);
    expect(result.habits[TUTORIAL_HABIT]?.status).toBe('ACTIVE');
    expect(result.neighborhoods[TUTORIAL_NEIGHBORHOOD]?.reactivationPenaltyUntil).toBe(
      RETURN_AT + REACTIVATION_PENALTY_MS,
    );
  });

  it('no aplica penalización si la meta diaria de agua ya está cumplida', () => {
    const hibernated = hibernatedState();
    const watered: GameState = {
      ...hibernated,
      globals: {
        ...hibernated.globals,
        aqueduct: { ...hibernated.globals.aqueduct, dailyLiters: 2 },
      },
    };

    const result = reactivateNeighborhood(watered, TUTORIAL_NEIGHBORHOOD, RETURN_AT);

    expect(result.cityStatus).toBe('ACTIVE');
    expect(result.neighborhoods[TUTORIAL_NEIGHBORHOOD]?.reactivationPenaltyUntil).toBeNull();
  });

  it('sólo reactiva los hábitos del barrio que vuelve', () => {
    const result = reactivateNeighborhood(twoBarriosHibernated(), TUTORIAL_NEIGHBORHOOD, RETURN_AT);

    expect(result.habits[TUTORIAL_HABIT]?.status).toBe('ACTIVE');
    expect(result.habits[OTHER_HABIT]?.status).toBe('PAUSED');
    expect(result.neighborhoods[OTHER_NEIGHBORHOOD]?.reactivationPenaltyUntil).toBeNull();
  });

  it('reactiva un barrio pendiente aunque la ciudad ya esté activa', () => {
    const firstReturn = reactivateNeighborhood(
      twoBarriosHibernated(),
      TUTORIAL_NEIGHBORHOOD,
      RETURN_AT,
    );
    const secondReturn = reactivateNeighborhood(firstReturn, OTHER_NEIGHBORHOOD, RETURN_AT + ONE_HOUR);

    expect(secondReturn.cityStatus).toBe('ACTIVE');
    expect(secondReturn.habits[OTHER_HABIT]?.status).toBe('ACTIVE');
    expect(secondReturn.neighborhoods[OTHER_NEIGHBORHOOD]?.reactivationPenaltyUntil).toBe(
      RETURN_AT + ONE_HOUR + REACTIVATION_PENALTY_MS,
    );
  });

  it('no hace nada con la ciudad activa y sin hábitos en pausa', () => {
    const active = createDayZeroState(START);

    expect(reactivateNeighborhood(active, TUTORIAL_NEIGHBORHOOD, RETURN_AT)).toBe(active);
  });

  it('no reactiva una ciudad en pausa manual', () => {
    const paused = activateManualPause(createDayZeroState(START), 'Viaje', START);

    if (paused.status !== 'PAUSED') throw new Error('esperaba pausa');

    expect(reactivateNeighborhood(paused.state, TUTORIAL_NEIGHBORHOOD, RETURN_AT)).toBe(paused.state);
  });
});

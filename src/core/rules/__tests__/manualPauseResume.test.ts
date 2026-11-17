import { describe, expect, it } from 'vitest';
import type { GameState } from '../../types';
import { createDayZeroState } from '../../entities/dayZero';
import { getHabitEfficiency } from '../habitEfficiency';
import { activateManualPause, resumeManualPause } from '../manualPause';

const START = 1_700_000_000_000;
const ONE_HOUR = 3_600_000;
const TEN_HOURS = 10 * ONE_HOUR;
const FORTY_EIGHT_HOURS = 48 * ONE_HOUR;

const TUTORIAL_NEIGHBORHOOD = 'tutorial-neighborhood-id';
const TUTORIAL_HABIT = 'tutorial-habit-id';
const RETIRED_HABIT = 'retired-habit-id';

function stateWithHistory(): GameState {
  const base = createDayZeroState(START);
  const tutorialHabit = base.habits[TUTORIAL_HABIT]!;
  const tutorialNeighborhood = base.neighborhoods[TUTORIAL_NEIGHBORHOOD]!;

  return {
    ...base,
    habits: {
      ...base.habits,
      [TUTORIAL_HABIT]: { ...tutorialHabit, lastCompletedAt: START - TEN_HOURS },
      [RETIRED_HABIT]: {
        ...tutorialHabit,
        status: 'RETIRED_TO_MUSEUM',
        retiredAt: START - ONE_HOUR,
        lastCompletedAt: START - TEN_HOURS,
      },
    },
    neighborhoods: {
      ...base.neighborhoods,
      [TUTORIAL_NEIGHBORHOOD]: {
        ...tutorialNeighborhood,
        // Penalización vigente que la reanudación debe limpiar.
        reactivationPenaltyUntil: START + 24 * ONE_HOUR,
      },
    },
  };
}

function pausedAtStart(): GameState {
  const result = activateManualPause(stateWithHistory(), 'Semana de finales', START);

  if (result.status !== 'PAUSED') throw new Error('esperaba pausa');

  return result.state;
}

describe('resumeManualPause — US-10 CA-03: reanudación sin penalización', () => {
  const RESUME = START + FORTY_EIGHT_HOURS;

  it('devuelve la ciudad a ACTIVE y limpia el motivo', () => {
    const resumed = resumeManualPause(pausedAtStart(), RESUME);

    expect(resumed.cityStatus).toBe('ACTIVE');
    expect(resumed.manualPauseReason).toBeUndefined();
  });

  it('adelanta lastTickAt y lastUserInteractionAt al instante de reanudar', () => {
    const resumed = resumeManualPause(pausedAtStart(), RESUME);

    expect(resumed.lastTickAt).toBe(RESUME);
    expect(resumed.lastUserInteractionAt).toBe(RESUME);
  });

  it('desplaza el lastCompletedAt de los hábitos activos por la duración de la pausa', () => {
    const resumed = resumeManualPause(pausedAtStart(), RESUME);

    expect(resumed.habits[TUTORIAL_HABIT]?.lastCompletedAt).toBe(
      START - TEN_HOURS + FORTY_EIGHT_HOURS,
    );
  });

  it('no desplaza la ventana de un hábito retirado', () => {
    const resumed = resumeManualPause(pausedAtStart(), RESUME);

    expect(resumed.habits[RETIRED_HABIT]?.lastCompletedAt).toBe(START - TEN_HOURS);
  });

  it('retoma la curva de enfriamiento en el mismo punto donde quedó congelada', () => {
    const paused = pausedAtStart();
    const resumed = resumeManualPause(paused, RESUME);
    const infrastructure = resumed.neighborhoods[TUTORIAL_NEIGHBORHOOD]!.infrastructureLevel;

    expect(
      getHabitEfficiency(resumed.habits[TUTORIAL_HABIT]!, infrastructure, RESUME),
    ).toBe(getHabitEfficiency(paused.habits[TUTORIAL_HABIT]!, infrastructure, START));
  });

  it('no aplica la penalización del 50% de Arranque de Motores', () => {
    const resumed = resumeManualPause(pausedAtStart(), RESUME);

    expect(resumed.neighborhoods[TUTORIAL_NEIGHBORHOOD]?.reactivationPenaltyUntil).toBeNull();
  });
});

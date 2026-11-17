import { describe, expect, it } from 'vitest';
import type { GameState } from '../../types';
import { createDayZeroState } from '../../entities/dayZero';
import { completeTask } from '../../entities/task';
import { calculateTick } from '../calculateTick';
import { getCityNow } from '../cityClock';
import { completeHabit } from '../habitCheckIn';
import { getHabitEfficiency } from '../habitEfficiency';
import { activateManualPause } from '../manualPause';

const START = 1_700_000_000_000;
const ONE_HOUR = 3_600_000;
const FORTY_EIGHT_HOURS = 48 * ONE_HOUR;

const TUTORIAL_NEIGHBORHOOD = 'tutorial-neighborhood-id';
const TUTORIAL_HABIT = 'tutorial-habit-id';
const TUTORIAL_COMPLEX_TASK = 'tutorial-complex-task-id';

function pausedState(): GameState {
  const result = activateManualPause(createDayZeroState(START), 'Semana de finales', START);

  if (result.status !== 'PAUSED') throw new Error('esperaba pausa');

  return result.state;
}

describe('US-10 CA-02: congelamiento total durante la pausa manual', () => {
  it('no produce monedas pasivas aunque transcurran 48 horas', () => {
    const paused = pausedState();
    const result = calculateTick(paused, START + FORTY_EIGHT_HOURS);

    expect(result.neighborhoods[TUTORIAL_NEIGHBORHOOD]?.treasuryCoins).toBe(
      paused.neighborhoods[TUTORIAL_NEIGHBORHOOD]?.treasuryCoins,
    );
    expect(result.neighborhoods[TUTORIAL_NEIGHBORHOOD]?.pendingCoinsRemainder).toBe(0);
  });

  it('mantiene la racha y la ventana de enfriamiento de los hábitos', () => {
    const paused = pausedState();
    const result = calculateTick(paused, START + FORTY_EIGHT_HOURS);

    expect(result.habits[TUTORIAL_HABIT]?.currentStreakDays).toBe(
      paused.habits[TUTORIAL_HABIT]?.currentStreakDays,
    );
    expect(result.habits[TUTORIAL_HABIT]?.lastCompletedAt).toBe(
      paused.habits[TUTORIAL_HABIT]?.lastCompletedAt,
    );
    expect(result.habits[TUTORIAL_HABIT]?.status).toBe('ACTIVE');
  });

  it('no dispara el auto-pause por inactividad', () => {
    const result = calculateTick(pausedState(), START + FORTY_EIGHT_HOURS);

    expect(result.cityStatus).toBe('MANUAL_PAUSE');
  });

  it('congela el reloj operativo de la ciudad en el instante de pausa', () => {
    expect(getCityNow(pausedState(), START + FORTY_EIGHT_HOURS)).toBe(START);
  });

  it('congela la eficiencia derivada en su valor al pausar', () => {
    const paused = pausedState();
    const later = START + FORTY_EIGHT_HOURS;
    const habit = paused.habits[TUTORIAL_HABIT]!;
    const infrastructure = paused.neighborhoods[TUTORIAL_NEIGHBORHOOD]!.infrastructureLevel;

    expect(getHabitEfficiency(habit, infrastructure, later)).toBe(0);
    expect(getHabitEfficiency(habit, infrastructure, getCityNow(paused, later))).toBe(1);
  });

  it('rechaza completar un hábito mientras la ciudad está pausada', () => {
    const result = completeHabit(pausedState(), TUTORIAL_HABIT, START + ONE_HOUR);

    expect(result).toEqual({ status: 'REJECTED', reason: 'CITY_PAUSED' });
  });

  it('rechaza completar una tarea mientras la ciudad está pausada', () => {
    const paused = pausedState();
    const result = completeTask(paused, TUTORIAL_COMPLEX_TASK, START + ONE_HOUR);

    expect(result).toBe(paused);
  });
});

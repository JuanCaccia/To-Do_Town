import { describe, expect, it } from 'vitest';
import type { GameState } from '../../types';
import { createDayZeroState } from '../../entities/dayZero';
import { calculateTick } from '../calculateTick';
import { getHabitEfficiency } from '../habitEfficiency';
import { activateManualPause } from '../manualPause';

const START = 1_700_000_000_000;
const ONE_HOUR = 3_600_000;
const SEVENTY_TWO_HOURS = 72 * ONE_HOUR;

const TUTORIAL_NEIGHBORHOOD = 'tutorial-neighborhood-id';
const TUTORIAL_HABIT = 'tutorial-habit-id';

function stateAtStart(): GameState {
  return createDayZeroState(START);
}

/** Hábito semanal (ventana de 180 h) que a las 72 h todavía NO cayó en Apagón. */
function weeklyHabitState(): GameState {
  const base = stateAtStart();
  const habit = base.habits[TUTORIAL_HABIT]!;

  return {
    ...base,
    habits: {
      ...base.habits,
      [TUTORIAL_HABIT]: {
        ...habit,
        frequency: { type: 'TIMES_PER_WEEK', count: 1 },
        checkpointLevel: 3,
        currentStreakDays: 30,
        lastCompletedAt: START,
      },
    },
  };
}

describe('US-11 CA-01: hibernación automática tras 72 horas de inactividad', () => {
  it('hiberna la ciudad exactamente a las 72 horas', () => {
    const result = calculateTick(stateAtStart(), START + SEVENTY_TWO_HOURS);

    expect(result.cityStatus).toBe('AUTO_PAUSED_HIBERNATION');
  });

  it('no hiberna un segundo antes de las 72 horas', () => {
    const result = calculateTick(stateAtStart(), START + SEVENTY_TWO_HOURS - 1);

    expect(result.cityStatus).toBe('ACTIVE');
  });

  it('apaga los hábitos activos: eficiencia derivada 0.0', () => {
    const result = calculateTick(stateAtStart(), START + SEVENTY_TWO_HOURS);
    const habit = result.habits[TUTORIAL_HABIT]!;
    const infrastructure = result.neighborhoods[TUTORIAL_NEIGHBORHOOD]!.infrastructureLevel;

    expect(habit.status).toBe('PAUSED');
    expect(getHabitEfficiency(habit, infrastructure, START + SEVENTY_TWO_HOURS)).toBe(0);
  });

  it('retrocede la racha al piso seguro aun sin Apagón previo', () => {
    const result = calculateTick(weeklyHabitState(), START + SEVENTY_TWO_HOURS);

    // Nivel 3 → piso de 21 días, aunque su ventana semanal siga vigente.
    expect(result.habits[TUTORIAL_HABIT]?.currentStreakDays).toBe(21);
  });

  it('liquida sólo hasta agotarse la ventana de enfriamiento', () => {
    const result = calculateTick(stateAtStart(), START + SEVENTY_TWO_HOURS);

    // DAILY a infraestructura 1: 28 h plenas × 5 🪙/h = 140, y nada después.
    expect(result.neighborhoods[TUTORIAL_NEIGHBORHOOD]?.treasuryCoins).toBe(640);
  });

  it('marca el instante de hibernación como último tick liquidado', () => {
    const now = START + SEVENTY_TWO_HOURS;
    const result = calculateTick(stateAtStart(), now);

    expect(result.lastTickAt).toBe(now);
  });

  it('no hiberna una ciudad en pausa manual', () => {
    const paused = activateManualPause(stateAtStart(), 'Viaje', START);

    if (paused.status !== 'PAUSED') throw new Error('esperaba pausa');

    const result = calculateTick(paused.state, START + 100 * ONE_HOUR);

    expect(result.cityStatus).toBe('MANUAL_PAUSE');
    expect(result.habits[TUTORIAL_HABIT]?.status).toBe('ACTIVE');
  });

  it('una ciudad hibernada no vuelve a producir en ticks posteriores', () => {
    const hibernated = calculateTick(stateAtStart(), START + SEVENTY_TWO_HOURS);
    const later = calculateTick(hibernated, START + 200 * ONE_HOUR);

    expect(later.cityStatus).toBe('AUTO_PAUSED_HIBERNATION');
    expect(later.neighborhoods[TUTORIAL_NEIGHBORHOOD]?.treasuryCoins).toBe(
      hibernated.neighborhoods[TUTORIAL_NEIGHBORHOOD]?.treasuryCoins,
    );
  });
});

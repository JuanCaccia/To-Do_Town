import { describe, expect, it } from 'vitest';
import { createDayZeroState } from '../../../core/entities/dayZero';
import { injectHabitCheckpointLevel } from '../habitLevelInjection';

const NOW = 1_700_000_000_000;
const HABIT_ID = 'tutorial-habit-id';

/**
 * US-06 Prueba 3 exige un hábito en Nivel 5 y la regla de retiro rechaza con
 * `MAX_CHECKPOINT_NOT_REACHED` si no lo está. Nivel 5 son 100 jornadas de
 * check-in: no hay forma manual de llegar. DEV-01 sólo sembraba monedas.
 */
describe('DEV-01 (extensión): inyección de nivel de hábito', () => {
  it('fija el nivel del hábito indicado sin tocar el resto del estado', () => {
    const state = createDayZeroState(NOW);

    const next = injectHabitCheckpointLevel(state, HABIT_ID, 5);

    expect(next.habits[HABIT_ID]?.checkpointLevel).toBe(5);
    expect(next.neighborhoods).toEqual(state.neighborhoods);
    expect(next.globals).toEqual(state.globals);
    expect(next.lastTickAt).toBe(state.lastTickAt);
  });

  it('no toca los demás campos del hábito', () => {
    const state = createDayZeroState(NOW);
    const original = state.habits[HABIT_ID];

    const next = injectHabitCheckpointLevel(state, HABIT_ID, 3);
    const habit = next.habits[HABIT_ID];

    expect(habit?.title).toBe(original?.title);
    expect(habit?.status).toBe(original?.status);
    expect(habit?.frequency).toEqual(original?.frequency);
    expect(habit?.createdAt).toBe(original?.createdAt);
  });

  it('no muta el estado recibido', () => {
    const state = createDayZeroState(NOW);

    injectHabitCheckpointLevel(state, HABIT_ID, 5);

    expect(state.habits[HABIT_ID]?.checkpointLevel).toBe(1);
  });

  it('devuelve el mismo estado si el hábito no existe o el nivel está fuera de rango', () => {
    const state = createDayZeroState(NOW);

    expect(injectHabitCheckpointLevel(state, 'habito-inexistente', 5)).toBe(state);
    expect(injectHabitCheckpointLevel(state, HABIT_ID, 0)).toBe(state);
    expect(injectHabitCheckpointLevel(state, HABIT_ID, 6)).toBe(state);
    expect(injectHabitCheckpointLevel(state, HABIT_ID, 2.5)).toBe(state);
  });
});

import { describe, expect, it } from 'vitest';
import type { GameState } from '../../types';
import { createDayZeroState } from '../../entities/dayZero';
import { createUndoSnapshot, UNDO_WINDOW_MS } from '../undoSnapshot';

const START = 1_700_000_000_000;
const FIVE_MINUTES = 300_000;

function dayZeroState(): GameState {
  return createDayZeroState(START);
}

describe('createUndoSnapshot — US-13 CA-01: instantánea de reversibilidad con TTL', () => {
  it('registra actionId, descripción e instantes de creación y expiración', () => {
    const snapshot = createUndoSnapshot(dayZeroState(), 'action-1', 'Tarea completada', START);

    expect(snapshot).toEqual({
      actionId: 'action-1',
      description: 'Tarea completada',
      createdAt: START,
      expiresAt: START + FIVE_MINUTES,
      previousState: dayZeroState(),
    });
  });

  it('fija la ventana de reversibilidad en exactamente 5 minutos', () => {
    expect(UNDO_WINDOW_MS).toBe(FIVE_MINUTES);

    const snapshot = createUndoSnapshot(dayZeroState(), 'action-2', 'Agua registrada', START + 42);

    expect(snapshot.expiresAt - snapshot.createdAt).toBe(FIVE_MINUTES);
  });

  it('guarda una copia aislada del estado previo en vez de la referencia viva', () => {
    const state = dayZeroState();
    const snapshot = createUndoSnapshot(state, 'action-3', 'Hábito cumplido', START);

    // Si la instantánea compartiera nodos con el estado vivo, esta escritura lo
    // contaminaría. Se asertan las dos caras: la copia cambió, el original no.
    snapshot.previousState.globals.townHall.level = 3;

    expect(snapshot.previousState.globals.townHall.level).toBe(3);
    expect(state.globals.townHall.level).toBe(1);
  });
});

import { describe, expect, it } from 'vitest';
import type { GameState } from '../../types';
import { createDayZeroState } from '../../entities/dayZero';
import { completeTask } from '../../entities/task';
import { createUndoSnapshot } from '../undoSnapshot';
import { undoAction } from '../undoAction';

const START = 1_700_000_000_000;
const COMPLEX_TASK = 'tutorial-complex-task-id';

function dayZeroState(): GameState {
  return createDayZeroState(START);
}

describe('undoAction — US-12 CA-02: reversibilidad manual', () => {
  it('devuelve exactamente el estado previo a la acción que se quiere deshacer', () => {
    const before = dayZeroState();
    const snapshot = createUndoSnapshot(before, 'action-1', 'Tarea completada', START);

    const afterCompletion = completeTask(before, COMPLEX_TASK, START);

    // Sanity del escenario: sin este control el test pasaria aunque completeTask no hiciera nada.
    expect(afterCompletion).not.toEqual(before);

    const result = undoAction(snapshot, START);

    // `toEqual` cubre monedas, progreso de urbanización, tablero y suministros:
    // la reversión no elige qué restaurar, devuelve el estado previo completo.
    expect(result).toEqual({ status: 'UNDONE', state: before });
  });

  it('devuelve la tarea deshecha a su estado de tablero anterior', () => {
    const before = dayZeroState();
    const snapshot = createUndoSnapshot(before, 'action-2', 'Tarea completada', START);

    const afterCompletion = completeTask(before, COMPLEX_TASK, START);
    expect(afterCompletion.tasks[COMPLEX_TASK]).toMatchObject({ boardStatus: 'COMPLETED' });

    const result = undoAction(snapshot, START);

    if (result.status !== 'UNDONE') throw new Error('esperaba la reversión');

    expect(result.state.tasks[COMPLEX_TASK]).toMatchObject({
      boardStatus: 'IN_CONSTRUCTION',
      completedAt: null,
    });
  });
});

describe('undoAction — US-13 CA-02: rechazo fuera de la ventana de 5 minutos', () => {
  it('rechaza la reversión cuando now superó expiresAt', () => {
    const before = dayZeroState();
    const snapshot = createUndoSnapshot(before, 'action-1', 'Tarea completada', START);

    const result = undoAction(snapshot, snapshot.expiresAt + 1);

    expect(result).toEqual({ status: 'REJECTED', reason: 'UNDO_WINDOW_EXPIRED' });
  });

  it('acepta la reversión en el borde exacto de la ventana', () => {
    const before = dayZeroState();
    const snapshot = createUndoSnapshot(before, 'action-1', 'Tarea completada', START);

    const result = undoAction(snapshot, snapshot.expiresAt);

    expect(result).toEqual({ status: 'UNDONE', state: before });
  });
});

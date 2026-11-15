import { describe, expect, it } from 'vitest';
import { createDayZeroState } from '../../entities/dayZero';
import type { EntityId, GameState, Neighborhood } from '../../types';
import { calculateTick } from '../calculateTick';

const TUTORIAL = 'tutorial-neighborhood-id';
const GYM = 'gym-neighborhood-id';

/** Construye un timestamp desde una fecha LOCAL explícita (mes 1-12). */
function atLocal(year: number, month: number, day: number, hour: number, minute = 0): number {
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
}

const EVENING = atLocal(2026, 1, 15, 22, 0);
const SAME_DAY_LATER = atLocal(2026, 1, 15, 23, 30);
const NEXT_MORNING = atLocal(2026, 1, 16, 5, 0);

function mustNeighborhood(state: GameState, id: EntityId): Neighborhood {
  const neighborhood = state.neighborhoods[id];
  if (!neighborhood) {
    throw new Error(`Barrio inexistente en el fixture: ${id}`);
  }
  return neighborhood;
}

/** Día de trabajo: dos barrios con contadores sucios, litros del día y tareas en distintos estados. */
function seedDayOfWork(): GameState {
  const state = createDayZeroState(EVENING);
  const tutorial = mustNeighborhood(state, TUTORIAL);

  return {
    ...state,
    globals: {
      ...state.globals,
      aqueduct: { ...state.globals.aqueduct, dailyLiters: 1.5 },
    },
    neighborhoods: {
      ...state.neighborhoods,
      [TUTORIAL]: { ...tutorial, dailyTasksCompletedCount: 3 },
      [GYM]: {
        ...tutorial,
        name: 'GYM',
        isTutorial: false,
        treasuryCoins: 0,
        urbanizationProgress: 0,
        dailyTasksCompletedCount: 2,
        blocks: [{ gridPosition: { x: 0, y: 0 }, houses: [], isLeveled: false }],
      },
    },
    tasks: {
      ...state.tasks,
      'in-construction-task': {
        neighborhoodId: GYM,
        title: 'Activa',
        weight: 'STANDARD',
        boardStatus: 'IN_CONSTRUCTION',
        createdAt: EVENING,
        completedAt: null,
      },
      'completed-task': {
        neighborhoodId: GYM,
        title: 'Cerrada',
        weight: 'SIMPLE',
        boardStatus: 'COMPLETED',
        createdAt: EVENING,
        completedAt: EVENING,
      },
    },
  };
}

describe('calculateTick — US-05 CA-02: transición de jornada y reciclaje', () => {
  it('no muta el estado si el día operativo no cambió', () => {
    const state = seedDayOfWork();

    expect(calculateTick(state, SAME_DAY_LATER)).toEqual(state);
  });

  it('devuelve las tareas En Obra al Plano Maestro y respeta las completadas', () => {
    const next = calculateTick(seedDayOfWork(), NEXT_MORNING);

    expect(next.tasks['in-construction-task']?.boardStatus).toBe('MASTER_PLAN');
    expect(next.tasks['tutorial-complex-task-id']?.boardStatus).toBe('MASTER_PLAN');
    expect(next.tasks['completed-task']?.boardStatus).toBe('COMPLETED');
  });

  it('resetea contadores diarios y litros, y avanza el día operativo global y por barrio', () => {
    const next = calculateTick(seedDayOfWork(), NEXT_MORNING);

    expect(next.globals.aqueduct.dailyLiters).toBe(0);
    expect(next.lastOperationalDay).toBe('2026-01-16');
    expect(next.neighborhoods[TUTORIAL]?.lastOperationalDay).toBe('2026-01-16');
    expect(next.neighborhoods[GYM]?.lastOperationalDay).toBe('2026-01-16');

    for (const neighborhood of Object.values(next.neighborhoods)) {
      expect(neighborhood.dailyTasksCompletedCount).toBe(0);
    }
  });

  it('no aplica penalizaciones: tesorería, urbanización y XP quedan intactos', () => {
    const state = seedDayOfWork();
    const next = calculateTick(state, NEXT_MORNING);

    expect(next.neighborhoods[TUTORIAL]?.treasuryCoins).toBe(500);
    expect(next.neighborhoods[TUTORIAL]?.urbanizationProgress).toBe(50);
    expect(next.globals.townHall).toEqual(state.globals.townHall);
  });

  it('no adelanta lastTickAt: la producción pasiva queda impaga para US-07 (DEC-016)', () => {
    const state = seedDayOfWork();

    expect(calculateTick(state, NEXT_MORNING).lastTickAt).toBe(state.lastTickAt);
  });
});

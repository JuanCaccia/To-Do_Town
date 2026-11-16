import { describe, expect, it } from 'vitest';
import { createDayZeroState } from '../dayZero';
import { createNeighborhood } from '../neighborhood';

const NOW = 1_700_000_000_000;

const INPUT = { id: 'gym-neighborhood-id', name: 'GYM', paletteId: 'MINT_MORNING' };

describe('createNeighborhood — US-02 CA-01: barrio personalizado con cuadra inicial', () => {
  it('registra el barrio en cero, en nivel rústico y con su primera cuadra vacía', () => {
    const state = createDayZeroState(NOW);

    const next = createNeighborhood(state, INPUT);

    expect(next.neighborhoods[INPUT.id]).toEqual({
      name: 'GYM',
      paletteId: 'MINT_MORNING',
      architecturalThemeId: 'CLASSIC_DIORAMA',
      infrastructureLevel: 1,
      treasuryCoins: 0,
      pendingCoinsRemainder: 0,
      urbanizationProgress: 0,
      dailyTasksCompletedCount: 0,
      lastOperationalDay: state.lastOperationalDay,
      reactivationPenaltyUntil: null,
      decorations: [],
      blocks: [
        {
          gridPosition: { x: 0, y: 0 },
          houses: [],
          isLeveled: false,
        },
      ],
    });
  });

  it('no muta el estado de entrada', () => {
    const state = createDayZeroState(NOW);
    const before = structuredClone(state);

    createNeighborhood(state, INPUT);

    expect(state).toEqual(before);
    expect(state.neighborhoods[INPUT.id]).toBeUndefined();
  });
});

describe('createNeighborhood — US-00 CA-05: autodestrucción del Barrio Tutorial', () => {
  it('elimina el tutorial con su hábito y sus tareas al crear el primer barrio real', () => {
    const state = createDayZeroState(NOW);

    const next = createNeighborhood(state, INPUT);

    const neighborhood = next.neighborhoods[INPUT.id];
    expect(Object.keys(next.neighborhoods)).toEqual([INPUT.id]);
    expect(neighborhood?.isTutorial).toBeUndefined();
    expect(next.habits).toEqual({});
    expect(next.tasks).toEqual({});
  });

  it('no deja entidades huérfanas apuntando a barrios inexistentes', () => {
    const next = createNeighborhood(createDayZeroState(NOW), INPUT);

    const orphanHabits = Object.values(next.habits).filter(
      (habit) => next.neighborhoods[habit.neighborhoodId] === undefined,
    );
    const orphanTasks = Object.values(next.tasks).filter(
      (task) => next.neighborhoods[task.neighborhoodId] === undefined,
    );

    expect(orphanHabits).toHaveLength(0);
    expect(orphanTasks).toHaveLength(0);
  });

  it('al crear un segundo barrio conserva el primero y sus entidades', () => {
    const first = createNeighborhood(createDayZeroState(NOW), INPUT);
    const withTask = {
      ...first,
      tasks: {
        'gym-task-id': {
          neighborhoodId: INPUT.id,
          title: 'Resumir unidad 1',
          weight: 'STANDARD',
          boardStatus: 'MASTER_PLAN',
          createdAt: NOW,
          completedAt: null,
        },
      },
    } as const;

    const second = createNeighborhood(withTask, {
      id: 'studio-neighborhood-id',
      name: 'Estudio',
      paletteId: 'OCEAN_BLUE',
    });

    expect(Object.keys(second.neighborhoods).sort()).toEqual(['gym-neighborhood-id', 'studio-neighborhood-id']);
    expect(Object.keys(second.tasks)).toEqual(['gym-task-id']);
  });
});

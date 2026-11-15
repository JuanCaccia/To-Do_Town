import { describe, expect, it } from 'vitest';
import type { GameState, TaskWeight } from '../../types';
import { createDayZeroState } from '../dayZero';
import { createNeighborhood } from '../neighborhood';
import { createTask, moveTask, completeTask, updateTask, deleteTask } from '../task';

const NOW = 1_700_000_000_000;
const ID = 'gym-neighborhood-id';

function createCity(): GameState {
  return createNeighborhood(createDayZeroState(NOW), {
    id: ID,
    name: 'GYM',
    paletteId: 'MINT_MORNING',
  });
}

describe('createTask — US-04 CA-01: alta de tarea única en el Plano Maestro', () => {
  it('registra la tarea en MASTER_PLAN vinculada al barrio con createdAt igual a now', () => {
    const state = createCity();

    const next = createTask(
      state,
      { id: 'task-summarize-unit-1', neighborhoodId: ID, title: 'Resumir unidad 1', weight: 'COMPLEX' },
      NOW,
    );

    expect(next.tasks['task-summarize-unit-1']).toEqual({
      neighborhoodId: ID,
      title: 'Resumir unidad 1',
      weight: 'COMPLEX',
      boardStatus: 'MASTER_PLAN',
      createdAt: NOW,
      completedAt: null,
    });
  });

  it('conserva las tareas ya registradas y no muta el estado recibido', () => {
    const state = createCity();
    const withFirst = createTask(
      state,
      { id: 'task-a', neighborhoodId: ID, title: 'A', weight: 'SIMPLE' },
      NOW,
    );

    const next = createTask(
      withFirst,
      { id: 'task-b', neighborhoodId: ID, title: 'B', weight: 'STANDARD' },
      NOW,
    );

    expect(Object.keys(next.tasks).sort()).toEqual(['task-a', 'task-b']);
    expect(next.tasks['task-a']).toEqual(withFirst.tasks['task-a']);
    expect(state.tasks['task-a']).toBeUndefined();
  });

  it('acepta los tres pesos del dominio sin alterar el estado de tablero por defecto', () => {
    const weights: TaskWeight[] = ['SIMPLE', 'STANDARD', 'COMPLEX'];

    const next = weights.reduce(
      (current, weight, index) =>
        createTask(
          current,
          { id: `task-${index}`, neighborhoodId: ID, title: weight, weight },
          NOW,
        ),
      createCity(),
    );

    weights.forEach((weight, index) => {
      expect(next.tasks[`task-${index}`]?.weight).toBe(weight);
      expect(next.tasks[`task-${index}`]?.boardStatus).toBe('MASTER_PLAN');
    });
  });
});

describe('moveTask — US-04 CA-02: movimiento entre Plano Maestro y En Obra', () => {
  function createCityWithTask(): GameState {
    return createTask(
      createCity(),
      { id: 'task-a', neighborhoodId: ID, title: 'Resumir unidad 1', weight: 'COMPLEX' },
      NOW,
    );
  }

  it('activa en En Obra una tarea del Plano Maestro conservando peso, título y fecha', () => {
    const state = createCityWithTask();

    const next = moveTask(state, 'task-a', 'IN_CONSTRUCTION');

    expect(next.tasks['task-a']).toEqual({
      ...state.tasks['task-a'],
      boardStatus: 'IN_CONSTRUCTION',
    });
    expect(next.tasks['task-a']?.weight).toBe('COMPLEX');
    expect(next.tasks['task-a']?.title).toBe('Resumir unidad 1');
    expect(next.tasks['task-a']?.createdAt).toBe(NOW);
  });

  it('devuelve al Plano Maestro una tarea que estaba en En Obra', () => {
    const active = moveTask(createCityWithTask(), 'task-a', 'IN_CONSTRUCTION');

    const next = moveTask(active, 'task-a', 'MASTER_PLAN');

    expect(next.tasks['task-a']?.boardStatus).toBe('MASTER_PLAN');
    expect(next.tasks['task-a']?.createdAt).toBe(NOW);
  });

  it('no altera los contadores del barrio ni las demás tareas', () => {
    const withTwo = createTask(
      createCityWithTask(),
      { id: 'task-b', neighborhoodId: ID, title: 'Otra tarea', weight: 'SIMPLE' },
      NOW,
    );
    const before = structuredClone(withTwo);

    const next = moveTask(withTwo, 'task-a', 'IN_CONSTRUCTION');

    expect(next.tasks['task-b']).toEqual(before.tasks['task-b']);
    expect(next.neighborhoods[ID]?.dailyTasksCompletedCount).toBe(0);
    expect(withTwo).toEqual(before);
  });

  it('no reabre una tarea completada', () => {
    const active = moveTask(createCityWithTask(), 'task-a', 'IN_CONSTRUCTION');
    const completed = completeTask(active, 'task-a', NOW);

    const next = moveTask(completed, 'task-a', 'IN_CONSTRUCTION');

    expect(next).toEqual(completed);
    expect(next.tasks['task-a']?.boardStatus).toBe('COMPLETED');
  });
});

describe('completeTask — US-04 CA-03: completado en tramo óptimo', () => {
  function createCityWithActiveTask(weight: TaskWeight = 'COMPLEX', progress = 0): GameState {
    const withTask = createTask(
      createCity(),
      { id: 'task-a', neighborhoodId: ID, title: 'Resumir unidad 1', weight },
      NOW,
    );
    const active = moveTask(withTask, 'task-a', 'IN_CONSTRUCTION');
    const neighborhood = active.neighborhoods[ID];

    if (neighborhood !== undefined) {
      neighborhood.urbanizationProgress = progress;
    }

    return active;
  }

  it('marca la tarea como completada y acredita monedas, urbanización y contador', () => {
    const state = createCityWithActiveTask('COMPLEX');

    const next = completeTask(state, 'task-a', NOW);

    const neighborhood = next.neighborhoods[ID];

    expect(next.tasks['task-a']).toEqual({ ...state.tasks['task-a'], boardStatus: 'COMPLETED', completedAt: NOW });
    expect(neighborhood?.treasuryCoins).toBe(100);
    expect(neighborhood?.urbanizationProgress).toBe(50);
    expect(neighborhood?.dailyTasksCompletedCount).toBe(1);
  });

  it('escala la recompensa según el peso: SIMPLE +20/+10 y STANDARD +50/+25', () => {
    const simple = completeTask(createCityWithActiveTask('SIMPLE'), 'task-a', NOW);
    const standard = completeTask(createCityWithActiveTask('STANDARD'), 'task-a', NOW);

    expect(simple.neighborhoods[ID]?.treasuryCoins).toBe(20);
    expect(simple.neighborhoods[ID]?.urbanizationProgress).toBe(10);
    expect(standard.neighborhoods[ID]?.treasuryCoins).toBe(50);
    expect(standard.neighborhoods[ID]?.urbanizationProgress).toBe(25);
  });

  it('al cruzar el 100% dispara la casa de US-03 y no duplica el XP del Ayuntamiento', () => {
    const state = createCityWithActiveTask('COMPLEX', 75);

    const next = completeTask(state, 'task-a', NOW);

    const neighborhood = next.neighborhoods[ID];

    expect(neighborhood?.urbanizationProgress).toBe(25);
    expect(neighborhood?.blocks[0]?.houses).toHaveLength(1);
    expect(neighborhood?.blocks[0]?.houses[0]?.createdAt).toBe(NOW);
    expect(next.globals.townHall.qualityOfLifeXP).toBe(10);
  });

  it('el contador global es la suma de los contadores de todos los barrios', () => {
    const gym = createCityWithActiveTask('SIMPLE');
    const both = createNeighborhood(gym, {
      id: 'studio-neighborhood-id',
      name: 'Estudio',
      paletteId: 'OCEAN_BLUE',
    });

    const next = completeTask(both, 'task-a', NOW);

    const counts = Object.values(next.neighborhoods)
      .map((neighborhood) => neighborhood.dailyTasksCompletedCount)
      .sort();

    expect(counts).toEqual([0, 1]);
    expect(next.neighborhoods['studio-neighborhood-id']?.treasuryCoins).toBe(0);
  });

  it('no vuelve a acreditar una tarea ya completada', () => {
    const once = completeTask(createCityWithActiveTask('COMPLEX'), 'task-a', NOW);

    const twice = completeTask(once, 'task-a', NOW);

    expect(twice).toEqual(once);
    expect(twice.neighborhoods[ID]?.treasuryCoins).toBe(100);
    expect(twice.neighborhoods[ID]?.urbanizationProgress).toBe(50);
    expect(twice.neighborhoods[ID]?.dailyTasksCompletedCount).toBe(1);
    expect(twice.globals.townHall.qualityOfLifeXP).toBe(0);
  });
});

describe('updateTask / deleteTask — US-04 CA-04: edición y borrado de tareas pendientes', () => {
  function createCityInStatus(status: 'MASTER_PLAN' | 'IN_CONSTRUCTION' | 'COMPLETED'): GameState {
    const created = createTask(
      createCity(),
      { id: 'task-a', neighborhoodId: ID, title: 'Resumir unidad 1', weight: 'STANDARD' },
      NOW,
    );
    const active = status === 'MASTER_PLAN' ? created : moveTask(created, 'task-a', 'IN_CONSTRUCTION');

    return status === 'COMPLETED' ? completeTask(active, 'task-a', NOW) : active;
  }

  it('actualiza el título de una tarea del Plano Maestro sin tocar economía', () => {
    const state = createCityInStatus('MASTER_PLAN');

    const next = updateTask(state, 'task-a', { title: 'Resumir unidad 2' });

    expect(next.tasks['task-a']).toEqual({ ...state.tasks['task-a'], title: 'Resumir unidad 2' });
    expect(next.neighborhoods[ID]?.treasuryCoins).toBe(state.neighborhoods[ID]?.treasuryCoins);
    expect(next.neighborhoods[ID]?.urbanizationProgress).toBe(0);
  });

  it('actualiza el peso de una tarea que está en En Obra sin alterar su tablero', () => {
    const state = createCityInStatus('IN_CONSTRUCTION');

    const next = updateTask(state, 'task-a', { weight: 'COMPLEX' });

    expect(next.tasks['task-a']?.weight).toBe('COMPLEX');
    expect(next.tasks['task-a']?.boardStatus).toBe('IN_CONSTRUCTION');
    expect(next.tasks['task-a']?.createdAt).toBe(NOW);
  });

  it('no edita una tarea completada', () => {
    const state = createCityInStatus('COMPLETED');

    const next = updateTask(state, 'task-a', { title: 'Otro título', weight: 'SIMPLE' });

    expect(next).toEqual(state);
  });

  it('elimina una tarea pendiente sin otorgar ni descontar monedas ni urbanización', () => {
    const state = createCityInStatus('MASTER_PLAN');

    const next = deleteTask(state, 'task-a');

    expect(next.tasks['task-a']).toBeUndefined();
    expect(Object.keys(next.tasks)).toHaveLength(0);
    expect(next.neighborhoods[ID]?.treasuryCoins).toBe(0);
    expect(next.neighborhoods[ID]?.urbanizationProgress).toBe(0);
    expect(next.neighborhoods[ID]?.dailyTasksCompletedCount).toBe(0);
  });

  it('no elimina una tarea completada', () => {
    const state = createCityInStatus('COMPLETED');

    const next = deleteTask(state, 'task-a');

    expect(next.tasks['task-a']).toEqual(state.tasks['task-a']);
  });
});

describe('completeTask — US-05 CA-04: recompensa escalada por fatiga laboral', () => {
  function mustNeighborhood(state: GameState, id: string) {
    const neighborhood = state.neighborhoods[id];
    if (!neighborhood) {
      throw new Error(`Barrio inexistente en el fixture: ${id}`);
    }
    return neighborhood;
  }

  function activeComplexTask(): GameState {
    return moveTask(
      createTask(
        createCity(),
        { id: 'active-task', neighborhoodId: ID, title: 'Activa', weight: 'COMPLEX' },
        NOW,
      ),
      'active-task',
      'IN_CONSTRUCTION',
    );
  }

  /** Siembra contadores y litros del día sin pasar por las reglas que los producen. */
  function seed(state: GameState, local: number, other: number, liters: number): GameState {
    const gym = mustNeighborhood(state, ID);
    const neighborhoods: GameState['neighborhoods'] = {
      ...state.neighborhoods,
      [ID]: { ...gym, dailyTasksCompletedCount: local },
    };

    if (other > 0) {
      neighborhoods['other-neighborhood-id'] = {
        ...gym,
        name: 'ESTUDIO',
        dailyTasksCompletedCount: other,
      };
    }

    return {
      ...state,
      globals: {
        ...state.globals,
        aqueduct: { ...state.globals.aqueduct, dailyLiters: liters },
      },
      neighborhoods,
    };
  }

  it('en agotamiento local la tarea COMPLEX paga 10% de monedas y de barra', () => {
    const next = completeTask(seed(activeComplexTask(), 10, 0, 0), 'active-task', NOW);

    expect(next.neighborhoods[ID]?.treasuryCoins).toBeCloseTo(10, 10);
    expect(next.neighborhoods[ID]?.urbanizationProgress).toBeCloseTo(5, 10);
  });

  it('la estamina global manda cuando el barrio está limpio', () => {
    const next = completeTask(seed(activeComplexTask(), 0, 14, 0), 'active-task', NOW);

    expect(next.neighborhoods[ID]?.treasuryCoins).toBeCloseTo(10, 10);
  });

  it('el bono de agua amplía el tramo local del barrio', () => {
    const withWater = completeTask(seed(activeComplexTask(), 5, 0, 2), 'active-task', NOW);
    const withoutWater = completeTask(seed(activeComplexTask(), 5, 0, 0), 'active-task', NOW);

    expect(withWater.neighborhoods[ID]?.treasuryCoins).toBeCloseTo(100, 10);
    expect(withoutWater.neighborhoods[ID]?.treasuryCoins).toBeCloseTo(50, 10);
  });

  it('el contador diario sube igual aunque la recompensa sea simbólica', () => {
    const next = completeTask(seed(activeComplexTask(), 10, 0, 0), 'active-task', NOW);

    expect(next.neighborhoods[ID]?.dailyTasksCompletedCount).toBe(11);
  });
});

import { describe, expect, it } from 'vitest';
import type { GameState } from '../../types';
import { createDayZeroState } from '../dayZero';

const NOW = 1_700_000_000_000;

/** Construye un timestamp desde una fecha LOCAL explícita (mes 1-12). */
function atLocal(year: number, month: number, day: number, hour: number, minute: number): number {
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
}

function dayZeroNeighborhood(state: GameState) {
  const neighborhood = state.neighborhoods['tutorial-neighborhood-id'];
  if (!neighborhood) {
    throw new Error('El Barrio Tutorial no existe en el estado del Día Cero');
  }

  const [block] = neighborhood.blocks;
  if (!block) {
    throw new Error('El Barrio Tutorial no tiene cuadra inicial');
  }

  return { neighborhood, block };
}

describe('createDayZeroState — US-00 CA-01: inicialización de cuenta, reloj y configuración', () => {
  it('nace con la ciudad activa y el reloj anclado a now', () => {
    const state = createDayZeroState(NOW);

    expect(state.cityStatus).toBe('ACTIVE');
    expect(state.lastTickAt).toBe(NOW);
    expect(state.lastUserInteractionAt).toBe(NOW);
  });

  it('configura la cuenta local por defecto', () => {
    const state = createDayZeroState(NOW);

    expect(state.account).toEqual({
      userId: 'local-owner',
      planTier: 'PERSONAL_DEV',
      cloudSyncEnabled: false,
      unlockedThemes: ['CLASSIC_DIORAMA'],
    });
  });

  it('configura el ciclo de día con corte a las 00:00 y 4 horas de gracia', () => {
    const state = createDayZeroState(NOW);

    expect(state.config.dayCycle.dayCutoffHour).toBe(0);
    expect(state.config.dayCycle.gracePeriodHours).toBe(4);
  });

  it('siembra los dos presets Pomodoro por defecto con 4 ciclos', () => {
    const state = createDayZeroState(NOW);

    const presets = state.config.pomodoroPresets.map((preset) => ({
      workMinutes: preset.workMinutes,
      shortBreakMinutes: preset.shortBreakMinutes,
      cyclesBeforeLongBreak: preset.cyclesBeforeLongBreak,
    }));

    expect(presets).toEqual([
      { workMinutes: 25, shortBreakMinutes: 5, cyclesBeforeLongBreak: 4 },
      { workMinutes: 50, shortBreakMinutes: 15, cyclesBeforeLongBreak: 4 },
    ]);
  });
});

describe('createDayZeroState — US-00 CA-02: núcleo cívico en Nivel 1', () => {
  it('nace con el Ayuntamiento en Nivel 1 y 0 XP de Calidad de Vida', () => {
    const state = createDayZeroState(NOW);

    expect(state.globals.townHall).toEqual({ level: 1, qualityOfLifeXP: 0 });
  });

  it('nace con la Gran Biblioteca en Nivel 1 y 0 páginas leídas', () => {
    const state = createDayZeroState(NOW);

    expect(state.globals.library).toEqual({ level: 1, totalPagesRead: 0 });
  });

  it('nace con el Acueducto Central en Nivel 1, 0 litros y meta diaria de 2.0 L', () => {
    const state = createDayZeroState(NOW);

    expect(state.globals.aqueduct).toEqual({
      level: 1,
      totalHistoricalLiters: 0,
      dailyLiters: 0,
      dailyTargetLiters: 2.0,
      lastOperationalDay: expect.any(String),
    });
  });

  it('calcula lastOperationalDay según now y el corte de día con gracia', () => {
    const beforeGraceEnds = createDayZeroState(atLocal(2026, 1, 15, 2, 0));
    const afterGraceEnds = createDayZeroState(atLocal(2026, 1, 15, 5, 0));

    // Corte 00:00 + 4 h de gracia: a las 02:00 la jornada todavía es la del día 14.
    expect(beforeGraceEnds.globals.aqueduct.lastOperationalDay).toBe('2026-01-14');
    expect(afterGraceEnds.globals.aqueduct.lastOperationalDay).toBe('2026-01-15');
  });
});

describe('createDayZeroState — US-00 CA-03: semilla del Barrio Tutorial', () => {
  it('crea exactamente un barrio, con id único y determinista', () => {
    const state = createDayZeroState(NOW);

    expect(Object.keys(state.neighborhoods)).toEqual(['tutorial-neighborhood-id']);
  });

  it('nace con nombre, infraestructura, tesorería y urbanización del tutorial', () => {
    const state = createDayZeroState(NOW);
    const { neighborhood } = dayZeroNeighborhood(state);

    expect(neighborhood.name).toBe('Barrio Tutorial');
    expect(neighborhood.isTutorial).toBe(true);
    expect(neighborhood.infrastructureLevel).toBe(1);
    expect(neighborhood.treasuryCoins).toBe(500);
    expect(neighborhood.urbanizationProgress).toBe(50);
  });

  it('inaugura una única cuadra sin nivelar en el origen', () => {
    const state = createDayZeroState(NOW);
    const { neighborhood, block } = dayZeroNeighborhood(state);

    expect(neighborhood.blocks).toHaveLength(1);
    expect(block.gridPosition).toEqual({ x: 0, y: 0 });
    expect(block.isLeveled).toBe(false);
  });

  it('siembra 3 casas en los lotes 0, 1 y 2 con variantes deterministas', () => {
    const state = createDayZeroState(NOW);
    const { block } = dayZeroNeighborhood(state);

    const layout = block.houses.map((house) => [house.lotIndex, house.designVariant]);

    expect(block.houses).toHaveLength(3);
    expect(layout).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
    ]);
  });
});

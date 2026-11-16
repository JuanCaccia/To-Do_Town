import { describe, expect, it } from 'vitest';
import type { GameState, HabitBuilding, HabitFrequency, Neighborhood, TimestampMs } from '../../types';
import { createDayZeroState } from '../../entities/dayZero';
import { createHabit } from '../../entities/habit';
import { createNeighborhood } from '../../entities/neighborhood';
import { settlePassiveProduction } from '../passiveProduction';

const NOW = 1_700_000_000_000;
const HOUR = 3_600_000;

const GYM = { id: 'gym-neighborhood-id', name: 'GYM', paletteId: 'MINT_MORNING' };
const STUDIO = { id: 'studio-neighborhood-id', name: 'Estudio', paletteId: 'MINT_MORNING' };
const HABIT_ID = 'strength-habit-id';

const weekly = (count: number): HabitFrequency => ({ type: 'TIMES_PER_WEEK', count });
const DAILY: HabitFrequency = { type: 'DAILY' };

interface Setup {
  frequency?: HabitFrequency;
  habitStatus?: HabitBuilding['status'];
  level?: Neighborhood['infrastructureLevel'];
  /** Horas transcurridas desde el último cumplimiento hasta NOW. */
  completedHoursAgo?: number | null;
  /** Horas transcurridas desde la creación del hábito hasta NOW (30 días por defecto). */
  createdHoursAgo?: number;
  /** Horas transcurridas desde la última liquidación hasta NOW. */
  lastTickHoursAgo: number;
  treasury?: number;
  remainder?: number;
  reactivationPenaltyUntil?: TimestampMs | null;
  cityStatus?: GameState['cityStatus'];
  extraNeighborhood?: { id: string; name: string; paletteId: string };
}

function stateWithHabit(setup: Setup): GameState {
  const base = createNeighborhood(createDayZeroState(NOW), GYM);
  const created = createHabit(
    base,
    {
      id: HABIT_ID,
      neighborhoodId: GYM.id,
      title: 'Entrenar Fuerza',
      frequency: setup.frequency ?? DAILY,
    },
    NOW,
  );

  if (created.status !== 'CREATED') throw new Error('setup: el alta del hábito falló');

  const withStudio = setup.extraNeighborhood
    ? createNeighborhood(created.state, setup.extraNeighborhood)
    : created.state;

  const neighborhood = withStudio.neighborhoods[GYM.id]!;
  const habit = withStudio.habits[HABIT_ID]!;

  return {
    ...withStudio,
    cityStatus: setup.cityStatus ?? 'ACTIVE',
    lastTickAt: NOW - setup.lastTickHoursAgo * HOUR,
    neighborhoods: {
      ...withStudio.neighborhoods,
      [GYM.id]: {
        ...neighborhood,
        infrastructureLevel: setup.level ?? 1,
        treasuryCoins: setup.treasury ?? 0,
        pendingCoinsRemainder: setup.remainder ?? 0,
        reactivationPenaltyUntil: setup.reactivationPenaltyUntil ?? null,
      },
    },
    habits: {
      ...withStudio.habits,
      [HABIT_ID]: {
        ...habit,
        status: setup.habitStatus ?? 'ACTIVE',
        createdAt: NOW - (setup.createdHoursAgo ?? 30 * 24) * HOUR,
        lastCompletedAt:
          setup.completedHoursAgo === null ? null : NOW - (setup.completedHoursAgo ?? 0) * HOUR,
      },
    },
  };
}

function gymOf(state: GameState): Neighborhood {
  const neighborhood = state.neighborhoods[GYM.id];
  if (!neighborhood) throw new Error('fixture: falta el barrio GYM');
  return neighborhood;
}

describe('settlePassiveProduction — US-07 CA-03: liquidación determinista por intervalo', () => {
  it('acredita 5 monedas por hora en Pleno y adelanta lastTickAt al instante liquidado', () => {
    const state = stateWithHabit({ lastTickHoursAgo: 10, completedHoursAgo: 10 });

    const next = settlePassiveProduction(state, NOW);

    expect(gymOf(next).treasuryCoins).toBe(50);
    expect(gymOf(next).pendingCoinsRemainder).toBe(0);
    expect(next.lastTickAt).toBe(NOW);
  });

  // T = 68 h para weekly(3) en Nv.1: el intervalo cruza el corte de las 34 h.
  // 34 h al 100% = 170 y 6 h al 66% = 20. El total matemático es 190 exacto, y
  // el acumulador no puede perder una moneda por error de coma flotante.
  it('parte el intervalo en los cortes reales de eficiencia y acredita el total exacto', () => {
    const state = stateWithHabit({
      frequency: weekly(3),
      lastTickHoursAgo: 40,
      completedHoursAgo: 40,
    });

    const next = settlePassiveProduction(state, NOW);

    expect(gymOf(next).treasuryCoins).toBe(190);
    expect(gymOf(next).pendingCoinsRemainder).toBe(0);
  });

  it('retiene la fracción en el acumulador en lugar de redondearla', () => {
    const state = stateWithHabit({ lastTickHoursAgo: 0.5, completedHoursAgo: 0.5 });

    const next = settlePassiveProduction(state, NOW);

    expect(gymOf(next).treasuryCoins).toBe(2);
    expect(gymOf(next).pendingCoinsRemainder).toBeCloseTo(0.5, 10);
  });

  it('suma el resto pendiente y acredita la moneda entera cuando el acumulador cruza 1.0', () => {
    const first = settlePassiveProduction(
      stateWithHabit({ lastTickHoursAgo: 0.5, completedHoursAgo: 0.5 }),
      NOW,
    );

    const second = settlePassiveProduction(first, NOW + 0.5 * HOUR);

    expect(gymOf(second).treasuryCoins).toBe(5);
    expect(gymOf(second).pendingCoinsRemainder).toBe(0);
  });

  it('aplica el multiplicador 0.5 de Arranque de Motores mientras la penalización esté vigente', () => {
    const state = stateWithHabit({
      lastTickHoursAgo: 10,
      completedHoursAgo: 10,
      reactivationPenaltyUntil: NOW + HOUR,
    });

    const next = settlePassiveProduction(state, NOW);

    expect(gymOf(next).treasuryCoins).toBe(25);
  });

  it('no acredita nada en Apagón y deja el estado idéntico: un latido sin mutación no es evento', () => {
    const state = stateWithHabit({ lastTickHoursAgo: 1, completedHoursAgo: 30 });

    const next = settlePassiveProduction(state, NOW);

    expect(next).toBe(state);
  });

  // Un `lastTickAt` viejo no puede pagarle a un hábito por tiempo en el que no
  // existía: sin el recorte en `createdAt`, crear un hábito sembraría monedas.
  it('no devenga tiempo anterior a la creación del hábito', () => {
    const state = stateWithHabit({
      lastTickHoursAgo: 10,
      completedHoursAgo: 0,
      createdHoursAgo: 0,
    });

    const next = settlePassiveProduction(state, NOW);

    expect(gymOf(next).treasuryCoins).toBe(0);
    expect(gymOf(next).pendingCoinsRemainder).toBe(0);
  });

  it('no liquida con la ciudad en pausa manual', () => {
    const state = stateWithHabit({
      lastTickHoursAgo: 10,
      completedHoursAgo: 10,
      cityStatus: 'MANUAL_PAUSE',
    });

    const next = settlePassiveProduction(state, NOW);

    expect(gymOf(next).treasuryCoins).toBe(0);
    expect(gymOf(next).pendingCoinsRemainder).toBe(0);
  });

  it('mantiene el acumulador aislado por barrio', () => {
    const state = stateWithHabit({
      lastTickHoursAgo: 0.5,
      completedHoursAgo: 0.5,
      extraNeighborhood: STUDIO,
    });

    const next = settlePassiveProduction(state, NOW);

    expect(gymOf(next).treasuryCoins).toBe(2);
    expect(gymOf(next).pendingCoinsRemainder).toBeCloseTo(0.5, 10);
    expect(next.neighborhoods[STUDIO.id]?.treasuryCoins).toBe(0);
    expect(next.neighborhoods[STUDIO.id]?.pendingCoinsRemainder).toBe(0);
  });
});

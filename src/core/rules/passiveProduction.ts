import type {
  EntityId,
  GameState,
  HabitBuilding,
  Neighborhood,
  TimestampMs,
} from '../types';
import { HABIT_COINS_PER_HOUR, REACTIVATION_PENALTY_MULTIPLIER } from '../constants/economyConstants';
import { getHabitEfficiencyBoundaries, getHabitEfficiencyRatio } from './habitEfficiency';

const MS_PER_HOUR = 3_600_000;

/**
 * US-07 CA-03 / DEC-018: liquida la producción pasiva devengada entre
 * `state.lastTickAt` y `now`.
 *
 * La fracción devengada se acumula por barrio (ECONOMY §2.1.2) y sólo se
 * acredita cuando cruza una moneda entera. Si nada mutó, devuelve **la misma
 * referencia**: un latido sin producción no es un evento de negocio y no debe
 * adelantar `lastTickAt`.
 */
export function settlePassiveProduction(state: GameState, now: TimestampMs): GameState {
  if (state.cityStatus !== 'ACTIVE') {
    return state;
  }

  const intervalStart = state.lastTickAt;

  if (now <= intervalStart) {
    return state;
  }

  const neighborhoods: GameState['neighborhoods'] = {};
  let changed = false;

  for (const [id, neighborhood] of Object.entries(state.neighborhoods)) {
    const earned = neighborhoodYield(state.habits, id, neighborhood, intervalStart, now);
    const accumulated = neighborhood.pendingCoinsRemainder + earned;

    if (accumulated === neighborhood.pendingCoinsRemainder) {
      neighborhoods[id] = neighborhood;
      continue;
    }

    const credited = Math.floor(accumulated);

    neighborhoods[id] = {
      ...neighborhood,
      treasuryCoins: neighborhood.treasuryCoins + credited,
      pendingCoinsRemainder: accumulated - credited,
    };
    changed = true;
  }

  if (!changed) {
    return state;
  }

  return { ...state, lastTickAt: now, neighborhoods };
}

function neighborhoodYield(
  habits: GameState['habits'],
  neighborhoodId: EntityId,
  neighborhood: Neighborhood,
  start: TimestampMs,
  end: TimestampMs,
): number {
  let coins = 0;

  for (const habit of Object.values(habits)) {
    if (habit.neighborhoodId !== neighborhoodId) {
      continue;
    }

    coins += habitCoins(habit, neighborhood.infrastructureLevel, start, end);
  }

  const penalized =
    neighborhood.reactivationPenaltyUntil !== null && neighborhood.reactivationPenaltyUntil > end;

  return penalized ? coins * REACTIVATION_PENALTY_MULTIPLIER : coins;
}

/**
 * Monedas devengadas por un hábito en `[start, end]`, partiendo el intervalo en
 * los cortes **reales** de su curva y no en horas de reloj: con `T = 45.6 h` los
 * cortes caen en `22.8 h` y `34.2 h`.
 *
 * La aritmética se mantiene en forma racional hasta la división final para que un
 * total matemáticamente entero (`34 h × 5 + 6 h × 5 × 2/3 = 190`) no llegue a
 * `floor` una ulp por debajo y pierda la moneda.
 */
function habitCoins(
  habit: HabitBuilding,
  infrastructureLevel: Neighborhood['infrastructureLevel'],
  start: TimestampMs,
  end: TimestampMs,
): number {
  // Un hábito no devenga antes de existir, aunque `lastTickAt` sea más viejo.
  const from = Math.max(start, habit.createdAt);

  if (end <= from) {
    return 0;
  }

  const cuts = [
    from,
    ...getHabitEfficiencyBoundaries(habit, infrastructureLevel).filter(
      (boundary) => boundary > from && boundary < end,
    ),
    end,
  ];

  let coins = 0;

  for (let index = 0; index < cuts.length - 1; index += 1) {
    const segmentStart = cuts[index]!;
    const segmentEnd = cuts[index + 1]!;
    const hours = (segmentEnd - segmentStart) / MS_PER_HOUR;
    // El corte pertenece al tramo ANTERIOR (`Pleno` es inclusivo en `0.5T`), así
    // que la eficiencia se sondea en el medio del segmento, no en su borde.
    const ratio = getHabitEfficiencyRatio(
      habit,
      infrastructureLevel,
      segmentStart + (segmentEnd - segmentStart) / 2,
    );

    coins += (hours * HABIT_COINS_PER_HOUR * ratio.numerator) / ratio.denominator;
  }

  return coins;
}

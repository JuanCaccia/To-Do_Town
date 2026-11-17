import { FOCUS_CURVE } from '../constants/economyConstants';
import type { EntityId, GameState } from '../types';
import { creditCoins } from './coinCredit';
import { withQualityOfLifeXp } from './townHallLevel';

/**
 * Liquida minutos efectivos de foco contra la curva de fatiga mental diaria
 * (US-09 CA-03, ECONOMY §2.4).
 *
 * Recibe los minutos **efectivos** ya calculados: la regla del 80% de CA-04 los
 * produce desde afuera y no forma parte de esta curva.
 *
 * `F_día` es un acumulador de la ciudad, así que una sesión que cruza el minuto
 * 100 (o el 200) se parte en tramos mixtos: cada minuto se paga con la tarifa
 * del tramo en el que cae.
 *
 * El barrio se asume validado por `recordFocusSession`, que es quien rechaza un
 * barrio inexistente antes de que exista una sesión que liquidar.
 *
 * Devuelve la misma referencia cuando no hay minutos que liquidar (DEC-018).
 */
export function liquidateFocus(
  state: GameState,
  neighborhoodId: EntityId,
  minutes: number,
): GameState {
  if (minutes <= 0) {
    return state;
  }

  const neighborhood = state.neighborhoods[neighborhoodId]!;
  const before = state.dailyFocusMinutes;
  const after = before + minutes;

  const optimalMinutes = overlapMinutes(before, after, 0, FOCUS_CURVE.optimalMinuteLimit);
  const fatigueMinutes = overlapMinutes(
    before,
    after,
    FOCUS_CURVE.optimalMinuteLimit,
    FOCUS_CURVE.fatigueMinuteLimit,
  );
  const exhaustionMinutes = minutes - optimalMinutes - fatigueMinutes;

  const earnedCoins =
    optimalMinutes * FOCUS_CURVE.optimalCoinsPerMinute +
    fatigueMinutes * FOCUS_CURVE.fatigueCoinsPerMinute +
    exhaustionMinutes * FOCUS_CURVE.exhaustionCoinsPerMinute;

  const credit = creditCoins(
    neighborhood.treasuryCoins,
    neighborhood.pendingCoinsRemainder,
    earnedCoins,
  );
  const earnedXp = cumulativeXp(after) - cumulativeXp(before);

  return {
    ...state,
    dailyFocusMinutes: after,
    globals: {
      ...state.globals,
      townHall: withQualityOfLifeXp(state.globals.townHall, earnedXp),
    },
    neighborhoods: {
      ...state.neighborhoods,
      [neighborhoodId]: {
        ...neighborhood,
        treasuryCoins: credit.treasuryCoins,
        pendingCoinsRemainder: credit.pendingCoinsRemainder,
      },
    },
  };
}

export type FocusTier = 'OPTIMAL' | 'FATIGUE' | 'EXHAUSTION';

/**
 * Tramo que le toca al **próximo** minuto (US-09 CA-03).
 *
 * Es una derivación de `FOCUS_CURVE`, no un dato guardado: el HUD la usa para
 * mostrar en qué tramo está la ciudad sin repetir los umbrales. `F_día = 100`
 * significa que los 100 minutos óptimos ya se cobraron, así que el siguiente
 * minuto cae en Fatiga.
 */
export function getFocusTier(dailyFocusMinutes: number): FocusTier {
  if (dailyFocusMinutes < FOCUS_CURVE.optimalMinuteLimit) {
    return 'OPTIMAL';
  }

  if (dailyFocusMinutes < FOCUS_CURVE.fatigueMinuteLimit) {
    return 'FATIGUE';
  }

  return 'EXHAUSTION';
}

/**
 * Liquida la sesión de foco ya registrada (US-09 CA-03/CA-04).
 *
 * Es el único lugar donde se aplica la regla del 80%: la interrupción reduce los
 * minutos **efectivos que se liquidan**, no los minutos que la sesión guardó
 * (DEC-020). `recordFocusSession` conserva los crudos y sigue siendo el dueño
 * del registro.
 *
 * Una interrupción corta que el 80% deja por debajo del minuto no liquida nada
 * y devuelve la misma referencia (DEC-018).
 */
export function liquidateFocusSession(state: GameState, sessionId: EntityId): GameState {
  const session = state.focusSessions[sessionId];

  if (session === undefined) {
    return state;
  }

  const effectiveMinutes =
    session.outcome === 'COMPLETED'
      ? session.focusMinutes
      : effectiveInterruptedMinutes(session.focusMinutes);

  return liquidateFocus(state, session.neighborhoodId, effectiveMinutes);
}

function effectiveInterruptedMinutes(elapsedMinutes: number): number {
  const { numerator, denominator } = FOCUS_CURVE.interruptionRetained;

  return Math.floor((elapsedMinutes * numerator) / denominator);
}

/** Minutos de la sesión que caen dentro de `[from, to)`. */
function overlapMinutes(before: number, after: number, from: number, to: number): number {
  return Math.max(0, Math.min(after, to) - Math.max(before, from));
}

/**
 * XP acumulado que corresponde a un `F_día` dado.
 *
 * No se guarda "XP ya otorgado": es una función monótona del acumulador, así que
 * el XP de una sesión es la diferencia entre el acumulado de después y el de
 * antes. Guardarlo aparte sería una segunda fuente de verdad que puede divergir.
 *
 * Los topes del CA (20 y 10 XP) salen solos de los límites de cada tramo:
 * `100 / 5` y `100 / 10`. No son constantes propias.
 */
function cumulativeXp(dailyFocusMinutes: number): number {
  const optimalMinutes = Math.min(dailyFocusMinutes, FOCUS_CURVE.optimalMinuteLimit);
  const fatigueMinutes = Math.min(
    Math.max(dailyFocusMinutes - FOCUS_CURVE.optimalMinuteLimit, 0),
    FOCUS_CURVE.fatigueMinuteLimit - FOCUS_CURVE.optimalMinuteLimit,
  );

  return (
    Math.floor(optimalMinutes / FOCUS_CURVE.optimalXpBlockMinutes) +
    Math.floor(fatigueMinutes / FOCUS_CURVE.fatigueXpBlockMinutes)
  );
}

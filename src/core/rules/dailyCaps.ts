import {
  PAGES_DAILY_HARD_CAP,
  WATER_DAILY_HARD_CAP_LITERS,
} from '../constants/economyConstants';
import type { GameState } from '../types';
import { isValidPageCount, registerPageReading } from './libraryReading';
import type { LibraryReadingRejection } from './libraryReading';
import { registerWaterIntake } from './waterIntake';

export interface WaterCapResult {
  /** Mismo estado cuando el cupo ya estaba agotado: sin mutación no hay evento. */
  state: GameState;
  creditedLiters: number;
}

export type PageCapResult =
  | { status: 'READING_REGISTERED'; state: GameState; creditedPages: number }
  | { status: 'REJECTED'; reason: LibraryReadingRejection };

/**
 * US-09 CA-02: ¿la meta diaria de agua ya está cumplida?
 *
 * Predicado único que US-11 consume en dos lugares: al reactivar un barrio
 * ("a menos que la meta ya esté cumplida") y al liberar la penalización. Con
 * DEC-021 el cupo iguala la meta, así que "meta cumplida" es exactamente
 * "cupo agotado".
 */
export function isWaterDailyTargetMet(state: GameState): boolean {
  return state.globals.aqueduct.dailyLiters >= state.globals.aqueduct.dailyTargetLiters;
}

/**
 * US-09 CA-02 / Presión de Calderas: cumplir la meta de agua anula el Arranque
 * de Motores en toda la ciudad.
 *
 * Devuelve la misma referencia cuando no hay nada que liberar (meta sin cumplir
 * o barrios ya limpios), para que el store no emita un evento sin mutación
 * (GOVERNANCE DEC-018).
 */
export function clearReactivationPenaltiesAtWaterTarget(state: GameState): GameState {
  if (!isWaterDailyTargetMet(state)) {
    return state;
  }

  const penalizedIds = Object.keys(state.neighborhoods).filter(
    (id) => state.neighborhoods[id]!.reactivationPenaltyUntil !== null,
  );

  if (penalizedIds.length === 0) {
    return state;
  }

  const neighborhoods: GameState['neighborhoods'] = { ...state.neighborhoods };

  for (const id of penalizedIds) {
    neighborhoods[id] = { ...neighborhoods[id]!, reactivationPenaltyUntil: null };
  }

  return { ...state, neighborhoods };
}

/**
 * Hard cap diario de hidratación (US-09 CA-01, DEC-020).
 *
 * Recorta en vez de rechazar: el usuario declaró lo que tomó y el sistema sólo
 * deja de acreditar el excedente sobre el remanente. US-08 acredita sin tope y
 * esta función es la única dueña del límite.
 *
 * Compone la liberación de penalizaciones (US-09 CA-02) para que el store no
 * tenga que encadenar dos reglas en la misma acción.
 */
export function applyWaterDailyCap(state: GameState, amount: number): WaterCapResult {
  const remaining = WATER_DAILY_HARD_CAP_LITERS - state.globals.aqueduct.dailyLiters;
  const creditedLiters = Math.min(amount, Math.max(remaining, 0));

  if (creditedLiters <= 0) {
    return { state, creditedLiters: 0 };
  }

  const credited = registerWaterIntake(state, creditedLiters);

  return { state: clearReactivationPenaltiesAtWaterTarget(credited), creditedLiters };
}

/**
 * Hard cap diario de lectura (US-09 CA-01, DEC-020).
 *
 * Un conteo inválido sigue siendo un rechazo; el excedente de cupo es un
 * recorte. `creditedPages` existe para que el borde pueda avisar que no todo se
 * acreditó sin exponer el acumulador del día.
 */
export function applyPageDailyCap(state: GameState, pages: number): PageCapResult {
  if (!isValidPageCount(pages)) {
    return { status: 'REJECTED', reason: 'INVALID_PAGE_COUNT' };
  }

  const remaining = PAGES_DAILY_HARD_CAP - state.globals.library.dailyPagesRead;
  const creditedPages = Math.min(pages, Math.max(remaining, 0));

  if (creditedPages <= 0) {
    return { status: 'READING_REGISTERED', state, creditedPages: 0 };
  }

  const result = registerPageReading(state, creditedPages);

  if (result.status === 'REJECTED') {
    return result;
  }

  return { status: 'READING_REGISTERED', state: result.state, creditedPages };
}

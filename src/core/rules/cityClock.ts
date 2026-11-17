import type { GameState, TimestampMs } from '../types';

/**
 * US-10 CA-02: reloj operativo de la ciudad.
 *
 * Durante la pausa manual queda **congelado** en el instante en que se pausó:
 * CA-01 fija `lastTickAt = now` al activar la pausa y ninguna regla lo adelanta
 * mientras dura, así ni el decaimiento ni la eficiencia derivada consumen
 * tiempo de pared.
 */
export function getCityNow(state: GameState, now: TimestampMs): TimestampMs {
  return state.cityStatus === 'MANUAL_PAUSE' ? state.lastTickAt : now;
}

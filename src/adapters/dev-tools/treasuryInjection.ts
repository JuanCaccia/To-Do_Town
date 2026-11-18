import type { EntityId, GameState } from '../../core/types';

/**
 * DEV-01 (dentro de US-12 CA-04): siembra un saldo para validar a mano historias
 * cuyo resultado esperado exige monedas iniciales.
 *
 * No es una regla de dominio: por eso vive en `adapters/` y no en `core/`. El
 * motor nunca la llama; sólo la alcanza el panel DEV, que se monta únicamente
 * con `import.meta.env.DEV`.
 *
 * Devuelve el mismo estado cuando no hay nada que sembrar (barrio inexistente,
 * saldo no finito o negativo) en lugar de lanzar: el borde DEV no debe poder
 * romper la ciudad que está probando.
 */
export function injectTreasury(state: GameState, neighborhoodId: EntityId, coins: number): GameState {
  const neighborhood = state.neighborhoods[neighborhoodId];

  if (neighborhood === undefined || Number.isFinite(coins) === false || coins < 0) {
    return state;
  }

  return {
    ...state,
    neighborhoods: {
      ...state.neighborhoods,
      [neighborhoodId]: { ...neighborhood, treasuryCoins: coins },
    },
  };
}

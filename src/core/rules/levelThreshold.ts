import type { LevelThreshold } from '../constants/economyConstants';

/**
 * ECONOMY §5.1: nivel vigente de un edificio cívico para su acumulado histórico.
 *
 * Las tablas de `economyConstants.ts` son cerradas y arrancan en `0`, así que el
 * fallback sólo cubre una tabla vacía: preferible un Nivel 1 explícito a un
 * `undefined` que viaje hasta el HUD.
 */
export function resolveLevel(
  thresholds: readonly LevelThreshold[],
  accumulated: number,
): LevelThreshold['level'] {
  const reached = thresholds.filter((tier) => accumulated >= tier.min).at(-1);

  return reached?.level ?? 1;
}

import type { EntityId, GameState, HabitCheckpointLevel } from '../../core/types';

/**
 * Lista cerrada de niveles válidos. Se deriva del tipo, no de un número suelto:
 * si mañana el dominio agrega o quita un nivel, esto deja de compilar en vez de
 * aceptar un valor que la regla de retiro no conoce.
 */
const CHECKPOINT_LEVELS: readonly HabitCheckpointLevel[] = [1, 2, 3, 4, 5];

/**
 * El panel DEV recibe el nivel como texto y lo parsea, así que a esta función le
 * llega un `number` sin garantías —igual que el saldo en `injectTreasury`. Esta
 * es la única puerta que lo angosta al tipo del dominio.
 */
function isCheckpointLevel(value: number): value is HabitCheckpointLevel {
  return CHECKPOINT_LEVELS.includes(value as HabitCheckpointLevel);
}

/**
 * DEV-01 (extensión): siembra el nivel de un hábito para validar a mano la US-06
 * Prueba 3, que exige `checkpointLevel === 5` y son 100 jornadas de check-in.
 *
 * No es una regla de dominio: vive en `adapters/` y sólo la alcanza el panel
 * DEV. No emite eventos, así que no ensucia el Outbox de la ciudad real.
 *
 * Devuelve el mismo estado cuando el hábito no existe o el nivel no es uno de
 * los válidos: el borde DEV no debe poder romper la ciudad que está probando.
 */
export function injectHabitCheckpointLevel(
  state: GameState,
  habitId: EntityId,
  level: number,
): GameState {
  const habit = state.habits[habitId];

  if (habit === undefined || isCheckpointLevel(level) === false) {
    return state;
  }

  return {
    ...state,
    habits: { ...state.habits, [habitId]: { ...habit, checkpointLevel: level } },
  };
}

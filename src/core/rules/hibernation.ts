import type { GameState, HabitBuilding, TimestampMs } from '../types';
import { getSafeFloorDays } from './habitDecay';

/** US-11 CA-01: 72 horas sin interacción disparan la hibernación. */
export const INACTIVITY_HIBERNATION_MS = 72 * 60 * 60 * 1000;

/**
 * La hibernación sólo aplica a una ciudad activa. Una pausa manual ya congeló
 * la ciudad y no debe ser reemplazada por el auto-pause.
 */
export function shouldHibernate(state: GameState, now: TimestampMs): boolean {
  return (
    state.cityStatus === 'ACTIVE' &&
    now - state.lastUserInteractionAt >= INACTIVITY_HIBERNATION_MS
  );
}

/**
 * US-11 CA-01: apaga la ciudad por inactividad.
 *
 * La liquidación ya ocurrió antes de llegar acá, así que marcar `lastTickAt`
 * como el instante de hibernación no pierde nada y evita que una reactivación
 * posterior cobre el período hibernado. Los hábitos activos pasan a `PAUSED`
 * (eficiencia derivada 0.0) y su racha retrocede al piso de su checkpoint.
 */
export function hibernateCity(state: GameState, now: TimestampMs): GameState {
  const habits = Object.fromEntries(
    Object.entries(state.habits).map(([id, habit]): [string, HabitBuilding] => [
      id,
      habit.status === 'ACTIVE'
        ? {
            ...habit,
            status: 'PAUSED',
            currentStreakDays: Math.min(
              habit.currentStreakDays,
              getSafeFloorDays(habit.checkpointLevel),
            ),
          }
        : habit,
    ]),
  );

  return {
    ...state,
    cityStatus: 'AUTO_PAUSED_HIBERNATION',
    habits,
    lastTickAt: now,
  };
}

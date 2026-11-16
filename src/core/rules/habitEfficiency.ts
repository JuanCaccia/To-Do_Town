import type { HabitBuilding, HabitFrequency, Neighborhood, TimestampMs } from '../types';
import {
  HABIT_DAILY_GRACE_HOURS,
  HABIT_EFFICIENCY_BREAKPOINTS,
  HABIT_EFFICIENCY_RATIOS,
  HABIT_WEEKLY_GRACE_HOURS,
  HOURS_PER_DAY,
  INFRASTRUCTURE_INERTIA_HOURS,
} from '../constants/economyConstants';

const MS_PER_HOUR = 3_600_000;

export interface HabitEfficiencyRatio {
  numerator: number;
  denominator: number;
}

/**
 * US-07 CA-01 / ECONOMY §2.1.1: ventana total de enfriamiento `T`, en horas,
 * medida desde `lastCompletedAt` (o `createdAt` si nunca se cumplió, DEC-013).
 *
 * No conoce el hábito ni el reloj: recibe la frecuencia y el nivel del barrio,
 * así que es pura y determinista. La curva de eficiencia sobre esta ventana es
 * responsabilidad de US-07 CA-02.
 */
export function getHabitCooldownHours(
  frequency: HabitFrequency,
  infrastructureLevel: Neighborhood['infrastructureLevel'],
): number {
  const baseHours =
    frequency.type === 'DAILY'
      ? HOURS_PER_DAY + HABIT_DAILY_GRACE_HOURS
      : (7 / frequency.count) * HOURS_PER_DAY + HABIT_WEEKLY_GRACE_HOURS;

  return baseHours + INFRASTRUCTURE_INERTIA_HOURS[infrastructureLevel];
}

/**
 * US-07 CA-02 / ECONOMY §2.1: eficiencia derivada en el instante `now`, en su
 * forma racional. La liquidación de CA-03 la consume así para no introducir
 * error de coma flotante en totales que son enteros exactos.
 *
 * Los estados no activos devuelven `0` aunque su ventana siga vigente, para que
 * ningún consumidor tenga que acordarse de filtrarlos.
 */
export function getHabitEfficiencyRatio(
  habit: HabitBuilding,
  infrastructureLevel: Neighborhood['infrastructureLevel'],
  now: TimestampMs,
): HabitEfficiencyRatio {
  if (habit.status !== 'ACTIVE') {
    return HABIT_EFFICIENCY_RATIOS.blackout;
  }

  const windowHours = getHabitCooldownHours(habit.frequency, infrastructureLevel);
  const elapsedHours = (now - (habit.lastCompletedAt ?? habit.createdAt)) / MS_PER_HOUR;

  // El Apagón es común a las dos curvas: al vencer `T` no hay producción, con o
  // sin tramos intermedios. Declararlo una sola vez arriba deja la partición
  // total — de acá para abajo, siempre es `elapsedHours < windowHours`.
  if (elapsedHours >= windowHours) {
    return HABIT_EFFICIENCY_RATIOS.blackout;
  }

  if (habit.frequency.type === 'DAILY') {
    return HABIT_EFFICIENCY_RATIOS.full;
  }

  if (elapsedHours <= windowHours * HABIT_EFFICIENCY_BREAKPOINTS.worn) {
    return HABIT_EFFICIENCY_RATIOS.full;
  }

  if (elapsedHours <= windowHours * HABIT_EFFICIENCY_BREAKPOINTS.critical) {
    return HABIT_EFFICIENCY_RATIOS.worn;
  }

  return HABIT_EFFICIENCY_RATIOS.critical;
}

/** US-07 CA-02: eficiencia como número, para presentación y comparaciones. */
export function getHabitEfficiency(
  habit: HabitBuilding,
  infrastructureLevel: Neighborhood['infrastructureLevel'],
  now: TimestampMs,
): number {
  const ratio = getHabitEfficiencyRatio(habit, infrastructureLevel, now);

  return ratio.numerator / ratio.denominator;
}

/**
 * US-07 CA-04: ¿el hábito cayó en Apagón en `now`?
 *
 * Se deriva del último corte de su curva en vez de recalcular la ventana: el
 * último corte **es** `origen + T`. Los hábitos no activos devuelven `false`
 * porque no están cayendo al Apagón, están detenidos.
 */
export function isHabitInBlackout(
  habit: HabitBuilding,
  infrastructureLevel: Neighborhood['infrastructureLevel'],
  now: TimestampMs,
): boolean {
  if (habit.status !== 'ACTIVE') {
    return false;
  }

  const boundaries = getHabitEfficiencyBoundaries(habit, infrastructureLevel);
  const blackoutAt = boundaries[boundaries.length - 1];

  return blackoutAt !== undefined && now >= blackoutAt;
}

/**
 * US-07 CA-03: instantes absolutos en los que la curva de este hábito cambia de
 * tramo. Son los cortes reales de la ventana y no horas de reloj: con
 * `TIMES_PER_WEEK` de 5, `T = 45.6 h` y los cortes caen en `22.8 h` y `34.2 h`.
 */
export function getHabitEfficiencyBoundaries(
  habit: HabitBuilding,
  infrastructureLevel: Neighborhood['infrastructureLevel'],
): TimestampMs[] {
  if (habit.status !== 'ACTIVE') {
    return [];
  }

  const windowHours = getHabitCooldownHours(habit.frequency, infrastructureLevel);
  const origin = habit.lastCompletedAt ?? habit.createdAt;
  const fractions =
    habit.frequency.type === 'DAILY'
      ? [1]
      : [HABIT_EFFICIENCY_BREAKPOINTS.worn, HABIT_EFFICIENCY_BREAKPOINTS.critical, 1];

  return fractions.map((fraction) => origin + fraction * windowHours * MS_PER_HOUR);
}

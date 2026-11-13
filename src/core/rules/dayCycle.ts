import type { DayCycleConfig, TimestampMs } from '../types';

const MS_PER_HOUR = 3_600_000;

/**
 * Día operativo activo: la fecha local de referencia una vez descontado el
 * corrimiento del cierre de jornada (hora de corte + horas de gracia).
 * Ver GOVERNANCE.md DEC-012.
 */
export function getOperationalDay(now: TimestampMs, config: DayCycleConfig): string {
  const boundaryOffsetMs = (config.dayCutoffHour + config.gracePeriodHours) * MS_PER_HOUR;
  const reference = new Date(now - boundaryOffsetMs);

  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, '0');
  const day = String(reference.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

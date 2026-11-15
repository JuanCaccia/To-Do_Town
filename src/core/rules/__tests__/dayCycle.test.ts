import { describe, expect, it } from 'vitest';
import type { DayCycleConfig } from '../../types';
import { getOperationalDay } from '../dayCycle';

const DEFAULT_CONFIG: DayCycleConfig = { dayCutoffHour: 0, gracePeriodHours: 4 };

/** Construye un timestamp desde una fecha LOCAL explícita (mes 1-12). */
function atLocal(year: number, month: number, day: number, hour: number, minute = 0): number {
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
}

describe('getOperationalDay — US-05 CA-01: día operativo con horas de gracia', () => {
  it('a las 03:59 todavía pertenece a la jornada del día anterior', () => {
    expect(getOperationalDay(atLocal(2026, 1, 15, 3, 59), DEFAULT_CONFIG)).toBe('2026-01-14');
  });

  it('a las 04:00 en punto ya pertenece a la jornada del día calendario', () => {
    expect(getOperationalDay(atLocal(2026, 1, 15, 4, 0), DEFAULT_CONFIG)).toBe('2026-01-15');
  });

  it('cruza el cambio de año sin desbordar la fecha', () => {
    expect(getOperationalDay(atLocal(2026, 1, 1, 2, 0), DEFAULT_CONFIG)).toBe('2025-12-31');
  });

  it('respeta un corte y una gracia distintos de los valores por defecto', () => {
    const config: DayCycleConfig = { dayCutoffHour: 3, gracePeriodHours: 2 };

    expect(getOperationalDay(atLocal(2026, 1, 15, 4, 59), config)).toBe('2026-01-14');
    expect(getOperationalDay(atLocal(2026, 1, 15, 5, 0), config)).toBe('2026-01-15');
  });
});

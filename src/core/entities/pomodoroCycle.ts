import type { PomodoroPreset } from '../types';

export type PomodoroBreakKind = 'SHORT_BREAK' | 'LONG_BREAK';

export interface PomodoroBreak {
  kind: PomodoroBreakKind;
  minutes: number;
}

/**
 * Descanso que sigue después de completar `completedWorkBlocks` bloques de
 * trabajo (US-08 CA-04).
 *
 * El descanso largo sólo existe cuando el preset lo define: un `null` significa
 * "sin descanso largo", así que el ciclo repite el corto en vez de inventar
 * minutos. Qué bloque corre es una decisión pura sobre el preset; el reloj de la
 * vista sólo la consume.
 */
export function getBreakAfterWork(
  preset: PomodoroPreset,
  completedWorkBlocks: number,
): PomodoroBreak {
  const closesCycle = completedWorkBlocks % preset.cyclesBeforeLongBreak === 0;

  if (closesCycle && preset.longBreakMinutes !== null) {
    return { kind: 'LONG_BREAK', minutes: preset.longBreakMinutes };
  }

  return { kind: 'SHORT_BREAK', minutes: preset.shortBreakMinutes };
}

/**
 * Un set Pomodoro no es infinito: termina al completar `cyclesBeforeLongBreak`
 * bloques de trabajo (US-08 CA-04). Sin este corte, el encadenado
 * trabajo→descanso no tendría final y el usuario nunca cerraría el set.
 */
export function isPomodoroSetComplete(
  preset: PomodoroPreset,
  completedWorkBlocks: number,
): boolean {
  return completedWorkBlocks >= preset.cyclesBeforeLongBreak;
}

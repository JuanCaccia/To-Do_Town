import {
  POMODORO_DEFAULT_CYCLES_BEFORE_LONG_BREAK,
  POMODORO_SHORT_BREAK_DIVISOR,
  WATER_DAILY_HARD_CAP_LITERS,
} from '../core/constants/economyConstants';
import { createDayZeroState } from '../core/entities/dayZero';
import type { StoragePort } from '../core/ports/StoragePort';
import type {
  CentralAqueduct,
  CentralLibrary,
  GameState,
  Neighborhood,
  PomodoroPreset,
  TimestampMs,
} from '../core/types';
export async function hydrateGameState(storage: StoragePort, now: TimestampMs): Promise<GameState> {
  const saved = await storage.loadState();

  if (saved !== null) {
    return normalizeSavedState(saved);
  }

  const dayZeroState = createDayZeroState(now);
  await storage.saveState(dayZeroState);

  return dayZeroState;
}

/**
 * Completa en memoria los campos que un snapshot anterior no tenía.
 *
 * No es una migración y por eso no persiste: `loadState` es un cast sin schema,
 * así que un `GameState` guardado antes de que existiera un campo llega sin él.
 * Sin este relleno, `{ ...undefined }` en una escritura pasa en silencio y el
 * fallo aparece recién en la primera lectura. El versionado real es US-12.
 *
 * `Number.isFinite` cubre los dos casos de un solo golpe: un campo ausente
 * (`undefined`) y una tesorería que ya quedó en `NaN` cuando US-07 agregó
 * `pendingCoinsRemainder` sin esta puerta. Un saldo no finito no es un saldo.
 */
function normalizeSavedState(saved: GameState): GameState {
  return {
    ...saved,
    focusSessions: saved.focusSessions ?? {},
    // US-09 CA-03: sin este relleno, el primer pomodoro de un snapshot anterior
    // haría `undefined + n = NaN` y envenenaría `F_día` hasta el corte.
    dailyFocusMinutes: Number.isFinite(saved.dailyFocusMinutes) ? saved.dailyFocusMinutes : 0,
    globals: {
      ...saved.globals,
      aqueduct: normalizeAqueduct(saved.globals.aqueduct),
      library: normalizeLibrary(saved.globals.library),
    },
    neighborhoods: Object.fromEntries(
      Object.entries(saved.neighborhoods).map(([id, neighborhood]) => [
        id,
        normalizeNeighborhood(neighborhood),
      ]),
    ),
    config: {
      ...saved.config,
      pomodoroPresets: saved.config.pomodoroPresets.map(normalizePomodoroPreset),
    },
  };
}

/**
 * DEC-021: el cupo de agua bajó de 3.0 L a 2.0 L. Un snapshot anterior puede
 * traer 3.0 L consumidos y el HUD lo mostraría por encima de su propio cupo
 * hasta el próximo corte de jornada. Se recorta en memoria, igual que el resto
 * de esta normalización.
 */
function normalizeAqueduct(aqueduct: CentralAqueduct): CentralAqueduct {
  return {
    ...aqueduct,
    dailyLiters: Number.isFinite(aqueduct.dailyLiters)
      ? Math.min(aqueduct.dailyLiters, WATER_DAILY_HARD_CAP_LITERS)
      : 0,
  };
}

/**
 * Un snapshot anterior a US-09 CA-01 no tiene `dailyPagesRead`. Sin este relleno
 * el primer registro del día haría `undefined + n = NaN` y el cupo quedaría
 * envenenado en silencio.
 */
function normalizeLibrary(library: CentralLibrary): CentralLibrary {
  return {
    ...library,
    dailyPagesRead: Number.isFinite(library.dailyPagesRead) ? library.dailyPagesRead : 0,
  };
}

/**
 * Reconstruye los presets sembrados antes de US-08 CA-03, cuando todavía no
 * existían `id` ni `name`.
 *
 * Sin `id`, todos los chips apuntan a la misma selección y siempre corre el
 * primer preset; sin `name`, el usuario ve opciones en blanco. La identidad se
 * deriva de la duración —el único dato que ese snapshot sí guardaba— y coincide
 * con los presets por defecto de `dayZero`.
 */
function normalizePomodoroPreset(preset: PomodoroPreset): PomodoroPreset {
  const shortBreakMinutes =
    preset.shortBreakMinutes ?? Math.floor(preset.workMinutes / POMODORO_SHORT_BREAK_DIVISOR);

  return {
    id: preset.id ?? `pomodoro-${preset.workMinutes}-${shortBreakMinutes}`,
    name: preset.name ?? `${preset.workMinutes}/${shortBreakMinutes}`,
    workMinutes: preset.workMinutes,
    shortBreakMinutes,
    cyclesBeforeLongBreak:
      preset.cyclesBeforeLongBreak ?? POMODORO_DEFAULT_CYCLES_BEFORE_LONG_BREAK,
    longBreakMinutes: preset.longBreakMinutes ?? null,
  };
}

function normalizeNeighborhood(neighborhood: Neighborhood): Neighborhood {
  return {
    ...neighborhood,
    treasuryCoins: Number.isFinite(neighborhood.treasuryCoins) ? neighborhood.treasuryCoins : 0,
    pendingCoinsRemainder: Number.isFinite(neighborhood.pendingCoinsRemainder)
      ? neighborhood.pendingCoinsRemainder
      : 0,
  };
}

import { projectGameState } from '../adapters/backup/backupSchema';
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
  CityBlock,
  GameState,
  HabitBuilding,
  Neighborhood,
  OneOffTask,
  PomodoroPreset,
  TimestampMs,
} from '../core/types';
export async function hydrateGameState(storage: StoragePort, now: TimestampMs): Promise<GameState> {
  const saved = await storage.loadState();

  if (saved !== null) {
    return projectSavedState(normalizeSavedState(saved));
  }

  const dayZeroState = createDayZeroState(now);
  await storage.saveState(dayZeroState);

  return dayZeroState;
}

/**
 * MIG-01: segunda mitad de la puerta de entrada.
 *
 * `normalizeSavedState` rellena lo que falta; esta proyección descarta lo que
 * sobra. Antes, un campo que el tipo ya no declaraba sobrevivía al cast de
 * `loadState`, vivía en memoria y llegaba intacto al archivo de respaldo, que
 * se rechazaba a sí mismo al importarse.
 *
 * Si el snapshot ni siquiera normalizado entra en el esquema, se devuelve igual
 * y se avisa: bloquear el arranque dejaría al usuario sin ciudad, y una ciudad
 * rara es mejor que ninguna.
 */
function projectSavedState(normalized: GameState): GameState {
  const projection = projectGameState(normalized);

  if (projection.ok) {
    return projection.state;
  }

  console.warn(
    '[hydrateGameState] el snapshot persistido no coincide con el esquema vigente:',
    projection.issues.join(' · '),
  );

  return normalized;
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
    focusSessions: Object.fromEntries(
      Object.entries(saved.focusSessions ?? {}).map(([id, session]) => [
        id,
        // US-08 CA-04: una sesión anterior no guardaba `presetId`. Ninguna
        // regla lo lee, así que un sentinela es preferible a inventar un preset.
        { ...session, presetId: session.presetId ?? 'unknown' },
      ]),
    ),
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
    habits: Object.fromEntries(
      Object.entries(saved.habits).map(([id, habit]) => [id, normalizeHabit(habit)]),
    ),
    tasks: Object.fromEntries(
      Object.entries(saved.tasks).map(([id, task]) => [id, normalizeTask(task)]),
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
  // US-05 CA-02 movió el día operativo a `GameState.lastOperationalDay`. Un
  // snapshot anterior lo sigue trayendo acá, y el respaldo `.todotown` es
  // estricto: exportar ese campo condenaría al archivo a rechazarse solo.
  const { lastOperationalDay: _legacyOperationalDay, ...current } = aqueduct as CentralAqueduct & {
    lastOperationalDay?: string;
  };

  return {
    ...current,
    dailyLiters: Number.isFinite(current.dailyLiters)
      ? Math.min(current.dailyLiters, WATER_DAILY_HARD_CAP_LITERS)
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
    // US-11 CA-01: un snapshot anterior a la hibernación no trae la marca de
    // penalización. Sin este relleno, el respaldo estricto lo rechaza.
    reactivationPenaltyUntil: neighborhood.reactivationPenaltyUntil ?? null,
    // US-10 agregó el contador diario y las decoraciones; un snapshot previo no
    // los trae y el esquema del respaldo los exige.
    dailyTasksCompletedCount: neighborhood.dailyTasksCompletedCount ?? 0,
    decorations: neighborhood.decorations ?? [],
    blocks: neighborhood.blocks.map(normalizeBlock),
  };
}

/**
 * US-03 CA-01 agregó `House.createdAt` a un tipo que ya tenía ciudades. La casa
 * es un dato pasivo (ningún cálculo lo lee), así que `0` es un "fecha
 * desconocida" honesto y no inventa un historial.
 */
function normalizeBlock(block: CityBlock): CityBlock {
  return {
    ...block,
    houses: block.houses.map((house) => ({ ...house, createdAt: house.createdAt ?? 0 })),
  };
}

/**
 * US-06 CA-03 agregó `lastFrequencyChangeAt`; US-06 CA-01, `createdAt`.
 *
 * El reloj de producción cae a `lastCompletedAt` cuando existe. Si nunca se
 * cumplió, `createdAt: 0` lo deja en Apagón: regalar un `createdAt` fresco
 * encendería un hábito que el usuario no sostuvo.
 */
function normalizeHabit(habit: HabitBuilding): HabitBuilding {
  return {
    ...habit,
    createdAt: habit.createdAt ?? habit.lastCompletedAt ?? 0,
    lastFrequencyChangeAt: habit.lastFrequencyChangeAt ?? null,
  };
}

/** US-04 agregó `createdAt` y `completedAt`; ninguna regla lee el primero. */
function normalizeTask(task: OneOffTask): OneOffTask {
  return {
    ...task,
    createdAt: task.createdAt ?? 0,
    completedAt: task.completedAt ?? null,
  };
}

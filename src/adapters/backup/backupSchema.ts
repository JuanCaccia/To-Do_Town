import { z } from 'zod';
import type { DomainEventRecord, GameState } from '../../core/types';

/**
 * US-12 CA-04: esquema del respaldo `.todotown`.
 *
 * Vive en `src/adapters/` y no en `src/core/` porque Zod es una librería
 * externa y `src/core` tiene prohibido importarlas (`AGENTS.md` §3). El esquema
 * describe los tipos de `core/types`; no los redefine ni los duplica como
 * fuente de verdad.
 *
 * El mismo catálogo se construye dos veces:
 *
 * - **estricto** (importar): una clave desconocida invalida el archivo. Un
 *   respaldo adulterado se rechaza completo, nunca a medias.
 * - **tolerante** (exportar): la clave desconocida se descarta. Un snapshot
 *   viejo arrastra campos que el tipo ya no declara —`creditedCoins`,
 *   `aqueduct.lastOperationalDay`— y sin esta proyección la app exportaría
 *   archivos que su propio importador rechaza.
 */

export const BACKUP_FORMAT = 'todotown';
export const BACKUP_VERSION = 1;

type ObjectOf = <Shape extends z.ZodRawShape>(shape: Shape) => z.ZodObject<Shape, any>;

const strictObjectOf: ObjectOf = (shape) => z.strictObject(shape);
const looseObjectOf: ObjectOf = (shape) => z.object(shape);

function buildCatalog(object: ObjectOf) {
  const timestamp = z.number().finite();
  const entityId = z.string().min(1);
  const coins = z.number().finite().nonnegative();
  const minutes = z.number().finite().nonnegative();
  const operationalDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
  const buildingLevel = z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]);

  const houseSchema = object({
    lotIndex: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ]),
    designVariant: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    createdAt: timestamp,
  });

  const cityBlockSchema = object({
    gridPosition: object({ x: z.number().int(), y: z.number().int() }),
    houses: z.array(houseSchema).max(6),
    isLeveled: z.boolean(),
  });

  const decorationSchema = object({
    id: entityId,
    kind: z.union([
      z.literal('SMALL_PLAZA'),
      z.literal('FOUNTAIN_PARK'),
      z.literal('CIVIC_MONUMENT'),
    ]),
  });

  const neighborhoodSchema = object({
    name: z.string().min(1),
    isTutorial: z.boolean().optional(),
    paletteId: z.string().min(1),
    architecturalThemeId: z.string().min(1),
    infrastructureLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    treasuryCoins: coins,
    pendingCoinsRemainder: coins,
    urbanizationProgress: z.number().finite().nonnegative(),
    dailyTasksCompletedCount: z.number().int().nonnegative(),
    lastOperationalDay: operationalDay,
    reactivationPenaltyUntil: timestamp.nullable(),
    decorations: z.array(decorationSchema),
    blocks: z.array(cityBlockSchema).min(1),
  });

  const habitFrequencySchema = z.union([
    object({ type: z.literal('DAILY') }),
    object({ type: z.literal('TIMES_PER_WEEK'), count: z.number().int().min(1).max(6) }),
  ]);

  const habitSchema = object({
    neighborhoodId: entityId,
    title: z.string().min(1),
    frequency: habitFrequencySchema,
    currentStreakDays: z.number().int().nonnegative(),
    checkpointLevel: buildingLevel,
    lastCompletedAt: timestamp.nullable(),
    createdAt: timestamp,
    lastFrequencyChangeAt: timestamp.nullable(),
    retiredAt: timestamp.nullable(),
    status: z.union([z.literal('ACTIVE'), z.literal('PAUSED'), z.literal('RETIRED_TO_MUSEUM')]),
  });

  const oneOffTaskSchema = object({
    neighborhoodId: entityId,
    title: z.string().min(1),
    weight: z.union([z.literal('SIMPLE'), z.literal('STANDARD'), z.literal('COMPLEX')]),
    boardStatus: z.union([
      z.literal('MASTER_PLAN'),
      z.literal('IN_CONSTRUCTION'),
      z.literal('COMPLETED'),
    ]),
    createdAt: timestamp,
    completedAt: timestamp.nullable(),
  });

  const focusSessionSchema = object({
    neighborhoodId: entityId,
    presetId: z.string().min(1),
    startedAt: timestamp,
    endedAt: timestamp,
    focusMinutes: minutes,
    outcome: z.union([z.literal('COMPLETED'), z.literal('INTERRUPTED')]),
  });

  const gameStateSchema = object({
    cityStatus: z.union([
      z.literal('ACTIVE'),
      z.literal('MANUAL_PAUSE'),
      z.literal('AUTO_PAUSED_HIBERNATION'),
    ]),
    manualPauseReason: z.string().optional(),
    lastTickAt: timestamp,
    lastUserInteractionAt: timestamp,
    lastOperationalDay: operationalDay,
    account: object({
      userId: z.string().min(1),
      planTier: z.union([
        z.literal('LOCAL_FREE'),
        z.literal('CLOUD_SYNC_PRO'),
        z.literal('PERSONAL_DEV'),
      ]),
      cloudSyncEnabled: z.boolean(),
      unlockedThemes: z.array(z.string().min(1)),
    }),
    config: object({
      dayCycle: object({
        dayCutoffHour: z.number().int().min(0).max(23),
        gracePeriodHours: z.number().int().nonnegative(),
      }),
      pomodoroPresets: z
        .array(
          object({
            id: entityId,
            name: z.string().min(1),
            workMinutes: z.number().int().positive(),
            shortBreakMinutes: z.number().int().positive(),
            cyclesBeforeLongBreak: z.number().int().positive(),
            longBreakMinutes: z.number().int().positive().nullable(),
          }),
        )
        .min(1),
    }),
    globals: object({
      townHall: object({ level: buildingLevel, qualityOfLifeXP: coins }),
      library: object({
        level: buildingLevel,
        totalPagesRead: z.number().int().nonnegative(),
        dailyPagesRead: z.number().int().nonnegative(),
      }),
      aqueduct: object({
        level: buildingLevel,
        totalHistoricalLiters: z.number().finite().nonnegative(),
        dailyLiters: z.number().finite().nonnegative(),
        dailyTargetLiters: z.number().finite().positive(),
      }),
    }),
    neighborhoods: z.record(entityId, neighborhoodSchema),
    habits: z.record(entityId, habitSchema),
    tasks: z.record(entityId, oneOffTaskSchema),
    focusSessions: z.record(entityId, focusSessionSchema),
    dailyFocusMinutes: minutes,
  });

  const domainEventSchema = object({
    eventId: entityId,
    userId: z.string().min(1),
    deviceId: z.string().min(1),
    timestamp,
    type: z.string().min(1),
    payload: z.record(z.string(), z.unknown()),
    syncedAt: timestamp.nullable(),
  });

  const backupFileSchema = object({
    format: z.literal(BACKUP_FORMAT),
    version: z.literal(BACKUP_VERSION),
    exportedAt: timestamp,
    gameState: gameStateSchema,
    domainEvents: z.array(domainEventSchema),
  }).superRefine((file, ctx) => {
    // Invariante referencial: ninguna entidad puede sobrevivir a su barrio. Un
    // archivo con hábitos o tareas huérfanos se ve bien y produce una ciudad
    // muda: la Plaza y la Pizarra filtran por `neighborhoodId`.
    const { neighborhoods, habits, tasks, focusSessions } = file.gameState as {
      neighborhoods: Record<string, unknown>;
      habits: Record<string, { neighborhoodId: string }>;
      tasks: Record<string, { neighborhoodId: string }>;
      focusSessions: Record<string, { neighborhoodId: string }>;
    };

    const known = new Set(Object.keys(neighborhoods));

    for (const [habitId, habit] of Object.entries(habits)) {
      if (!known.has(habit.neighborhoodId)) {
        ctx.addIssue({
          code: 'custom',
          message: `Hábito ${habitId} apunta al barrio inexistente ${habit.neighborhoodId}`,
        });
      }
    }

    for (const [taskId, task] of Object.entries(tasks)) {
      if (!known.has(task.neighborhoodId)) {
        ctx.addIssue({
          code: 'custom',
          message: `Tarea ${taskId} apunta al barrio inexistente ${task.neighborhoodId}`,
        });
      }
    }

    for (const [sessionId, session] of Object.entries(focusSessions)) {
      if (!known.has(session.neighborhoodId)) {
        ctx.addIssue({
          code: 'custom',
          message: `Sesión ${sessionId} apunta al barrio inexistente ${session.neighborhoodId}`,
        });
      }
    }
  });

  return { gameStateSchema, domainEventSchema, backupFileSchema };
}

const strictCatalog = buildCatalog(strictObjectOf);
const canonicalCatalog = buildCatalog(looseObjectOf);

/** Validador de importación: nada desconocido pasa. */
export const backupFileSchema = strictCatalog.backupFileSchema;

export interface BackupPayload {
  gameState: GameState;
  domainEvents: DomainEventRecord[];
}

export type BackupValidation =
  | { ok: true; backup: BackupPayload }
  | { ok: false; reason: string };

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: number;
  gameState: GameState;
  domainEvents: DomainEventRecord[];
}

/**
 * Proyecta el estado sobre el esquema tolerante: conserva todo lo que el tipo
 * declara y descarta lo que un snapshot viejo arrastra de más. Si el estado no
 * se puede proyectar, el error es explícito — es preferible no descargar nada
 * antes que escribir un archivo que después no se va a poder restaurar.
 */
export function buildBackupFile(
  gameState: GameState,
  domainEvents: DomainEventRecord[],
  now: number,
): BackupFile {
  const canonicalState = canonicalCatalog.gameStateSchema.safeParse(gameState);
  const canonicalEvents = z
    .array(canonicalCatalog.domainEventSchema)
    .safeParse(domainEvents);

  if (canonicalState.success === false || canonicalEvents.success === false) {
    const issues = [
      ...(canonicalState.success === false ? canonicalState.error.issues : []),
      ...(canonicalEvents.success === false ? canonicalEvents.error.issues : []),
    ].map((issue) => `${issue.path.join('.') || 'estado'}: ${issue.message}`);

    // Un estado viejo suele fallar en el mismo campo por cada entidad. El
    // usuario necesita la lista de campos distintos, no la misma línea 12 veces.
    throw new Error(`No se pudo exportar la ciudad — ${[...new Set(issues)].join(' · ')}`);
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now,
    gameState: canonicalState.data as GameState,
    domainEvents: canonicalEvents.data as DomainEventRecord[],
  };
}

/**
 * El primer motivo de rechazo basta para el usuario: el archivo se rechaza
 * completo o se acepta completo, nunca a medias.
 */
export function parseBackupFile(raw: unknown): BackupValidation {
  const parsed = backupFileSchema.safeParse(raw);

  if (parsed.success === false) {
    const [issue] = parsed.error.issues;
    const path = issue?.path.join('.');

    return {
      ok: false,
      reason: issue === undefined ? 'Archivo inválido' : `${path ?? 'archivo'}: ${issue.message}`,
    };
  }

  // El esquema estricto reproduce `GameState` campo por campo; el cast sólo
  // declara ante el compilador lo que Zod ya verificó en runtime.
  return {
    ok: true,
    backup: {
      gameState: parsed.data.gameState as GameState,
      domainEvents: parsed.data.domainEvents as DomainEventRecord[],
    },
  };
}

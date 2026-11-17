import type { DecorationKind, HabitCheckpointLevel, TaskWeight } from '../types';
export interface InfrastructureUpgradeTier {
  baseCost: number;
  costPerLeveledBlock: number;
  townHallXp: number;
}

export interface DecorationOffer {
  cost: number;
  townHallXp: number;
}

export interface TaskReward {
  coins: number;
  urbanizationProgress: number;
}

export const INFRASTRUCTURE_UPGRADE_TIERS: Record<2 | 3 | 4, InfrastructureUpgradeTier> = {
  2: { baseCost: 600, costPerLeveledBlock: 200, townHallXp: 50 },
  3: { baseCost: 1_500, costPerLeveledBlock: 400, townHallXp: 120 },
  4: { baseCost: 3_500, costPerLeveledBlock: 800, townHallXp: 300 },
};

export const BLOCK_LEVELING_COSTS: Record<2 | 3 | 4, number> = {
  2: 300,
  3: 600,
  4: 1_000,
};

export const BLOCK_LEVELING_TOWN_HALL_XP = 30;

export const DECORATION_CATALOG: Record<DecorationKind, DecorationOffer> = {
  SMALL_PLAZA: { cost: 500, townHallXp: 25 },
  FOUNTAIN_PARK: { cost: 1_200, townHallXp: 60 },
  CIVIC_MONUMENT: { cost: 2_500, townHallXp: 125 },
};

export const TASK_REWARDS: Record<TaskWeight, TaskReward> = {
  SIMPLE: { coins: 20, urbanizationProgress: 10 },
  STANDARD: { coins: 50, urbanizationProgress: 25 },
  COMPLEX: { coins: 100, urbanizationProgress: 50 },
};

export interface HabitCheckpointTier {
  streakDays: number;
  level: Exclude<HabitCheckpointLevel, 1>;
  townHallXp: number;
}

/** ECONOMY §5.1: pisos de racha que desbloquean cada nivel de checkpoint de hábito. */
export const HABIT_CHECKPOINTS: readonly HabitCheckpointTier[] = [
  { streakDays: 7, level: 2, townHallXp: 25 },
  { streakDays: 21, level: 3, townHallXp: 50 },
  { streakDays: 50, level: 4, townHallXp: 100 },
  { streakDays: 100, level: 5, townHallXp: 250 },
];

/** ECONOMY §5.1: retiro con honores de un hábito Nivel 5 al Museo del barrio. */
export const HABIT_MUSEUM_RETIREMENT_TOWN_HALL_XP = 300;

/** DOMAIN_DESIGN §3.3: descanso corto sugerido para un preset nuevo, `W/5` (editable). */
export const POMODORO_SHORT_BREAK_DIVISOR = 5;

/** DOMAIN_DESIGN §3.3: bloques por defecto antes del descanso largo. */
export const POMODORO_DEFAULT_CYCLES_BEFORE_LONG_BREAK = 4;

/**
 * US-09 CA-01 / DEC-021: cupos diarios anti-exploit de los suministros
 * autodeclarados. El aporte que excede el remanente se recorta, nunca se
 * rechaza. El agua topea en su meta diaria (2.0 L): el HUD muestra el cupo como
 * denominador y no puede quedar por encima.
 */
export const WATER_DAILY_HARD_CAP_LITERS = 2;
export const PAGES_DAILY_HARD_CAP = 150;

/**
 * ECONOMY §5.1: umbrales de evolución de los edificios cívicos, medidos sobre el
 * acumulado **histórico** (nunca sobre el del día, que se reinicia en el corte).
 */
/**
 * ECONOMY §5.1: escalón mínimo para alcanzar cada nivel de un edificio cívico.
 * `min` se mide siempre sobre el acumulado **histórico**, nunca sobre el del día
 * (el del día se reinicia en el corte de jornada).
 */
export interface LevelThreshold {
  level: 1 | 2 | 3 | 4 | 5;
  min: number;
}

export const TOWN_HALL_LEVEL_THRESHOLDS: readonly LevelThreshold[] = [
  { level: 1, min: 0 },
  { level: 2, min: 100 },
  { level: 3, min: 350 },
  { level: 4, min: 1_000 },
  { level: 5, min: 2_500 },
];

export const AQUEDUCT_LEVEL_THRESHOLDS: readonly LevelThreshold[] = [
  { level: 1, min: 0 },
  { level: 2, min: 15 },
  { level: 3, min: 60 },
  { level: 4, min: 200 },
  { level: 5, min: 500 },
];

export const LIBRARY_LEVEL_THRESHOLDS: readonly LevelThreshold[] = [
  { level: 1, min: 0 },
  { level: 2, min: 100 },
  { level: 3, min: 500 },
  { level: 4, min: 1_500 },
  { level: 5, min: 5_000 },
];

/** BACKLOG US-06 CA-03: cooldown entre cambios de frecuencia de un hábito (ver DOC-01). */
export const HABIT_FREQUENCY_CHANGE_COOLDOWN_MS = 7 * 24 * 3_600_000;

/**
 * Horas de un día calendario. Constante de **calendario**, no de hábito: no la
 * mueve ningún balance, por eso la comparten la base semanal y el switch DAILY.
 */
export const HOURS_PER_DAY = 24;

/**
 * ECONOMY §2.1.1: ventana de enfriamiento `T` de un hábito, en horas.
 *
 * Base semanal: `(7 / X) * HOURS_PER_DAY`. Switch `DAILY`: un día de período más
 * la gracia. El margen de gracia del switch es una **duración económica fija** y
 * no `config.dayCycle.gracePeriodHours`: aquel desplaza el reloj para decidir la
 * jornada operativa y es configurable por el usuario. Ver ECONOMY §2.1.1.
 */
export const HABIT_DAILY_GRACE_HOURS = 4;
export const HABIT_WEEKLY_GRACE_HOURS = 12;

/** ECONOMY §4.1: bono de Inercia Urbana por nivel de infraestructura del barrio. */
export const INFRASTRUCTURE_INERTIA_HOURS: Record<1 | 2 | 3 | 4, number> = {
  1: 0,
  2: 2,
  3: 4,
  4: 6,
};

/**
 * ECONOMY §2.1: valores canónicos de eficiencia como **fracciones exactas**.
 * La liquidación los consume en forma racional (`numerador / denominador`) para
 * que un total matemáticamente entero no pierda una moneda por coma flotante.
 * `0.66` / `0.33` son presentación redondeada — GOVERNANCE DEC-006.
 */
export const HABIT_EFFICIENCY_RATIOS = {
  full: { numerator: 1, denominator: 1 },
  worn: { numerator: 2, denominator: 3 },
  critical: { numerator: 1, denominator: 3 },
  blackout: { numerator: 0, denominator: 1 },
} as const;

/** ECONOMY §2.1: cortes de la curva, como fracción de la ventana `T`. */
export const HABIT_EFFICIENCY_BREAKPOINTS = {
  worn: 0.5,
  critical: 0.75,
} as const;

/** ECONOMY §1: 1 hora de hábito activo al 100% = 5 monedas (120 al día). */
export const HABIT_COINS_PER_HOUR = 5;

/** ECONOMY §2.1: `M_barrio` durante el Arranque de Motores (US-11). */
export const REACTIVATION_PENALTY_MULTIPLIER = 0.5;

export interface TaskFatigueModel {
  localOptimalQuota: number;
  localFatigueQuota: number;
  globalOptimalQuota: number;
  globalFatigueQuota: number;
  fatigueMultiplier: number;
  exhaustionMultiplier: number;
  maxWaterBonusTasks: number;
}

/** ECONOMY §2.3: fatiga laboral de doble capa (cupo local y estamina global). */
export const TASK_FATIGUE: TaskFatigueModel = {
  localOptimalQuota: 5,
  localFatigueQuota: 5,
  globalOptimalQuota: 8,
  globalFatigueQuota: 6,
  fatigueMultiplier: 0.5,
  exhaustionMultiplier: 0.1,
  maxWaterBonusTasks: 2,
};

export interface FocusCurveModel {
  optimalMinuteLimit: number;
  fatigueMinuteLimit: number;
  optimalCoinsPerMinute: number;
  fatigueCoinsPerMinute: number;
  exhaustionCoinsPerMinute: number;
  optimalXpBlockMinutes: number;
  fatigueXpBlockMinutes: number;
  /**
   * US-09 CA-04: la regla del 80% en forma racional, igual que
   * `getHabitEfficiencyRatio`. Multiplicar por `0.8` en coma flotante redondea
   * el producto y un minuto entero puede caer al tramo de abajo.
   */
  interruptionRetained: { numerator: number; denominator: number };
}

/**
 * ECONOMY §2.4 / US-09 CA-03: curva de fatiga mental diaria sobre `F_día`.
 *
 * Los topes de XP del CA (20 en Foco Óptimo, 10 en Fatiga) no son constantes:
 * salen del cociente entre la duración del tramo y su bloque de XP.
 */
export const FOCUS_CURVE: FocusCurveModel = {
  optimalMinuteLimit: 100,
  fatigueMinuteLimit: 200,
  optimalCoinsPerMinute: 2,
  fatigueCoinsPerMinute: 1,
  exhaustionCoinsPerMinute: 0.2,
  optimalXpBlockMinutes: 5,
  fatigueXpBlockMinutes: 10,
  interruptionRetained: { numerator: 4, denominator: 5 },
};

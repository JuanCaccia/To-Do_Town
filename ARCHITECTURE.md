#ARCHITECTURE.md - To-Do Town (v1.2)

## 1. Principios Arquitectónicos
**To-Do Town** implementa una **Clean / Hexagonal Architecture** simplificada:
1. **Aislamiento Estricto del Dominio (`src/core`):** 100% TypeScript puro, determinista, sin efectos secundarios. Prohibido importar React, Zustand, Canvas o APIs de almacenamiento dentro de `src/core`.
2. **Determinismo basado en Timestamps:** El progreso *idle* y el decaimiento nunca dependen de los FPS. Toda función del motor recibe `(state: GameState, now: TimestampMs)` y calcula deltas exactos.
3. **Renderizado Isométrico Procedural/Modular Pixel-Perfect (`src/ui/city-canvas`):** La ciudad se dibuja en un `<canvas>` HTML5 2D con `image-rendering: pixelated` y `ctx.imageSmoothingEnabled = false`, ensamblando primitivas y matrices de píxeles en proyección 2:1 (estilo *Habbo Hotel*) coloreadas dinámicamente según el estado del dominio.
4. **Portabilidad y Cheats (ver `GOVERNANCE.md` §2.7):** El respaldo `.todotown` validado con Zod es **funcionalidad de Producción**. La inyección/edición **libre** de JSON y los cheats manuales están restringidos exclusivamente a `import.meta.env.DEV`.

---

## 2. Stack Tecnológico por Etapas
* **Etapa 1 (Web Sandbox):** Vite + React 18 + TypeScript (Strict) + Vitest + Zustand + Tailwind CSS + HTML5 Canvas 2D (Pixel-Perfect) + `IndexedDBAdapter` + Zod.
* **Etapa 2 (Escritorio Nativo):** Tauri v2 + SQLite local (`@tauri-apps/plugin-sql`) + Notificaciones OS + Throttling de ventana.
* **Etapa 3 (Ecosistema Cloud & Mobile):** Sincronización Local-First (Supabase/Postgres) + Cliente Móvil / PWA de captura rápida.

---

## 3. Estructura de Directorios

```text
src/
├── core/                        # CAPA DE DOMINIO (Puro TypeScript - Cero dependencias externas)
│   ├── types/                   # Interfaces del modelo de datos, eventos y configuración
│   ├── constants/               # economyConstants.ts (tasas, costos, checkpoints, pesos)
│   ├── entities/                # Constructores y lógica de Barrios, Hábitos, Cuadras, Globales
│   ├── rules/                   # Fórmulas: decaimiento, fatiga, adyacencia 2x3, corte de día + gracia, pomodoro 80%
│   ├── modifiers/               # ModifierResolver (beneficios de Agua e Inercia Urbana desacoplados)
│   ├── engine/                  # Motor principal (calculateTick, applyAction, undoAction)
│   └── ports/                   # Contratos puros: StoragePort.ts, EventLogPort.ts, IdPort.ts, RandomPort.ts
│
├── adapters/                    # CAPA DE INFRAESTRUCTURA
│   ├── storage/                 # IndexedDBAdapter (Etapa 1: game_state + domain_events en una sola transacción), SQLiteAdapter (Etapa 2), Migraciones
│   ├── dev-tools/               # Inyección/edición LIBRE de JSON + cheats (Activo solo si import.meta.env.DEV === true)
│   └── sync/                    # CloudSyncAdapter (Etapa 3)
│
├── state/                       # CAPA DE APLICACIÓN
│   ├── useGameStore.ts          # Store Zustand + Cola de instantáneas para Undo (5 min)
│   └── useGameLoop.ts           # Reloj de ticks + detector de visibilidad de ventana
│
└── ui/                          # CAPA DE PRESENTACIÓN
    ├── hud/                     # TopBar, DailyBoardDrawer, NeighborhoodInspector, CommandPalette (Ctrl+K), UndoToast
    └── city-canvas/             # Motor Isométrico 2:1 Estilo Habbo
        ├── IsoCamera.ts         # Conversión Cartesiano <-> Isométrico (2:1), Pan & Zoom en múltiplos enteros
        ├── palettes.ts          # Paletas de barrios (Tríos Luz/Base/Sombra) y ciclo Día/Noche
        ├── primitives/          # Bloques Habbo pixel-perfect (drawIsoTile, drawIsoBox, drawIsoRoof, drawIsoWindow)
        └── renderers/           # Renderizadores de Cuadras 2x3, Edificios de Hábitos (Nv.1-5), Acueducto y Props
```

## 4. Especificación del Motor Gráfico Estilo Habbo (`src/ui/city-canvas`)

Para garantizar que la estética _Habbo Hotel_ sea mantenible por código y agentes de IA:

1. **Proyección Matemática 2:1:**
    
    - Conversión de grilla $(gx, gy, gz)$ a pantalla $(sx, sy)$:
        
        $$sx = (gx - gy) \times \frac{\text{TILE\_W}}{2}$$
        
        $$sy = (gx + gy) \times \frac{\text{TILE\_H}}{2} - (gz \times \text{FLOOR\_H})$$
        
    - Dimensiones base del Tile: `TILE_W = 64px`, `TILE_H = 32px` (relación exacta 2:1), `FLOOR_H = 20px` por piso.
        
2. **Escalado Entero (Integer Scaling):** El zoom de la cámara opera en pasos enteros (`1x`, `2x`, `3x`) sobre un buffer de píxeles sin suavizado para evitar distorsión de los bordes de `1px`.
    
3. **Ordenamiento de Profundidad (Painter's Algorithm):** Los elementos se ordenan por $(gx + gy)$ ascendente y luego por $gz$ ascendente antes de dibujarse en el `<canvas>`.
    
4. **Inyección de Paleta por Barrio:** Cada barrio define un `PaletteId`. El renderizador recibe el trío `{ light, base, shadow, outline: '#1A1C23' }` y pinta dinámicamente tejados, toldos y detalles sin requerir archivos de imagen duplicados.

5. **Sistema de "Theme Packs" Desacoplado (`ThemeRegistry`):**
   * Prohibido *hardcodear* el diseño geométrico de las casas o props directamente en el bucle del mapa.
   * El renderizador consulta una interfaz `ArchitecturalThemePack` según el `neighborhood.architecturalThemeId` (paquete activo registrado: `'CLASSIC_DIORAMA'`). Agregar un nuevo pack cosmético en el futuro solo requiere registrar un nuevo archivo en `src/ui/city-canvas/themes/` sin tocar la lógica del mapa.
    

## 5. Modelo de Datos Central (`src/core/types/index.ts`)

TypeScript

```
export type EntityId = string;
export type TimestampMs = number;

// --- NUEVOS TIPOS DE CUENTA, TEMAS Y MONETIZACIÓN ---
export type ArchitecturalThemeId = string; // Registrado en ThemeRegistry; único pack activo: 'CLASSIC_DIORAMA'

export interface UserProfileAndEntitlements {
  userId: string;                        // En uso personal: 'local-owner'
  planTier: 'LOCAL_FREE' | 'CLOUD_SYNC_PRO' | 'PERSONAL_DEV';
  cloudSyncEnabled: boolean;
  unlockedThemes: ArchitecturalThemeId[]; // Por defecto: ['CLASSIC_DIORAMA']
}

// Para que el EventLog de la Etapa 1 y 2 pueda subirse directo a la nube en la Etapa 3:
export interface DomainEventRecord {
  eventId: string;                       // UUID v4
  userId: string;                        // Clave para Row-Level Security (RLS) en Supabase
  deviceId: string;                      // Identifica si vino de 'desktop' o 'mobile'
  timestamp: TimestampMs;
  type: string;
  payload: unknown;
  syncedAt: TimestampMs | null;          // null mientras viva solo en local
}

export interface NeighborhoodPalette {
  id: string;
  name: string;
  roofLight: string;
  roofBase: string;
  roofShadow: string;
  accentPixel: string;
}

export interface DayCycleConfig {
  dayCutoffHour: number;      // Por defecto 0 (00:00 hs)
  gracePeriodHours: number;   // Por defecto 4 (cierra jornada a las 04:00 AM)
}

export interface PomodoroPreset {
  id: string;
  name: string;
  workMinutes: number;        // Ej: 25 o 50
  shortBreakMinutes: number;  // Sugerido: workMinutes / 5
  cyclesBeforeLongBreak: number; // Por defecto: 4
  longBreakMinutes: number | null;
}

export interface UndoSnapshot {
  actionId: string;
  description: string;
  createdAt: TimestampMs;
  expiresAt: TimestampMs;     // createdAt + 5 minutos
  previousState: GameState;
}

export interface TownHall {
  level: 1 | 2 | 3 | 4 | 5;
  qualityOfLifeXP: number;
}

export interface CentralLibrary {
  level: 1 | 2 | 3 | 4 | 5;
  totalPagesRead: number;
}

export interface CentralAqueduct {
  level: 1 | 2 | 3 | 4 | 5;
  totalHistoricalLiters: number;
  dailyLiters: number;
  dailyTargetLiters: number;  // Por defecto: 2.0
  lastOperationalDay: string; // YYYY-MM-DD (ajustado por DayCycleConfig)
}

export interface Neighborhood {
  id: EntityId;
  name: string;
  isTutorial?: boolean;       // True solo para el barrio del Día Cero
  paletteId: string;                     // Eje 1: Color del tejado/detalles
  architecturalThemeId: ArchitecturalThemeId; // Eje 2: Pack cosmético ('CLASSIC_DIORAMA')
  treasuryCoins: number;
  infrastructureLevel: 1 | 2 | 3 | 4;
  urbanizationProgress: number; // 0 a 100
  blocks: CityBlock[];
  decorations: DecorationItem[];
  reactivationPenaltyUntil: TimestampMs | null;
  dailyTasksCompletedCount: number;
  lastOperationalDay: string;
}

export interface CityBlock {
  id: EntityId;
  gridPosition: { x: number; y: number };
  houses: House[];            // Máximo 6 casas (grilla interna 2x3)
  isLeveled: boolean;         // False al nacer hasta pagar Nivelación (300/600/1000 monedas)
}

export interface House {
  id: EntityId;
  lotIndex: 0 | 1 | 2 | 3 | 4 | 5;
  designVariant: 1 | 2 | 3;
  createdAt: TimestampMs;
}

export type HabitFrequency =
  | { type: 'DAILY' }
  | { type: 'TIMES_PER_WEEK'; count: number };

export type HabitCheckpointLevel = 1 | 2 | 3 | 4 | 5; // Pisos: 1, 7, 21, 50, 100 días

export interface HabitBuilding {
  id: EntityId;
  neighborhoodId: EntityId;
  title: string;
  frequency: HabitFrequency;
  currentStreakDays: number;
  checkpointLevel: HabitCheckpointLevel;
  lastCompletedAt: TimestampMs | null;
  createdAt: TimestampMs;                 // Origen de la ventana de enfriamiento (DEC-013)
  // Eficiencia NO persistida: se deriva con getHabitEfficiency(habit, operationalNow, cutoffHour).
  // t = operationalNow - (lastCompletedAt ?? createdAt). Ver GOVERNANCE.md §2.4 (DEC-005/006/012/013).
  status: 'ACTIVE' | 'PAUSED' | 'RETIRED_TO_MUSEUM';
  pauseReason?: string;
  retiredAt?: TimestampMs;
}

export type TaskWeight = 'SIMPLE' | 'STANDARD' | 'COMPLEX'; // +10%, +25%, +50% casa | 20, 50, 100 monedas

export interface OneOffTask {
  id: EntityId;
  neighborhoodId: EntityId;
  title: string;
  weight: TaskWeight;
  boardStatus: 'MASTER_PLAN' | 'IN_CONSTRUCTION' | 'COMPLETED';
  createdAt: TimestampMs;
  completedAt?: TimestampMs;
}

export interface GameState {
  schemaVersion: number;
  account: UserProfileAndEntitlements;
  lastTickAt: TimestampMs;
  lastUserInteractionAt: TimestampMs;
  cityStatus: 'ACTIVE' | 'MANUAL_PAUSE' | 'AUTO_PAUSED_HIBERNATION';
  manualPauseReason?: string;
  config: {
    dayCycle: DayCycleConfig;
    pomodoroPresets: PomodoroPreset[];
  };
  globals: {
    townHall: TownHall;
    library: CentralLibrary;
    aqueduct: CentralAqueduct;
  };
  neighborhoods: Record<EntityId, Neighborhood>;
  habits: Record<EntityId, HabitBuilding>;
  tasks: Record<EntityId, OneOffTask>;
}
```

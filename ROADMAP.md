# ROADMAP.md - Plan de Desarrollo Incremental: To-Do Town (v2.1)

> **Instrucción para Desarrolladores y Agentes de IA:** Este documento gobierna el orden macro de construcción de **To-Do Town**. Queda prohibido instalar dependencias de etapas futuras o avanzar de hito sin haber cumplido al 100% los *Criterios de Salida (Quality Gates)* del hito activo.
>
> **Relación con `BACKLOG.md` y Oráculos de Dominio:**
> * La ejecución diaria dentro de cada hito se realiza mediante **Vertical Slices guiadas por User Stories (`BACKLOG.md`)** y **Ping-Pong TDD (`AGENTS.md`)**.
> * `DOMAIN_DESIGN.md`, `ECONOMY.md` y `ARCHITECTURE.md` actúan como fuentes de consulta bajo demanda (Pull Reference). Prohibido implementar código de historias que aún estén en `[TODO]` (Regla YAGNI).

---

## 1. Filosofía de Ejecución Incremental

El desarrollo se divide en **3 Etapas evolutivas**:
1. **Etapa 1: Web Core & Sandbox (SPA en Navegador)** -> Velocidad máxima de iteración, desarrollo por Vertical Slices con TDD y validación real del dominio.
2. **Etapa 2: Nativo en Escritorio (Contenedor Tauri v2)** -> Bajo consumo de recursos e integración profunda con el SO.
3. **Etapa 3: Ecosistema Sincronizado & Companion Móvil** -> Persistencia en la nube (Local-First Sync) y captura rápida en movimiento.

### Reglas Operativas para Agentes de IA
* **Respeto por la Etapa Activa:** No instalar ni configurar paquetes de la Etapa 2 (ej. Rust/Tauri/SQLite) mientras se esté trabajando en la Etapa 1, ni paquetes de la Etapa 3 (ej. Supabase) antes de cerrar la Etapa 2.
* **Construcción Incremental y Sellado del Core (`src/core`):** Durante el **Hito 1.1**, `src/core` crece historia por historia mediante TDD junto con su UI en el HUD. Una vez superado el *Dogfooding* del Hito 1.1, `src/core` queda **sellado y congelado** para el resto de los hitos y etapas.
* **Bloqueo por Criterio de Salida (Gatekeeping):** No se inicia el desarrollo de un nuevo hito hasta que todos los criterios de salida y tests del hito actual estén verificados al 100%.

---

## 2. Matriz de Evolución por Capas

| Capa del Sistema | Etapa 1: Web Sandbox | Etapa 2: Desktop (Tauri v2) | Etapa 3: Ecosistema Móvil |
| :--- | :--- | :--- | :--- |
| **`src/core` (Dominio)** | Construcción iterativa por Vertical Slices (TDD 100% en Vitest) y sellado tras Dogfooding | **Congelado** (Sin cambios) | **Reutilizado intacto** |
| **`src/adapters/storage`** | `IndexedDBAdapter` + Backup `.todotown` (Prod) + Cheats (`DEV`) | `SQLiteAdapter` (`todo_town.db`) | `SQLite` + `CloudSyncAdapter` (Outbox) |
| **`src/ui/hud`** | Paneles web, `Ctrl+B` (Drawer), `Ctrl+K` (Comandos) y Vista Esquemática | Notificaciones nativas del SO | Vista táctil de carga rápida (1 toque) |
| **`src/ui/city-canvas`** | `IsoCanvas` 2D (Sprites Indexados + Palette Swap + Chunks) | Throttling de FPS en segundo plano | Exclusivo para vista de Escritorio |

---

## 3. Desglose de Etapas, Hitos y Criterios de Salida

### ETAPA 1: Web Core & Sandbox (SPA en Navegador)
**Objetivo:** Construir y validar la totalidad del motor de dominio, la interfaz HUD y el renderizador isométrico 2:1 en un entorno web puro (Vite + React + TypeScript) con recarga instantánea.

#### Hito 1.1: Ciclo de Productividad Completo por Vertical Slices (`src/core` + `IndexedDB` + `HUD`)
> **Modo de Ejecución:** En lugar de programar todo el motor aislado y luego toda la UI, este hito se construye completando secuencialmente las **User Stories (US-00 a US-13) del `BACKLOG.md`**. Cada historia implementa su lógica en `src/core` (con TDD), la conecta a `Zustand` + `IndexedDB` y expone su control en el HUD.

* **Alcance de Dominio (`src/core`) a completar a través de las User Stories:**
  * Implementar constantes económicas (`economyConstants.ts` según `ECONOMY.md` v1.3): Hábitos a `120 monedas/día` (`5/hora`), Tareas a `20/50/100 monedas` (`10%/25%/50%` casa), **Fatiga Laboral de Doble Capa** (5 tareas/barrio y 8 tareas de Estamina Global ampliables con agua), Pomodoro con curva de fatiga diaria (`100m / 200m`) y retención del `80%` al cancelar, costos de nivelación (`300/600/1000 monedas`) y topes efectivos diarios en Agua (`3.0L`) y Lectura (`150 págs`).
  * Implementar reglas de Hábitos: fórmula continua de enfriamiento ($T = \frac{7}{X} \times 24 + 12\text{h} + \text{InerciaUrbana}$), escalones exactos (`0.5T`, `0.75T`, `T`), progresión universal por **Días de Suministro Activo**, Checkpoints (`1, 7, 21, 50, 100`), mudanza entre barrios con confirmación y Cooldown de 7 días al cambiar frecuencia (reiniciando progreso al piso del Checkpoint actual).
  * Implementar separación espacial por barrio: **Plaza de Infraestructura** (Museo + 4 Lotes Productivos para hábitos) y **Cuadras Residenciales** ($2 \times 3$ lotes = 6 casas) con algoritmo de expansión por mayor adyacencia.
  * Implementar lógica de Día Operativo (hora de corte configurable + horas de gracia nocturnas) y reciclaje silencioso de tareas "En Obra" hacia el "Plano Maestro".
  * Incluir en `GameState` el bloque `account` configurado por defecto en modo `PERSONAL_DEV` (con `userId: 'local-owner'` y `unlockedThemes: ['CLASSIC_DIORAMA']`), y validar que toda emisión al `EventLog` (Outbox) adjunte `userId`, `deviceId` y `syncedAt: null`.
  * Implementar Onboarding (Barrio Tutorial que se autodestruye al crear el primer barrio real), Pausa Manual (con motivo obligatorio), Auto-Pause (72h) y sistema de Reversibilidad (Undo de 5 minutos) mediante **Eventos Compensatorios (`CompensatingUndoEntry` / `ACTION_UNDONE`)**.

* **Alcance de Persistencia y HUD (`src/adapters`, `src/state`, `src/ui/hud`) a completar en cada Slice:**
  * Implementar `IndexedDBAdapter` con dos almacenes (`game_state` y `domain_events`), exportador/importador de respaldo `.todotown` validado con Zod (habilitado en **Producción** para futura migración a Tauri) y herramientas de *cheats* restringidas a `import.meta.env.DEV`.
  * Conectar `useGameStore` (Zustand) y `useGameLoop`.
  * Construir las 4 zonas del HUD en React + Tailwind (incluyendo tarjetas esquemáticas de barrio para operar sin mapa gráfico):
    1. **Barra Superior Global:** Ayuntamiento (XP), Agua (`+500ml`/`+1L`), Lectura (`+Págs`), indicador de Estamina Global y Pomodoro personalizable.
    2. **Drawer Lateral ("Pizarra Diaria"):** Alternable con **`Ctrl+B` (o tecla `[`)**, dividido en pestañas "En Obra (Hoy)" y "Plano Maestro (Backlog)".
    3. **Inspector Contextual de Barrio:** Tesorería, Plaza de Infraestructura (4 lotes + Museo), cuadras, mejoras de infraestructura (Niveles 1-4) y mudanzas.
    4. **Barra Inferior y Comandos:** Toast de Reversibilidad (5 min), Modo Zen, botón de Backup `.todotown` y **Command Palette (`Ctrl+K`)**.

* **Criterio de Salida (Gate 1.1 - Dogfooding Temprano y Sellado del Core):**
  * [x] Todas las User Stories de la Épica 1 en `BACKLOG.md` marcadas como `[DONE]`, `npm run typecheck` sin errores, `src/core` con cero imports externos y suite de **Vitest** al 100% en verde. *(Verificado 2026-11-19: US-00 a US-13 `[DONE]`, 436 tests en 53 archivos, `typecheck` limpio, `grep` de imports externos en `src/core` sin resultados. Las deudas registradas —DEV-01, MIG-01, UI-01, DOC-01, VAL-01, UX-02— están cerradas; UX-01 es una decisión permanente, no deuda.)*
  * [ ] **Prueba de uso real de 7 días continuos** operando la aplicación mediante el HUD, calibrando cualquier constante económica en `ECONOMY.md` antes de construir el motor gráfico. *(No es verificable por el agente: depende de 7 días de calendario operando la ciudad real. Es el único criterio de Gate 1.1 todavía abierto.)*

---

#### Hito 1.2: Motor Visual Isométrico 2:1 (`IsoCanvas` - Hi-Bit Diorama)
> **Modo de Ejecución:** Se construye a través de las User Stories de la Épica 2 del `BACKLOG.md`, consumiendo el `src/core` ya sellado en el Hito 1.1.

* **Alcance:**
  * Construir `src/ui/city-canvas` sobre HTML5 `<canvas>` 2D con `image-rendering: pixelated` y proyección isométrica estricta 2:1 (`64x32px` por tile base).
  * Implementar cámara isométrica con *pan* fluido y *zoom* en múltiplos enteros (`1x`, `2x`, `3x`).
  * Implementar arquitectura de **Spritesheets Indexados + `PaletteSwapper` en `OffscreenCanvas`** (bordes oscuros de `1px`, *highlights* de arista de `1px` y reemplazo dinámico del trío de color Luz/Base/Sombra por barrio) junto con **`ChunkManager` (Caché por cuadra y `dirty-flags`)**:
    * Núcleo Cívico (Ayuntamiento Nv.1-5, Gran Biblioteca Nv.1-5, Acueducto y Río isométrico Nv.1-5).
    * Plaza de Infraestructura del barrio (4 lotes de edificios de hábitos Nv.1-5 + Museo) y Cuadras Residenciales de 6 casas (3 variantes de diseño) aplicando el color distintivo del barrio en tejados y detalles.
    * Diferenciación visual de cuadras rústicas (tierra) vs. niveladas (asfalto, bulevar con faroles nocturnos, distrito élite) y botón flotante `[🚧 Nivelar Cuadra]`.
    * Estructurar la carpeta `src/ui/city-canvas/themes/classic-diorama/` implementando el contrato `ArchitecturalThemePack`, garantizando que el mapa renderice cada barrio leyendo dinámicamente su `architecturalThemeId`.
    * Ventanas iluminadas según eficiencia del hábito (`100%`, `66%`, `33%`, `0%`) y **Pulso Verde** en tiempo real sobre fuentes, río y árboles según litros de agua del día.
* **Criterio de Salida de la Etapa 1 (Gate 1.2):**
  * [ ] Ciudad renderizada a 60 FPS durante interacciones de cámara y **0 FPS (0% uso de CPU/GPU)** cuando la escena está estática (`isDirty === false`).

---

### ETAPA 2: Nativo en Escritorio (Tauri v2)
**Objetivo:** Empaquetar la aplicación como un binario de escritorio ultraliviano integrado con el sistema operativo.

#### Hito 2.1: Contenedor Tauri v2, Base de Datos SQLite y Migración
* **Alcance:**
  * Inicializar Tauri v2 e implementar `SQLiteAdapter` (`todo_town.db`) respetando `StoragePort` (tablas para `game_state` y `domain_events`).
  * Migrar el estado real acumulado en la Etapa 1 importando el archivo `.todotown` desde la utilidad de respaldo de producción.
* **Criterio de Salida (Gate 2.1):**
  * [ ] Binario nativo compilado que inicia en menos de 1 segundo manteniendo intacta la ciudad de la Etapa 1.

#### Hito 2.2: Integración OS y Optimización "Companion"
* **Alcance:**
  * Notificaciones nativas del SO (fin de Pomodoro, alerta de hábito al 33%).
  * Soporte limpio de redimensionado para *tiling window managers*, bandeja del sistema (*System Tray*) y **Throttling automático** (pausa total del loop del `<canvas>` cuando la ventana está oculta, minimizada o sin foco).
* **Criterio de Salida de la Etapa 2 (Gate 2.2):**
  * [ ] Consumo en segundo plano inferior a **60 MB de RAM** y **menos del 1% de CPU** en jornadas de 8+ horas.

---

### ETAPA 3: Ecosistema Sincronizado y App Móvil (Companion)
**Objetivo:** Habilitar captura rápida desde el teléfono sincronizada con la ciudad de escritorio.

#### Hito 3.1: Sincronización Cloud vía Outbox (Local-First)
* **Alcance:**
  * Implementar `CloudSyncAdapter` (Supabase / Postgres) sincronizando el estado y la cola `domain_events` (`syncedAt === null`) en segundo plano sin perder velocidad local ni soporte *offline*, soportando la aplicación limpia de eventos compensatorios (`ACTION_UNDONE`).
  * Implementar autenticación en el `CloudSyncAdapter` (vinculando el `local-owner` al `userId` autenticado en la nube) y proteger las tablas remotas mediante políticas *Row-Level Security (RLS)* basadas en `userId` y estado de suscripción (`cloudSyncEnabled`).
* **Criterio de Salida (Gate 3.1):**
  * [ ] Cualquier acción registrada en un cliente secundario impacta en el mapa de escritorio en menos de 2 segundos.

#### Hito 3.2: Cliente Móvil "Control Remoto"
* **Alcance:**
  * Construir interfaz móvil táctil (PWA instalable / vista dedicada que reutiliza `src/core` y `src/state` sin cargar el `city-canvas` pesado).
  * Pantalla de acción en 1 toque: check-in de hábitos, tildado de tareas "En Obra", alta rápida al "Plano Maestro", botones `+500ml`/`+1L` de agua, carga de páginas leídas y tarjetas compactas de estado por barrio.
* **Criterio de Salida Final (Gate 3.2):**
  * [ ] El usuario registra progreso desde el móvil fuera de casa y visualiza el crecimiento urbano y las monedas acreditadas al regresar a su monitor de escritorio.

---

## 4. Comandos Estándar del Proyecto

```bash
npm run test          # Ejecuta la suite de Vitest (obligatorio en cada paso RED / GREEN / REFACTOR)
npm run test:watch    # Ejecuta Vitest en modo interactivo durante sesiones de Pair Programming
npm run typecheck     # Ejecuta tsc --noEmit para validar tipos estrictos en todo el proyecto
npm run dev           # Levanta el entorno de desarrollo web (Etapa 1)
npm run tauri:dev     # Levanta el contenedor de escritorio (Etapa 2+)
npm run tauri:build   # Genera el binario nativo de producción (Etapa 2+)
```

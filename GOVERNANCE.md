# GOVERNANCE.md — Protocolo de Alineación y Gobernanza Técnica

**To-Do Town · v2.5 · SELLADO**

> Documento normativo supremo del repositorio. Ningún otro documento puede contradecirlo: si lo hace, este gana. Toda decisión aquí registrada tiene precedencia sobre la prosa de cualquier oráculo, incluido `AGENTS.md`.

---

## 1. Ley de Precedencia y Dominios de Autoridad

Ningún documento pisa el terreno de otro.

| Documento | Manda sobre | Tiene prohibido legislar |
| :--- | :--- | :--- |
| **`BACKLOG.md`** | Comportamiento y Criterios de Aceptación ejecutables. | Números de modelo, fórmulas económicas, estructura o stack técnico. |
| **`ECONOMY.md`** | Absoluta verdad sobre valores, constantes, tasas y fórmulas. | Comportamiento funcional o tipos de datos de interfaz. |
| **`ARCHITECTURE.md`** | Estructura de carpetas, capas, contratos de puertos y tipos. | Reglas de juego, narrativa o balance económico. |
| **`ROADMAP.md`** | Orden macro de ejecución, hitos y Quality Gates. | Comportamiento de dominio o constantes numéricas. |
| **`DOMAIN_DESIGN.md`** | Narrativa, estética, geografía y filosofía. | Reglas y números (actúa solo como oráculo descriptivo y estético). |
| **`UI_DESIGN.md`** | Materialización visual del HUD en DOM: geometría, paleta, tipografía, interacción y tokens de clase. | Inventario de zonas del HUD, atajos de teclado, arte del lienzo isométrico o valores económicos. |
| **`AGENTS.md`** | Protocolo de Pair Programming, comandos, flujos TDD y ubicación de tests. | Reglas de dominio, fórmulas económicas o estructura del sistema. |

**Frontera `DOMAIN_DESIGN.md` / `UI_DESIGN.md`:** `DOMAIN_DESIGN.md` §6 legisla el **arte del lienzo isométrico**; `UI_DESIGN.md` legisla el **HUD en DOM**. Son dos superficies estéticas distintas por diseño (la ciudad es cálida y pixelada; el HUD es frío y ortogonal). `DOMAIN_DESIGN.md` §7 conserva el **inventario** de zonas del HUD; `UI_DESIGN.md` define cómo se ven. Donde §7 use prosa incompatible (píldoras, paneles flotantes), rige `UI_DESIGN.md` §0.2.

### 1.1. Subordinación de `AGENTS.md`

`AGENTS.md` queda formalmente subordinado a este protocolo. Cualquier mención a rutas de tests obsoletas se lee automáticamente como co-locación por capa (`<capa>/__tests__/`), conforme a §2.3.

### 1.2. Excepción de Fixture / Seed

Los valores de **modelo** (tasas, costos globales, fórmulas de progresión, umbrales de XP) pertenecen exclusivamente a `ECONOMY.md`. Sin embargo, los **valores de inicialización, fixtures de prueba y estados estáticos de bootstrap** definidos en los Criterios de Aceptación (p. ej. el seed del Día Cero, `treasuryCoins: 500`, los lotes `0,1,2`) son **datos de prueba deterministas de esa User Story** y no violan el dominio de ECONOMY.

Cuando un CA de negocio cita una regla económica, ECONOMY manda de forma absoluta y el CA se lee como *"según ECONOMY"*.

---

## 2. Decisiones Arquitectónicas Selladas (Edge & Core)

### 2.1. Persistencia Atómica (Etapa 1)

IndexedDB con dos **object stores** (`game_state` y `domain_events`) en una **única base de datos**, escritos de forma atómica dentro de una **única transacción `readwrite`** (patrón Outbox). Si falla el evento, se revierte el snapshot. `LocalStorage` queda descartado por incapacidad de transacciones multi-store.

### 2.2. Port-First

Todo adapter implementa una interfaz pura previa ubicada en `src/core/ports/` (`StoragePort.ts`, `EventLogPort.ts`, `UnitOfWorkPort.ts`, `IdPort.ts`, `RandomPort.ts`), garantizando que `src/core` mantenga cero dependencias externas.

### 2.3. Co-locación de Tests (TDD)

Los tests unitarios de Vitest viven co-locados junto al código que prueban: `<capa>/__tests__/<archivo>.test.ts`, ya sea en `src/core`, `src/adapters` o `src/state`.

### 2.4. Derivación Pura de la Eficiencia (`currentEfficiency`)

La eficiencia **no se persiste** en el dominio. Se deriva siempre de forma determinista y pura mediante `getHabitEfficiency(habit, operationalNow, cutoffHour)` a partir de `(lastCompletedAt ?? createdAt, frequency, operationalNow)`.

**Origen de la ventana (`t`):** `t = operationalNow − (lastCompletedAt ?? createdAt)`. Un hábito recién creado tiene `t = 0` y por lo tanto nace en **Pleno (1.0)**, conforme a la tabla de ECONOMY §2.1. Nunca existe un estado "apagado hasta el primer check-in": `null` en `lastCompletedAt` significa *nunca cumplido*, no *inexistente*.

**Regla de Oro del Día Operativo Activo:** toda evaluación de decaimiento, enfriamiento y eficiencia usa el **Día Operativo Activo** como referencia de cálculo, nunca el `now` crudo del reloj del sistema. Esto evita transiciones visuales erráticas de los edificios a mitad de la jornada.

**Consecuencia registrada (no se implementa hasta que su US lo exija):** el congelamiento de la ventana durante pausa/hibernación no puede derivarse del reloj de pared. La User Story de pausa deberá introducir el acumulador de tiempo pausado que alimente ese `operationalNow`, o el equivalente que su CA especifique.

### 2.5. Temática Gráfica Oficial

El único tema visual válido y activo es **`CLASSIC_DIORAMA`**. Nomenclaturas antiguas de prosa (p. ej. *Habbo*) quedan descartadas como identificadores.

El `ThemeRegistry` (invariante 5 de `ARCHITECTURE.md`) se mantiene intacto: el motor gráfico no usa literales hardcodeados, consulta al registro, que contiene disponible el paquete `CLASSIC_DIORAMA`. La arquitectura queda lista para futuros temas sin tocar el loop de render.

### 2.6. Puertos de Borde para Aleatoriedad e IDs

La generación de `eventId` (UUID v4) y de variantes estéticas aleatorias (`designVariant`) se resuelve **en el borde** (adapters/state) e ingresa al núcleo puro **como dato de entrada**. `src/core` no genera aleatoriedad ni identidad: preserva determinismo absoluto.

### 2.7. Portabilidad y Cheats

El respaldo **`.todotown`** validado con esquemas Zod es **funcionalidad de Producción**, disponible para todos los usuarios. La **inyección/edición libre de JSON** y los **cheats manuales** quedan estrictamente acotados a `import.meta.env.DEV === true`.

---

## 3. Registro de Resoluciones (DEC)

| ID | Resolución | Impacta |
| :--- | :--- | :--- |
| **DEC-001** | Jerarquía de autoridad de 6 documentos; `AGENTS.md` subordinado. | Todos |
| **DEC-002** | `IndexedDBAdapter` reemplaza a `LocalStorageAdapter` en Etapa 1. | `ARCHITECTURE.md` §2, §3 |
| **DEC-003** | Port-First: contratos puros en `src/core/ports/` antes que adapters. | `ARCHITECTURE.md` §3 |
| **DEC-004** | Tests co-locados por capa; se anula la restricción a `src/core` exclusivamente. | `AGENTS.md` §2 |
| **DEC-005** | Eficiencia derivada; `currentEfficiency` sale del tipo persistido. | `ARCHITECTURE.md` §5, `BACKLOG.md` |
| **DEC-006** | Eficiencia canónica exacta `{1, 2/3, 1/3, 0}`. Los valores `66% / 33% / 3.33 / 1.66` son presentación redondeada, no estado. Las monedas se acumulan como fracción y se truncan al liquidar el Día Operativo. | `ECONOMY.md` §2.1 |
| **DEC-007** | Tema único registrado `CLASSIC_DIORAMA`; `ThemeRegistry` se conserva. | `ARCHITECTURE.md`, `BACKLOG.md` |
| **DEC-008** | Azar e identidad (`designVariant`, `eventId`) se inyectan desde el borde al core. | `ARCHITECTURE.md` §5 |
| **DEC-009** | `.todotown` con Zod = Producción; JSON libre y cheats = `DEV`. | `ARCHITECTURE.md` §1.4 |
| **DEC-010** | Excepción Fixture/Seed: los valores de bootstrap pertenecen a su US. | `BACKLOG.md` |
| **DEC-011** | `DOMAIN_DESIGN.md` no legisla reglas ni números. | `DOMAIN_DESIGN.md` |
| **DEC-012** | Día Operativo Activo como única referencia de decaimiento. | `ARCHITECTURE.md`, `BACKLOG.md` |
| **DEC-013** | `HabitBuilding.createdAt` es el origen de la ventana: `t = operationalNow − (lastCompletedAt ?? createdAt)`. Un hábito nuevo nace en Pleno (1.0). Se anula la lectura "apagado hasta el primer check-in". | `ARCHITECTURE.md`, `BACKLOG.md`, `GOVERNANCE.md` §2.4 |
| **DEC-014** | Quinto puerto `UnitOfWorkPort` (`commit(state, event)`). La escritura atómica snapshot + evento se expone como **garantía nombrada** en lugar de esconderse dentro de `EventLogPort` o de componerse con `saveState` + `appendEvent` sueltos. Un puerto cuya razón de existir es la atomicidad hace visible el único camino correcto a través del Outbox. | `ARCHITECTURE.md` §3, `src/core/ports`, `BACKLOG.md` US-01 |
| **DEC-015** | Se incorpora **`UI_DESIGN.md`** como séptimo documento normativo, con dominio propio: materialización visual del HUD en DOM. **Supersede el conteo de seis documentos de DEC-001**; la subordinación de `AGENTS.md` sigue vigente. Se fija la frontera `DOMAIN_DESIGN.md` §6 (arte del lienzo) / `UI_DESIGN.md` (chrome DOM) y se resuelven las divergencias con `DOMAIN_DESIGN.md` §7: radio cero sustituye "píldoras", módulos adosados sustituyen "paneles flotantes", y el atajo del Drawer es `Ctrl+B` / `[` porque `Tab` pertenece a la navegación por foco. El sistema se denomina **Odyssey OS**. | `UI_DESIGN.md`, `DOMAIN_DESIGN.md` §7, `AGENTS.md` §1, `src/ui/hud` |
| **DEC-016** | `calculateTick(state, now)` nace en **US-05** como **orquestador de jornada**: detecta el cambio de día operativo y ejecuta el reciclaje nocturno (tareas `IN_CONSTRUCTION` → `MASTER_PLAN`, reset de contadores diarios de barrio, estamina global y `dailyLiters`). **No liquida producción pasiva.** US-07 CA-03 es dueña de esa liquidación y **extiende** ese mismo `calculateTick`; tiene prohibido crear un tick paralelo o duplicar la detección de jornada. | `BACKLOG.md` US-05, US-07 |
| **DEC-017** | La **validación de entrada de texto pertenece al borde** (formularios del HUD y adaptadores de entrada), nunca a `src/core`. El dominio recibe datos ya normalizados y no valida `title` vacío ni rangos cosméticos: sus uniones de resultado se reservan para **reglas de negocio** (capacidad, cooldown, estado, saldo), no para strings. Formaliza la decisión ya tomada por separado en US-02 CA-01 y US-06 CA-01, y evita contaminar los tests de dominio con lógica de presentación. Precedente implementado: `HabitPlaza` recorta el título, corta si queda vacío y deshabilita el envío. | `BACKLOG.md` US-02, US-06, `src/ui/hud` |
| **DEC-018** | **Latido técnico vs. mutación de negocio.** El paso del tiempo físico no es un evento de negocio. `calculateTick` devuelve **la misma referencia de estado** — sin evento, sin clonar — cuando ninguna regla de dominio mutó el estado; `lastTickAt` se lee en consecuencia como *"último instante liquidado"*, no *"último instante observado"*. Corolario: el discriminador es **igualdad de estado resultante**, nunca *"¿cambiaron las monedas?"* (la caída a Apagón de US-07 CA-04 es una mutación real sin producción) y nunca una marca persistida (el retroceso al piso es idempotente). Complemento de precisión: la liquidación **no trunca** a entero; acumula el resto por barrio (`ECONOMY.md` §2.1.2). | `BACKLOG.md` US-07 CA-03/CA-04, `ECONOMY.md` §2.1.2, `src/core/rules/calculateTick.ts`, `src/state/useGameStore.ts` |
| **DEC-019** | **Ninguna acción muta sobre un estado sin liquidar.** Las acciones del store leen el estado **exclusivamente** por `requireSettledState()` (`src/state/useGameStore.ts`), que compone `settlePassiveProduction` + `applySafeFloor`, en ese orden. No es una llamada a `tick()` ni una lista mantenida a mano: el `requireState` crudo **no existe**, así que el compilador fuerza el camino y enumerar "cuáles tocan la eficiencia" deja de ser una obligación de disciplina. Motivo: la eficiencia es derivada de `(lastCompletedAt, frequency, infrastructureLevel, now)`, así que liquidar una ventana después de que la regla reescribió cualquiera de esas entradas **recalcula el pasado** a favor o en contra del usuario (`completeHabitToday` puede sobrepagar el tramo ya devengado; `moveHabit` a un barrio Nv.1 puede convertirlo en Apagón; `upgradeInfrastructure` lo recategoriza hacia arriba por Inercia Urbana). No se corrige partiendo el intervalo en `0.5T / 0.75T / T`, porque los cortes se movieron junto con las entradas. **"Liquidar" son las dos consecuencias del paso del tiempo**: lo devengado (monedas) y lo castigado (retroceso al piso seguro, CA-04). Sin el piso, un `completeHabitToday` sobre un hábito que ya cayó en Apagón **resucita la racha entera** — medido: 36 días en vez de 22. El orden tampoco es cosmético: `applySafeFloor` adelanta `lastTickAt` cuando muta, así que si corriera antes de liquidar dejaría el intervalo sin cobrar. **La liquidación se pliega en el commit de la acción**, nunca en un commit previo: `UnitOfWorkPort.commit(state, event)` persiste snapshot + evento en la misma transacción, así que el estado y el evento son atómicos y una acción no emite un `PASSIVE_PRODUCTION_SETTLED` extra. Si la acción se rechaza, la liquidación se difiere: es determinista sobre `lastTickAt`, así que no se pierde nada. **Corregido (2026-11-15):** esta fila afirmaba que `tick()` era el primer paso de cada acción y que se producían **dos** commits no atómicos entre sí; ambas cosas describían el diseño que se descartó al abrir `UnitOfWorkPort`. | `src/state/useGameStore.ts`, `BACKLOG.md` US-07 CA-03/CA-04, `ECONOMY.md` §2.1.2 |
| **DEC-020** | **El tope diario de hidratación y lectura no pertenece a US-08.** US-08 CA-01 dice que el registro de agua incrementa `dailyLiters` y `totalHistoricalLiters` *"respetando el tope diario regulado por el sistema"*, pero ese tope **no lo declara US-08**: es **US-09 CA-01** (agua y 150 págs/día, con reinicio de cupos en el corte de jornada). Decisión: US-08 CA-01 **acredita sin recortar** y US-09 CA-01 es dueña única del *hard cap* y lo envuelve — mismo patrón que DEC-016. Corolario para CA-02: `totalPagesRead` se suma sin cupo diario, porque "páginas del día" sigue diferido a US-09 (`§4`). Corolario para CA-04: US-08 **registra la sesión y dispara** la liquidación; la curva de fatiga mental `F_día` y la regla del 80% son **US-09 CA-03/CA-04**. US-08 tampoco inventa la penalización de Arranque de Motores (`M_barrio`), que es de US-11. | `BACKLOG.md` US-08 CA-01/CA-02/CA-04, US-09, `src/core/rules`, `src/core/constants/economyConstants.ts` |
| **DEC-021** | **El cupo diario de agua no supera su meta: 2.0 L/día.** `ECONOMY.md` §3 fijaba meta `2.0 L` y *hard cap* `3.0 L`, y el HUD mostraba `dailyLiters / dailyTargetLiters` —de ahí el `3.0/2.0 L` que no significa nada para el usuario—. Decisión del dueño del proyecto: el tope es **2.0 L**, el mismo número que la meta, para que el denominador del HUD sea el cupo real y no una meta que se puede desbordar. Consecuencias: `WATER_DAILY_HARD_CAP_LITERS = 2`; `ECONOMY.md` §3 y US-09 CA-01 pasan a 2.0; los bonos de US-09 CA-02 (`1.0 L` y `2.0 L`) quedan intactos porque ya topeaban en la meta; y `normalizeSavedState` recorta un `dailyLiters` heredado por encima del cupo para que un snapshot previo a esta decisión no muestre `3.0/2.0` hasta el próximo corte de jornada. | `ECONOMY.md` §3, `BACKLOG.md` US-09 CA-01, `src/core/constants/economyConstants.ts`, `src/state/hydrateGameState.ts` |
| **DEC-022** | **Ratificación de `UI_DESIGN.md` v2.3 y su relación con este documento.** Tres resoluciones. **(1) Atajos — este documento es rector.** DEC-015 fija el atajo del Drawer en **`Ctrl+B`** con **`[`** como acelerador secundario. La regla 1 de `UI_DESIGN.md` §4.4 (prohibía `[` sin modificador) y su regla 2 (nombraba `Ctrl+B` entre las combinaciones vedadas) **se leen con esa excepción registrada**: la v2.3 no revoca un `DEC`, lo documenta. Se sostiene porque la regla 4 se cumple —hay lanzador visible, `[` acelera un control ya presente— y el costo se acepta explícitamente: en Chrome y Firefox `Ctrl+B` alterna la barra de marcadores; revertir la combinación exige un `DEC` nuevo, nunca un cambio silencioso en el HUD o en el documento. `Tab` queda fuera del HUD: es navegación por foco. **(2) Estados de tarea — el dominio es la única fuente.** `UI_DESIGN.md` §8.1 se corrige a la proyección **cerrada** de `OneOffTask.boardStatus` (`MASTER_PLAN` / `IN_CONSTRUCTION` / `COMPLETED`). Se descartan `EN CURSO` y `VENCIDA`: el tipo no declara un estado intermedio ni `dueDate`, y el producto no castiga la acumulación (`DOMAIN_DESIGN.md` §1). Un estado nuevo entra **primero** al tipo y a su `DEC`, después a la tabla visual. **(3) Vigencia — trinquete por archivo.** La v2.3 se aprueba como contrato; el HUD heredado no la implementa (cero `data-surface`/`<Zone>`/roles en `src/ui`). Hasta cerrar `BACKLOG.md` `MIG-02`: un cambio no puede aumentar los hallazgos de §11 en los archivos que toca, un archivo migrado debe quedar en cero, y la auditoría de árbol completo es gate recién al cierre de `MIG-02`. "Migración pendiente" no autoriza patrones nuevos: el trinquete baja, no sube. | `UI_DESIGN.md` §0.3, §4.4, §8.1, §11, `BACKLOG.md` MIG-02 y US-04 |
| **DEC-023** | **Adopción de `UI_DESIGN.md` v2.4.** Sustituye la versión visual de v2.3 **sin revocar ninguna de las tres resoluciones de DEC-022**, que se re-aplican literalmente: atajos (`Ctrl+B` / `[` con excepción registrada), estados cerrados a `OneOffTask.boardStatus` y trinquete por archivo hasta `MIG-02`. Deltas registrados: la superficie `light` pasa de `#ececec` a `#d4d4d4` y **se abandona la clase `pearl`** —el rol es `surface`—; el acento pasa de `#b91c1c` a `#e11d2e`, con `accent-ink` `#ff4d5e` sobre negro y `#a5121f` sobre perla; la línea del contexto `light` se corrige de `#9c9c9c` a `#757575` (1.9:1 → 3.1:1) porque la retícula porta significado y §9 exige 3:1; **tipografía mono única** (sin `font-sans`) y jerarquía por tamaño y tono en lugar de peso; se incorporan el **bisel de zona** (`border-t-2 edge-hi` / `border-b-6 edge-lo`), la **retícula de celdas** de 1px y los roles `fill` / `on-fill`. Verificado: los contrastes de §2.5 dan exacto y `border-b-6` compila en Tailwind 4 (ancho dinámico). "Perla" queda como nombre del contexto `light`, no como valor de color. | `UI_DESIGN.md` §0.3, §2.4, §2.5, §5, §8.1, §11, `BACKLOG.md` MIG-02, `src/index.css` |

---

## 4. Decisiones Diferidas por YAGNI (no legislar todavía)

Ninguna de estas se resuelve por adelantado; se especifican cuando la User Story que las exige entre en `[IN PROGRESS]`:

- Estado global diario (estamina global, `F_día`, páginas del día, `lastOperationalDay` global) → US-05 / US-09.
- Formato interno de `.todotown`, `schemaVersion` y política de migraciones → US-12.
- Catálogo de `DecorationItem`, lotes productivos y Museo → US-06.
- Firmas completas de `StoragePort` / `EventLogPort` / `IdPort` / `RandomPort` → US-01.
- Acumulador de tiempo pausado para `operationalNow` → User Story de pausa/hibernación.
- Épicas y User Stories posteriores al Hito 1.1 → `ROADMAP.md`.

---

## 5. Modificación de este Documento

Este protocolo solo cambia por decisión explícita del humano dueño del proyecto, registrada aquí como nuevo `DEC-XXX`. Un agente no puede alterarlo por inferencia, conveniencia ni "consistencia" con otro documento. Ante ausencia de decisión, rige `§4`: se difiere, no se inventa.

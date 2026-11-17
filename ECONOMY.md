# ECONOMY.md - Especificación Matemática y Balance To-Do Town (v1.3)

> **Propósito:** Este documento centraliza todas las constantes, fórmulas, topes anti-exploit y curvas de progresión de **To-Do Town**. Ningún componente fuera de `src/core/rules` y `src/core/constants` puede definir valores económicos.

---

## 1. Principios del Modelo Económico
1. **Economía Anclada al Tiempo Real (Time-Anchored):** La unidad base de valor es **1 Hora de Hábito Activo = 5 Monedas** (`120 monedas/día`).
2. **Cero Inflación Vertical:** Ninguna mejora ni nivel multiplica la ganancia de monedas. El progreso se refleja en expansión territorial, nivel de urbanismo y prestigio global (XP).
3. **Protección contra Exploits (Topes y Fatiga Dual):** Todas las fuentes de ingresos activos o autodeclarados poseen curvas de rendimientos decrecientes o topes diarios estrictos.

---

## 2. Ingresos de Monedas Locales (Tesorería por Barrio)

### 2.1. Producción Pasiva de Hábitos (Idle)
Cada hábito activo genera monedas para su barrio según su porcentaje de eficiencia actual ($E \in \{1,\ \tfrac{2}{3},\ \tfrac{1}{3},\ 0\}$ — valores **exactos**; los `66%` / `33%` y las tasas `3.33` / `1.66` de la tabla son su presentación redondeada, ver `GOVERNANCE.md` DEC-006) y el multiplicador del barrio ($M_{\text{barrio}} \in \{1.0, 0.5\}$ por *Arranque de Motores*):

| Estado del Hábito | Eficiencia ($E$) | Tasa por Hora | Tasa por Día (24h) |
| :--- | :--- | :--- | :--- |
| **Pleno ($0 \le t \le 0.5T$)** | `100%` | **5.00 monedas/h** | **120 monedas/día** |
| **Desgaste ($0.5T < t \le 0.75T$)** | `66%` | **3.33 monedas/h** | **80 monedas/día** |
| **Crítico ($0.75T < t < T$)** | `33%` | **1.66 monedas/h** | **40 monedas/día** |
| **Apagón ($t \ge T$)** | `0%` | **0.00 monedas/h** | **0 monedas/día** |

#### 2.1.1. Ventana de Enfriamiento ($T$), Inercia Urbana y Cooldown de Frecuencia

La eficiencia se mide contra una ventana $T$ (en horas) que corre desde el **último cumplimiento** del hábito (`lastCompletedAt`) o, si nunca se cumplió, desde su **creación** (`createdAt` — `GOVERNANCE.md` DEC-013). Un hábito recién creado nace **en Pleno** ($E = 1.0$).

$$T = \left(\frac{7}{X} \times 24\right) + 12\text{h} + \text{InerciaUrbana}$$

- $X$ es el `count` de la frecuencia declarada (`TIMES_PER_WEEK`, de 1 a 6).
- Para `DAILY` no hay curva escalonada: la ventana es la del **switch diario**, $T = 24\text{h} + 4\text{h} + \text{InerciaUrbana}$, y el hábito pasa de $1.0$ a $0.0$ al vencer. El margen de gracia del switch diario queda fijado en **`4 h`** (US-07 CA-01, decisión del 2026-11-15) como `HABIT_DAILY_GRACE_HOURS` en `economyConstants.ts`. Resultado: $T = 28$ h en Nv.1 y $34$ h en Nv.4.
- **El margen de gracia del switch diario NO es `config.dayCycle.gracePeriodHours`.** Ese último (US-05 CA-01) desplaza el reloj para decidir la jornada operativa y es **configurable por el usuario**; este margen es una duración económica **fija** medida desde `lastCompletedAt`. La coincidencia numérica en `4 h` es deliberada; compartir la constante acoplaría el decaimiento de los hábitos a una preferencia de calendario.
- `InerciaUrbana` es el bono por nivel de infraestructura del barrio, ya declarado en **§4.1**: `+0 h` (Nv.1), `+2 h` (Nv.2), `+4 h` (Nv.3), `+6 h` (Nv.4).

**Cooldown de cambio de frecuencia:** editar la `frequency` de un hábito inicia un cooldown de **7 días** (`7 × 24 h` exactas, medido en milisegundos, no en jornadas operativas). Mientras corre, el motor rechaza cualquier nuevo cambio con `FREQUENCY_COOLDOWN_ACTIVE`; al cumplirse exactamente los 7 días el cambio vuelve a estar permitido. El cambio **no recalcula ni destruye** eficiencia: al ser derivada de `(lastCompletedAt, frequency, now)`, se recalcula por construcción (US-06 CA-03).

### 2.1.2. Precisión Monetaria: Acumulador de Resto

La liquidación pasiva produce fracciones: `5.00 monedas/h` dividido en ticks de un minuto da `0.083` monedas por tick. **Queda prohibido truncar la liquidación a monedas enteras**: el valor no cobrado se pierde y la economía deja de cumplir §2.1.

- **Dónde vive el resto:** un acumulador por **barrio** (`Neighborhood.pendingCoinsRemainder`), no por hábito. La tesorería es el destino del crédito y existe mientras exista el barrio; un acumulador por hábito se perdería al mudarlo de distrito (US-06 CA-04) o al retirarlo al Museo (US-06 CA-05), porque ninguna de las dos operaciones mueve ni liquida monedas.
- **Regla de acreditación:** en cada liquidación las fracciones devengadas se **suman** al acumulador del barrio. Cuando `pendingCoinsRemainder >= 1`, se acredita `floor(pendingCoinsRemainder)` en `treasuryCoins` y el acumulador conserva la parte fraccionaria exacta.
- **Invariante:** `treasuryCoins` nunca recibe fracciones; el acumulador nunca se redondea hacia arriba ni se descarta. Un barrio con hábitos activos devengando siempre converge a cobrar la tasa completa de §2.1.
- **Precisión:** la del `number` de JavaScript. No se introduce tipo decimal ni librería externa (`AGENTS.md` §3, pureza de `src/core`).

### 2.2. Recompensas por Tareas Únicas (Activas)
Completar una tarea acredita monedas al barrio y suma puntos a la **Barra de Urbanización** (`100% = 1 Casa Nueva`):

| Peso de Tarea (`TaskWeight`) | Progreso de Casa Base | Monedas Base (100%) | Equivalencia en Tiempo Idle |
| :--- | :--- | :--- | :--- |
| **`SIMPLE` (Rápida)** | `+10%` | **20 monedas** | 4 horas de hábito al 100% |
| **`STANDARD` (Estándar)** | `+25%` | **50 monedas** | 10 horas de hábito al 100% |
| **`COMPLEX` (Compleja)** | `+50%` | **100 monedas** | 20 horas de hábito al 100% |

> **Invariante de Cuadra:** Generar las **6 casas** de una cuadra completa requiere acumular `600%` de barra de urbanización, lo que inyecta una base nominal de **1.200 monedas** al barrio.

### 2.3. Sistema de Fatiga Laboral de Doble Capa (Tareas)
Para evitar tanto el spam en un solo barrio como la creación artificial de múltiples barrios pequeños, el multiplicador de recompensa de una tarea ($M_{\text{fatiga}}$) es el **mínimo** entre la disponibilidad del barrio y la **Estamina Global Diaria** de la ciudad:

$$B_{\text{agua}} = \min(2, \lfloor \text{LitrosAguaHoy} \rfloor) \quad (\text{Bono máximo: +2 tareas})$$

| Tramo de Rendimiento | Cupo por Barrio ($N_{\text{barrio}}$) | Cupo Global Ciudad ($N_{\text{global}}$) | Multiplicador ($M_{\text{fatiga}}$) |
| :--- | :--- | :--- | :--- |
| **1. Tramo Óptimo** | Tareas `1` a `(5 + B_agua)` | Tareas `1` a `(8 + B_agua)` | **`1.0` (100% monedas y progreso)** |
| **2. Tramo de Fatiga** | Tareas siguientes (`+5` tareas) | Tareas siguientes (`+6` tareas) | **`0.5` (50% monedas y progreso)** |
| **3. Agotamiento** | Excedente posterior | Excedente posterior | **`0.1` (10% simbólico)** |

### 2.4. Ingresos por Sesiones Pomodoro (Con Curva de Fatiga de Foco)
Los minutos de Pomodoro se contabilizan en un **acumulador global diario de foco** ($F_{\text{día}}$) para impedir el farmeo infinito dejando correr el reloj:

| Minutos Acumulados en el Día ($F_{\text{día}}$) | Estado de Foco | Monedas por Minuto (al Barrio) | XP Global (al Ayuntamiento) |
| :--- | :--- | :--- | :--- |
| **Minuto `1` al `100`** (Ej: 4 Pomos de 25m) | **Foco Óptimo (100%)** | **2.0 monedas / min** | **1 XP cada 5 min** (Máx 20 XP) |
| **Minuto `101` al `200`** | **Fatiga Mental (50%)** | **1.0 moneda / min** | **1 XP cada 10 min** (Máx 10 XP) |
| **Minuto `201` en adelante** | **Agotamiento (10%)** | **0.2 monedas / min** | **0 XP** |

* **Fórmula por Interrupción (Regla del 80%):** Si un bloque se cancela antes de terminar, los minutos efectivos a liquidar en la tabla superior son:
  $$\text{MinutosEfectivos} = \lfloor \text{MinutosTranscurridos} \times 0.80 \rfloor$$

---

## 3. Topes en Suministros Globales Autodeclarados

| Suministro Global | Acción de Entrada | Meta Diaria Sugerida | Tope Efectivo Diario (Hard Cap) | Efecto Mecánico Diario e Histórico |
| :--- | :--- | :--- | :--- | :--- |
| **Agua (Acueducto)** | `+0.5 L` / `+1.0 L` | `2.0 L` | **`2.0 L / día`** | `1.0L` = +1 tarea óptima y Pulso Verde Nv.1.<br>`2.0L` = +2 tareas óptimas, Pulso Verde pleno y anula *Arranque de Motores*.<br>Máximo `2.0L/día` sumables al histórico del Acueducto (**DEC-021**: el cupo no supera la meta y el HUD muestra el cupo como denominador). |
| **Lectura (Biblioteca)** | Input numérico | `20 - 30 págs` | **`150 págs / día`** | Cualquier ingreso superior a 150 páginas en un mismo día operativo acredita únicamente hasta el tope de `150 págs` en la Gran Biblioteca. |

---

## 4. Egresos del Barrio (Costos de Urbanización y Decoración)

### 4.1. Mejora del Estándar de Infraestructura del Barrio
El costo de subir un barrio al siguiente nivel estético escala según la cantidad de cuadras ya niveladas ($C_{\text{niveladas}}$) que posea ese barrio:
$$\text{CostoUpgrade} = \text{CostoBase} + (\text{RecargoPorCuadra} \times C_{\text{niveladas}})$$

| Nivel de Infraestructura | Costo Base | Recargo por Cuadra ($C_{\text{niveladas}}$) | Costo de "Nivelar Cuadra Nueva" | Bono de Inercia Urbana |
| :--- | :--- | :--- | :--- | :--- |
| **Nivel 1: Rústico (Tierra)** | Gratis | `0` | N/A (Nacen en Nivel 1) | `+0 horas` en $T$ |
| **Nivel 2: Urbano (Asfalto)** | **600 🪙** | `+200 🪙` | **300 🪙** | **`+2 horas` en $T$** |
| **Nivel 3: Bulevar (Faroles/Árboles)**| **1.500 🪙** | `+400 🪙` | **600 🪙** | **`+4 horas` en $T$** |
| **Nivel 4: Distrito Élite** | **3.500 🪙** | `+800 🪙` | **1.000 🪙** | **`+6 horas` en $T$** |

### 4.2. Catálogo de Decoraciones Puntuales (Por Barrio)
* **Plaza Pequeña / Arboleda:** **`500 🪙`** $\rightarrow$ Otorga **`+25 XP Global`**.
* **Parque con Fuente (Reactivo al Agua):** **`1.200 🪙`** $\rightarrow$ Otorga **`+60 XP Global`**.
* **Monumento Cívico del Barrio:** **`2.500 🪙`** $\rightarrow$ Otorga **`+125 XP Global`**.

---

## 5. Tablas de Nivel de Edificios Centrales y XP Global

### 5.1. Tabla de Fuentes de XP Global (Calidad de Vida)
* **Nueva Casa Residencial generada:** `+10 XP`
* **Cuadra Nueva Nivelada:** `+30 XP`
* **Mejora de Estándar de Barrio (Nv.2 / Nv.3 / Nv.4):** `+50 / +120 / +300 XP`
* **Desbloqueo de Checkpoint de Hábito (Primera vez por nivel en cada hábito):**
  * *Nivel 2 (Día 7):* `+25 XP`
  * *Nivel 3 (Día 21):* `+50 XP`
  * *Nivel 4 (Día 50):* `+100 XP`
  * *Nivel 5 (Día 100):* `+250 XP`
* **Retiro de Hábito Nivel 5 al Museo con Honores:** `+300 XP`

### 5.2. Escalas de Evolución de los 3 Edificios Globales

| Nivel | Ayuntamiento (XP Global) | Gran Biblioteca (Páginas) | Acueducto Central (Litros) | Hito Visual del Acueducto |
| :--- | :--- | :--- | :--- | :--- |
| **Nivel 1** | `0 XP` | `0 págs` | `0 L` | Tanque de madera elevado |
| **Nivel 2** | `100 XP` | `100 págs` | `15 L` | Torre de ladrillo y bomba |
| **Nivel 3** | `350 XP` | `500 págs` | `60 L` | Acueducto de arcos + Canal |
| **Nivel 4** | `1.000 XP` | `1.500 págs` | `200 L` | Río navegable con puentes |
| **Nivel 5** | `2.500 XP` | `5.000 págs` | `500 L` | Gran Lago y Costanera Central |

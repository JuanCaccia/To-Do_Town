#DOMAIN_DESIGN.md - To-Do Town (Especificación Definitiva v1.2)

## 1. Visión General y Filosofía de Diseño
**To-Do Town** es un gestor de tareas y hábitos gamificado bajo el formato de un *Ambient/Companion Idle-City Builder* con estética **Isométrica Pixel-Perfect (estilo Habbo Hotel / eBoy)**. Está diseñado para permanecer abierto en el escritorio acompañando la jornada del usuario, complementado a futuro con una interfaz móvil ligera de captura rápida.

### Pilares Fundamentales
* **El progreso solo nace del progreso:** No existen castigos destructivos ni demolición de estructuras por fallar. La falta de constancia detiene la producción y apaga visualmente los edificios, pero todo lo construido permanece.
* **Economía horizontal y sin inflación (Anclada al Tiempo):** Mejorar el aspecto de la ciudad no multiplica artificialmente la ganancia de monedas. Una tarea o hábito vale lo mismo el día 1 que el día 500; los recursos sirven para urbanizar, dar vida visual al mapa y elevar el prestigio global de la ciudad.
* **Cero culpa por acumulación:** Se separa el listado general de pendientes (*Plano Maestro*) de las tareas activas del día (*En Obra*), evitando la frustración de acumular tareas vencidas.

---

## 2. Geografía, Estructura Urbana y Onboarding

### 2.1. El Día Cero (Onboarding y Barrio Tutorial)
* La primera vez que el usuario abre la aplicación sin datos previos, la ciudad presenta el **Ayuntamiento Nivel 1** acompañado de un **Barrio Tutorial** pre-cargado que explica de forma interactiva y visual las mecánicas (hábitos, tareas, agua y nivelación).
* En el instante en que el usuario crea su primer Barrio real personalizado, el Barrio Tutorial se desmonta y elimina automáticamente de la ciudad.

### 2.2. Edificios e Infraestructuras Centrales (Globales)
Se ubican en el Núcleo Cívico central del mapa y representan el progreso general del usuario:
* **El Ayuntamiento:** Corazón de la ciudad. Sube de nivel acumulando **Índice de Calidad de Vida (XP Global)**.
* **La Gran Biblioteca:** Edificio especial que evoluciona exclusivamente en función del **total histórico de páginas leídas** registradas.
* **El Acueducto Central y Red Hídrica:** Infraestructura global que evoluciona según el **total histórico de litros de agua registrados** y regula en tiempo real el caudal del río, las fuentes y el verdor de toda la ciudad (*Pulso Verde*) según la hidratación del día.

### 2.3. Los Barrios (Ámbitos de Vida)
Cada categoría de productividad (ej. *GYM*, *Estudio*, *Programación*, *Hogar*) constituye un **Barrio** independiente:
* **Distribución espacial dinámica:** Nacen como núcleos separados alrededor del centro cívico. Al crecer en cuadras, el mapa reacomoda y desplaza orgánicamente a los barrios vecinos para evitar solapamientos.
* **Economía estanca:** Cada barrio posee su propia tesorería local (`treasuryCoins`). Las monedas generadas en un barrio solo pueden gastarse en ese mismo barrio.
* **Identidad Cromática:** Al crear un barrio, se le asigna un color distintivo de una paleta curada. Este color se aplica en tejados, toldos, marquesinas y detalles urbanos en todas las mejoras y niveles.
* **Doble Capa de Personalización Visual:** Cada barrio separa su apariencia en dos ejes independientes:
  1. **Paleta Cromática (`paletteId`):** El color distintivo aplicado a tejados y detalles (incluido en el juego base).
  2. **Tema Arquitectónico (`architecturalThemeId`):** La morfología de los bloques y "furnis" (por defecto `CLASSIC`, extensible mediante packs cosméticos como `CYBERPUNK_NEON`, `JAPANESE_EDO`, `MEDIEVAL_STONE`, etc.).
* **Mudanza de Hábitos:** Un hábito activo puede mudarse de un barrio a otro mediante confirmación explícita. El edificio se traslada con su nivel y racha intactos para empezar a producir en el barrio destino, pero las monedas ya generadas en el pasado permanecen en la tesorería del barrio de origen.

### 2.4. Las Cuadras y las Casas
* **Composición de la Cuadra:** Cada cuadra es una bandeja isométrica de $2 \times 3$ lotes con capacidad para exactamente **6 Casas**.
* **Variedad visual:** Al nacer una casa, se le asigna aleatoriamente uno de los **3 diseños base** disponibles, manteniendo el color de tejado/acento del barrio.
* **Algoritmo de expansión:** Cuando una cuadra completa sus 6 casas y nace la séptima, se inaugura una cuadra nueva en estado rústico (tierra). Se ubica automáticamente de forma compacta y homogénea, priorizando la coordenada libre con **mayor cantidad de cuadras lindantes** del mismo barrio.

---

## 3. Entidades de Productividad y Reglas de Progreso

### 3.1. Hábitos (Edificios Productivos)
Cada hábito activo es un edificio especial de infraestructura en su barrio. Mientras está activo, permanece iluminado y produce monedas de forma pasiva (*idle*).

* **Frecuencias y Curva de Suministro (Decaimiento):**
  * **Diarios (Switch On/Off):** Producen al **100%** durante 24 horas tras cumplirse. Si no se renuevan al día siguiente, caen a **0%** (Apagón) y cortan racha.
  * **$X$ veces por semana (Tanque de Combustible):** Ventana de enfriamiento $T = \frac{7}{X} + 1 \text{ día de gracia}$ (más horas de *Inercia Urbana* si el barrio está urbanizado). La eficiencia cae escalonadamente: **100% $\rightarrow$ 66% $\rightarrow$ 33% $\rightarrow$ 0% (Fallo)**. Cumplir el hábito recarga el suministro al 100%.
  * **Cambio de Frecuencia en Caliente:** Si el usuario edita la frecuencia de un hábito existente, **conserva su racha y checkpoint actual**, recalculando inmediatamente su eficiencia del día en base al timestamp de su último registro (`lastCompletedAt`) y la nueva fórmula de enfriamiento.
* **Evolución por Niveles y Checkpoints (Pisos Seguros):**
  Los edificios crecen en altura y detalle al acumular días cumplidos. Si la eficiencia cae a 0%, el progreso **no vuelve a cero**, sino que retrocede al último *Checkpoint* alcanzado:
  * **Nivel 1:** Día 1 (Cimientos).
  * **Nivel 2 (Checkpoint 1):** 7 días cumplidos.
  * **Nivel 3 (Checkpoint 2):** 21 días cumplidos.
  * **Nivel 4 (Checkpoint 3):** 50 días cumplidos.
  * **Nivel 5 (Checkpoint 4):** 100 días cumplidos (Maravilla del barrio - habilita retiro con honores).
* **El Museo de Hábitos:** Cada barrio tiene su Museo. Retirar un hábito guarda una placa conmemorativa con su historial en el Museo y libera el lote físico para un hábito nuevo.

### 3.2. Tareas Únicas (Expansión Residencial)
* **Ponderación:** Al crear una tarea única (sin subtareas), se elige su peso para llenar la **Barra de Urbanización** (100% = 1 Casa nueva):
  * **Rápida / Simple:** **+10%** de casa.
  * **Estándar:** **+25%** de casa.
  * **Pesada / Compleja:** **+50%** de casa.
* **Pizarra Diaria ("En Obra") vs. Plano Maestro (Backlog):** Las tareas viven en el Plano Maestro sin fecha de vencimiento punitiva. Cada día el usuario selecciona cuáles pasan a estar "En Obra".
* **Corte de Día y Horas de Gracia:** El cambio de día ocurre por defecto a las `00:00 hs` (configurable por el usuario) más un **margen de horas de gracia nocturnas** (ej. 4 horas) para no cortar sesiones de madrugada. Al cerrarse la jornada, las tareas "En Obra" no completadas vuelven silenciosamente al Plano Maestro.
* **Fatiga Laboral (Anti-Exploit):** Rendimientos decrecientes por barrio por día:
  * **Tramo Óptimo (Base: Tareas 1 a 5):** **100%** de monedas y progreso.
  * **Tramo de Fatiga (Base: Tareas 6 a 10):** **50%** de monedas y progreso.
  * **Agotamiento (Tarea 11+):** **10%** simbólico.

### 3.3. Actividades de Foco, Suministros y Reversibilidad
* **Motor Pomodoro:**
  * Presets por defecto: `25/5` y `50/15` (4 ciclos hasta descanso largo).
  * Permite crear presets personalizados definiendo trabajo $W$, descanso corto sugerido en $\frac{W}{5}$ (editable), cantidad de bloques y descanso largo opcional.
  * **Interrupción (Regla del 80%):** Cancelar un Pomodoro en curso muestra una advertencia y acredita el **80% de los minutos transcurridos** en monedas y XP.
* **Suministro de Agua (`+500ml` / `+1L`):** Acción global rápida con 4 efectos:
  1. **Pulso Verde:** Regula en tiempo real las fuentes, el caudal del río y el tono verde de los árboles de toda la ciudad (0L sequía $\rightarrow$ 1L activo $\rightarrow$ 2L+ ciudad florecida).
  2. **Mitigación de Fatiga:** Cada `1.0L` registrado en el día suma **+1 tarea al tramo óptimo del 100%** en todos los barrios.
  3. **Presión de Calderas:** Alcanzar la meta diaria de agua elimina en el acto la penalización del 50% del *Arranque de Motores* tras una hibernación.
  4. **Progreso del Acueducto:** Suma al contador histórico perpetuo.
* **Ventana de Reversibilidad (Undo Temporal):** Toda acción completada puede deshacerse durante una ventana de **5 minutos**, revirtiendo exactamente monedas, progreso de casas y estructuras creadas por error.

---

## 4. Tablas de Balance Económico y Progresión

### 4.1. Ingresos de Monedas Locales (Por Barrio)
* **Hábito Activo (100% eficiencia):** **`120 monedas / día`** (`5 monedas / hora`). Al 66% genera `80 monedas/día`; al 33% genera `40 monedas/día`. *(Subir de nivel el hábito no infla esta tasa; otorga XP al Ayuntamiento).*
* **Tareas Únicas Completadas (al 100% sin fatiga):**
  * *Simple (+10% casa):* **`20 monedas`**
  * *Estándar (+25% casa):* **`50 monedas`**
  * *Compleja (+50% casa):* **`100 monedas`**
  *(Completar las 6 casas de una cuadra equivale a 600% de barra e inyecta **1.200 monedas** al barrio).*
* **Sesiones Pomodoro:** **`2 monedas por minuto`** de foco al barrio asignado + **`1 XP Global cada 5 minutos`**. (Ej. 25 min = `50 monedas` + `5 XP`; 50 min = `100 monedas` + `10 XP`).

### 4.2. Costos de Urbanización y Mejoras del Barrio
* **Mejora del Estándar General del Barrio:**
  * **Nivel 1 (Rústico - Tierra):** Inicial (Gratis) | `0 hs` de Inercia Urbana.
  * **Nivel 2 (Urbano - Asfalto y Veredas):** **`600 monedas`** (+`200` por cuadra existente) | **`+2 hs`** de gracia antes de decaer hábitos.
  * **Nivel 3 (Bulevar - Faroles, Árboles y Autos):** **`1.500 monedas`** (+`400` por cuadra existente) | **`+4 hs`** de gracia.
  * **Nivel 4 (Distrito Élite - Adoquinado, Peatones, Canteros):** **`3.500 monedas`** (+`800` por cuadra existente) | **`+6 hs`** de gracia.
* **Pago de Nivelación (Por Cuadra Nueva inaugurada en tierra):**
  * En Barrio Nivel 2: **`300 monedas`**
  * En Barrio Nivel 3: **`600 monedas`**
  * En Barrio Nivel 4: **`1.000 monedas`**
* **Decoraciones Puntuales:**
  * *Plaza Pequeña:* **`500 monedas`** (`+25 XP Global`)
  * *Parque con Fuente (reactivo al agua):* **`1.200 monedas`** (`+60 XP Global`)
  * *Monumento / Estatua:* **`2.500 monedas`** (`+125 XP Global`)

### 4.3. Escalas de Edificios Centrales (Globales)
* **Ayuntamiento (XP de Calidad de Vida):**
  * *Ganancia de XP:* Casa nueva (`+10 XP`), Cuadra nivelada (`+30 XP`), Checkpoint de Hábito Nv.2 a Nv.5 (`+25 / +50 / +100 / +250 XP`), Retiro al Museo en Nv.5 (`+300 XP`).
  * *Niveles:* Nv.1 (`0 XP`), Nv.2 (`100 XP`), Nv.3 (`350 XP`), Nv.4 (`1.000 XP`), Nv.5 (`2.500 XP`).
* **Gran Biblioteca (Páginas Históricas):**
  * *Niveles:* Nv.1 (`0 págs`), Nv.2 (`100 págs`), Nv.3 (`500 págs`), Nv.4 (`1.500 págs`), Nv.5 (`5.000 págs`).
* **Acueducto Central (Litros Históricos):**
  * *Niveles:* Nv.1 (`0 L` - Tanque), Nv.2 (`15 L` - Torre de agua), Nv.3 (`60 L` - Acueducto y canal), Nv.4 (`200 L` - Río con puentes), Nv.5 (`500 L` - Gran Lago y Costanera).

---

## 5. Estados de Pausa y Retorno
* **Pausa Manual Consciente:** Requiere escribir un motivo obligatorio. Congela el estado y las rachas al 100% sin penalizaciones. Producción en `0` mientras dura la pausa.
* **Auto-Pause por Inactividad (72 horas sin entrar):** La ciudad entra en Hibernación. Los hábitos caen a su último Checkpoint seguro y se apagan. Al volver, cada barrio se reactiva completando **1 tarea o hábito**, operando al **50% de producción durante las primeras 24 horas** (*Arranque de Motores*), a menos que el usuario cumpla la meta de agua diaria, lo cual restaura el 100% de inmediato.

---

## 6. Guía Estética: Arte Isométrico Pixel-Perfect (Estilo Habbo Hotel)

### 6.1. Proyección y Delineado
* **Proyección Isométrica 2:1 Estricta:** Toda línea diagonal de suelo, paredes y techos sigue el escalonado exacto de **2 píxeles horizontales por 1 píxel vertical**, sin *anti-aliasing* (`image-rendering: pixelated`).
* **Outlines y Highlights tipo "Furni":**
  * Silueta exterior de edificios, casas y objetos recortada con un borde sólido de **1 píxel oscuro** (`#1A1C23`).
  * Aristas internas expuestas a la luz resaltadas con **1 píxel claro** (*highlight*) para generar el volumen característico de maqueta plástica/isométrica de *Habbo Hotel*.

### 6.2. Regla Cromática 80/20 y Sombreado Plano
* **Prohibición de degradados suaves:** Todo volumen se resuelve con colores planos divididos en 3 tonos por superficie: **Cara Superior/Luz (100%)**, **Cara Izquierda (85%)**, **Cara Derecha/Sombra (65%)**.
* **80% Base Neutra:** Muros, veredas y calles utilizan paletas neutras cálidas (piedra, crema, gris pizarra).
* **20% Color de Identidad del Barrio:** Cada barrio aplica su trío de color (Luz/Base/Sombra) en tejados, toldos, marquesinas de edificios de hábitos, banderolas de faroles, canteros y vehículos.

### 6.3. Lenguaje Visual de Estado
* **Ventanas e Iluminación:** Los edificios de hábitos muestran ventanas matriciales encendidas en amarillo cálido (`#FFE066` con píxel blanco de brillo) según su eficiencia (100% todas encendidas; 66%/33% pisos parciales; 0% vidrio apagado `#2B3A4A`).
* **El Agua y Pulso Verde:** Río y fuentes dibujados con tiles isométricos azul turquesa estilo piscina de Habbo con bordes de piedra clara y píxeles blancos animados de espuma. El follaje de los árboles cambia su paleta de píxeles en bloque según los litros del día (`0L` ocre seco $\rightarrow$ `1L` verde hoja $\rightarrow$ `2L+` verde esmeralda con píxeles de flores del color del barrio).

---

## 7. Especificación del HUD (Interfaz de Usuario)

El lienzo de la ciudad ocupa el 100% del fondo, con paneles flotantes colapsables:
1. **Barra Superior Flotante (Global):** Píldora compacta con: Nivel/XP del Ayuntamiento, Hidratación de 1 clic (`+500ml` / `+1L`), Registro rápido de Páginas (`+Págs`) y Reloj Pomodoro con selector de barrio y presets.
2. **Drawer Lateral Derecho ("La Pizarra Diaria"):** Colapsable con tecla rápida (`Tab`). Divide en dos pestañas: **"En Obra (Hoy)"** (hábitos ordenados por urgencia de suministro + tareas activas del día con indicador de Fatiga Laboral) y **"Plano Maestro"** (backlog por barrio).
3. **Inspector Contextual en Mapa:** Hacer clic sobre un barrio o cuadra despliega su tarjeta local (Tesorería, botón de *Mejorar Infraestructura*, *Museo de Hábitos* y botón flotante `[🚧 Nivelar Cuadra]` sobre cuadras rústicas).
4. **Controles Inferiores, Undo Toast y Command Palette:**
   * Esquina inferior izquierda con **Toast de Reversibilidad** durante 5 minutos tras cada acción (`[↩️ Deshacer]`).
   * **Modo Zen** para ocultar todo el HUD excepto la ciudad y el Pomodoro activo.
   * **Command Palette (`Ctrl+K`):** Captura por teclado sin usar el mouse (`agua 1`, `leer 25`, `t gym comprar suplemento !25`, `pomo estudio 50`).



## 8. Modelo de Sostenibilidad y Monetización (Preparación de Dominio)

Aunque el MVP se construye inicialmente para uso personal (100% desbloqueado en modo local), el dominio nace preparado para escalar hacia dos vías de monetización ética que respetan el pilar de **Cero Pay-to-Win**:

1. **Modelo "Local-First Gratis / Sync & Mobile Pago":**
   * La versión de Escritorio operando sobre base de datos local es gratuita e ilimitada.
   * La sincronización en la nube (*Cloud Sync*) y el acceso desde el cliente móvil (*Companion App*) constituyen una capacidad de cuenta (`cloudSyncEnabled`), asegurando que el costo de infraestructura en la nube solo exista para usuarios suscriptos o con pase activo.
2. **Cosméticos Modulares por Barrio (Temas Arquitectónicos):**
   * Los temas visuales (`architecturalThemeId`) modifican exclusivamente las funciones de dibujo de casas, calles y edificios de hábitos en el lienzo isométrico, sin alterar tasas de producción, costos de nivelación ni tiempos de enfriamiento.

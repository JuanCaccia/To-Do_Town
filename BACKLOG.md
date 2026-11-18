
### 1. US-00 (sistema): Día Cero y Ciclo de Vida del Barrio Tutorial `[DONE]`:
Como sistema, necesito inicializar una ciudad base con un barrio tutorial al abrir la aplicación por primera vez y eliminarlo cuando se cree el primer barrio real, para guiar el aprendizaje inicial sin ensuciar el progreso definitivo.   

#### Criterios de Aceptación:
**CA-01: Inicialización de Cuenta, Reloj y Configuración por Defecto**
- Dado que la aplicación se inicializa por primera vez sin un estado previo cargado

- Cuando el motor genera el estado inicial del Día Cero recibiendo el timestamp actual (now)

- Entonces el estado (GameState) nace activo (cityStatus: 'ACTIVE') con lastTickAt y lastUserInteractionAt igualados a now, la cuenta configurada en modo PERSONAL_DEV (userId: 'local-owner', cloudSyncEnabled: false y unlockedThemes: ['CLASSIC_DIORAMA']), el ciclo de día con corte a las 00:00 hs (dayCutoffHour: 0) más 4 horas de gracia (gracePeriodHours: 4), y los dos presets Pomodoro por defecto (25/5 y 50/15 con 4 ciclos antes del descanso largo).  

**CA-02: Inicialización del Núcleo Cívico (Edificios Globales en Nivel 1)**
- Dado que se ejecuta la creación del estado inicial en el Día Cero. 

- Cuando se inicializan las infraestructuras globales de la ciudad (globals)

- Entonces el Ayuntamiento nace en Nivel 1 con 0 XP (qualityOfLifeXP: 0), la Gran Biblioteca en Nivel 1 con 0 páginas leídas (totalPagesRead: 0), y el Acueducto Central en Nivel 1 con 0 litros históricos, 0 litros diarios, meta diaria de 2.0 L (dailyTargetLiters: 2.0) y lastOperationalDay calculado según now y la configuración de corte de día.   

**CA-03: Semilla del Barrio Tutorial, Cuadra Inicial y Casas**
- Dado que se genera el estado del Día Cero,

- Cuando el sistema crea el registro de barrios iniciales (neighborhoods),

- Entonces existe exactamente 1 'Barrio Tutorial' con un id ('tutorial-neighborhood-id') unico i determinista, marcado con isTutorial: true, nivel de infraestructura 1, tesorería inicial de 500 monedas (treasuryCoins: 500), progreso de urbanización al 50% (urbanizationProgress: 50), y 1 única cuadra (CityBlock) en la posición { x: 0, y: 0 } sin nivelar (isLeveled: false) que contiene exactamente 3 casas en los lotes 0, 1 y 2 con las variantes de diseño 1, 2 y 3 respectivamente.

**CA-04: Semilla de Entidades Interactivas del Tutorial (Hábito y Tareas)**
- Dado que el Barrio Tutorial ha sido creado en el Día Cero,  

- Cuando se consultan los registros iniciales de hábitos (habits) y tareas (tasks) vinculados al id del Barrio Tutorial,   

- Entonces existe 1 hábito activo (status: 'ACTIVE') de frecuencia diaria (DAILY), en Nivel 1 (checkpointLevel: 1), con racha en 0, sin fecha de último cumplimiento (lastCompletedAt: null) y eficiencia en 1.0; y existen 2 tareas únicas: una de peso COMPLEX ubicada en la pizarra activa (boardStatus: 'IN_CONSTRUCTION') y otra de peso STANDARD ubicada en el listado general (boardStatus: 'MASTER_PLAN').  

**CA-05: Autodestrucción Limpia del Barrio Tutorial al Crear el Primer Barrio Real**
- Dado que la ciudad se encuentra en el estado del Día Cero conteniendo el Barrio Tutorial (isTutorial: true), su hábito y sus 2 tareas asociadas,   

- Cuando se ejecuta la acción de crear el primer barrio personalizado (isTutorial falso o indefinido),   

- Entonces el sistema elimina de forma atómica el Barrio Tutorial del mapa de neighborhoods y purga todos los hábitos y tareas cuyo neighborhoodId pertenezca al Barrio Tutorial, dejando únicamente el nuevo barrio real sin dejar entidades huérfanas en el estado. 



### US-01 (sistema): Persistencia Local y Registro de Eventos `[DONE]`
> **Alcance cerrado:** dominio + adapter. Los 4 CAs están implementados y testeados (28 tests). **Fase 4 cerrada:** `main.tsx` hidrata antes de montar React y el registro `game_state` sobrevive a la recarga con `lastTickAt` intacto (verificado a mano).

El sistema debe guardar cada cambio de estado y evento de forma transparente para que el usuario mantenga su progreso seguro sin esfuerzo.  

#### Criterios de Aceptación:
**CA-01: Contrato Puro de Almacenamiento y Outbox (StoragePort y EventLogPort)**
- Dado que la capa de dominio (src/core) no puede depender de APIs del navegador ni librerías externas,

- Cuando se definen los contratos de persistencia en src/core/ports y el registro de evento DomainEventRecord,

- Entonces todo evento de dominio exige eventId, userId, deviceId, timestamp, type, payload y syncedAt: null (preparado para el patrón Outbox), y los puertos exponen operaciones asíncronas puras para guardar/cargar el GameState y anexar/listar eventos pendientes de sincronización.  

**CA-02: Inicialización de IndexedDBAdapter con Almacenes Separados**
- Dado que la aplicación se ejecuta en el navegador durante la Etapa 1,  

- Cuando el IndexedDBAdapter inicializa la conexión a la base de datos local,  

- Entonces crea y asegura la existencia de dos almacenes de objetos (object stores) independientes: game_state (para el snapshot actual del estado) y domain_events (para la cola histórica de eventos de dominio).   

**CA-03: Hidratación en Arranque (Carga de Estado Previo vs. Fallback a Día Cero)**
- Dado que el usuario abre o recarga la aplicación,  

- Cuando el sistema consulta el almacén game_state en IndexedDB,  

- Entonces si existe un estado guardado previamente lo hidrata y retorna intacto; y si el almacén está vacío, invoca la creación del estado de Día Cero (US-00), lo persiste inmediatamente en game_state y lo retorna listo para operar.   

**CA-04: Guardado Transaccional de Estado y Emisión al Outbox (domain_events)**
- Dado que ocurre cualquier acción o transición válida que muta el GameState,  

- Cuando el adaptador de persistencia procesa la actualización junto con el evento producido,  

- Entonces sobrescribe el snapshot actualizado en el almacén game_state e inserta en el mismo flujo el nuevo registro DomainEventRecord en domain_events adjuntando userId: 'local-owner', el identificador del dispositivo (deviceId: 'desktop') y syncedAt: null.  

#### Pendientes heredados entre CA de esta US (no confundir con CA nuevos)
- **CA-04 → US-12 CA-02:** `EventLogPort.appendEvent` sigue sin implementarse en el adapter; el alta de eventos hoy sólo existe dentro de `commit`. US-12 CA-02 exige emitir un evento compensatorio `ACTION_UNDONE`; decidir entonces si ese flujo pasa por `commit` o necesita un `appendEvent` suelto (sin snapshot). No inventarlo antes.
- **CA-04 → Etapa 3 (CloudSync):** `userId: 'local-owner'` y `deviceId: 'desktop'` están hardcodeados en `IndexedDBAdapter` (`LOCAL_DEVICE_IDENTITY`). Cuando exista cuenta real, la identidad debe inyectarse por constructor.
- **CA-03 → Fase 4 (resuelto):** `main.tsx` hidrata con `await hydrateGameState(...)` **antes** de `createRoot`. Se descartó `useEffect`: bajo `StrictMode` se ejecuta dos veces y podía sembrar dos Días Cero con timestamps distintos.
- **Resuelto en CA-03/CA-04:** claves definidas (`GAME_STATE_KEY = 'current'` para el snapshot; `eventId` como clave out-of-line con `add` en `domain_events`); conexión abierta y cerrada por operación; método atómico `UnitOfWorkPort.commit` (DEC-014) reemplaza la composición `saveState` + `appendEvent`.





### US-02 (usuario): Creación y Urbanización de Barrios `[DONE]`
> **Alcance cerrado:** dominio. Los 4 CAs están implementados y testeados (51 tests). **Fase 4 cerrada:** las Pruebas 1-3 (alta desde el HUD, economía estanca visual, flujo de mejora) fueron validadas a mano contra el HUD. Prueba 3 se validó en su **mecánica**; sus números literales (50 → 80 XP) exigen un saldo inicial que sólo la herramienta DEV puede sembrar sin ensuciar el XP previo (ver Deuda Registrada).

Como usuario, quiero crear barrios con un nombre y una paleta cromática, y gastar sus monedas locales en mejoras, decoraciones y nivelación de terreno, para organizar mis ámbitos de vida y embellecer cada distrito de forma aislada.  
#### Criterios de Aceptación (Dominio y Reglas):
**CA-01: Creación de Barrio Personalizado con Cuadra Inicial y Economía Estanca**
- Dado que el usuario solicita crear un nuevo barrio proporcionando un nombre válido (no vacío) y un paletteId,  

- Cuando el motor ejecuta la acción de creación en el instante now,  

- Entonces se registra un nuevo Neighborhood con un ID único, treasuryCoins: 0, infrastructureLevel: 1 (Rústico), urbanizationProgress: 0, architecturalThemeId: 'CLASSIC_DIORAMA', dailyTasksCompletedCount: 0, reactivationPenaltyUntil: null y  DECORATIONS vacío; e inaugura automáticamente su primera cuadra (CityBlock) en { x: 0, y: 0 } en estado rústico (isLeveled: false) y sin casas (houses: []). (Nota: Si existía el 'tutorial-neighborhood-id', se dispara su autodestrucción definida en US-00).  

**CA-02: Mejora del Estándar de Infraestructura del Barrio (Fórmula Escalonada y XP)**
- Dado que un barrio se encuentra en infrastructureLevel 1, 2 o 3 y cuenta con una cantidad C_niveladas de cuadras con isLeveled: true,  

- Cuando el usuario solicita mejorar el estándar de infraestructura del barrio al siguiente nivel,  

- Entonces el sistema calcula el costo exacto mediante CostoUpgrade = CostoBase + (RecargoPorCuadra * C_niveladas) según el nivel destino (Nv.2: $600 + 200 * C_niveladas; Nv.3: $1500 + 400 * C_niveladas; Nv.4: $3500 + 800 * C_niveladas); si treasuryCoins es suficiente, descuenta las monedas del barrio, incrementa infrastructureLevel en +1, suma el XP Global correspondiente al Ayuntamiento (+50 XP para Nv.2, +120 XP para Nv.3, +300 XP para Nv.4) recalculando el nivel del Ayuntamiento si cruza un umbral (100 / 350 / 1000 / 2500 XP); y si las monedas son insuficientes o ya está en Nivel 4, rechaza la operación sin mutar el estado.  

**CA-03: Nivelación de Cuadra Rústica (isLeveled) y Recompensa Cívica**
- Dado que un barrio tiene infrastructureLevel >= 2 y posee una cuadra en estado rústico (isLeveled: false),  

- Cuando el usuario solicita nivelar dicha cuadra,  

- Entonces el sistema verifica el costo de nivelación según el nivel actual del barrio (300 monedas en Nv.2, 600 en Nv.3, 1000 en Nv.4); si treasuryCoins alcanza, descuenta el importe de la tesorería local del barrio, marca la cuadra con isLeveled: true y acredita +30 XP en el Ayuntamiento; y si el barrio está en Nivel 1, la cuadra ya estaba nivelada o no hay fondos suficientes, rechaza la acción.  

**CA-04: Compra de Decoraciones Puntuales y Aislamiento de Tesorerías**
- Dado que el usuario selecciona comprar una decoración del catálogo para un barrio específico (SMALL_PLAZA por 500 monedas, FOUNTAIN_PARK por 1200 monedas, o CIVIC_MONUMENT por 2500 monedas),   

- Cuando se ejecuta la compra verificando únicamente el saldo treasuryCoins de ese barrio (ignorando las monedas de otros barrios),  

- Entonces descuenta el costo de la tesorería local, agrega el ítem a decorations del barrio y acredita el XP Global en el Ayuntamiento (+25 XP, +60 XP o +125 XP respectivamente).  

#### Pendientes heredados entre CA de esta US (no confundir con CA nuevos)
- **CA-01 → US-00 CA-05 (resuelto):** `createNeighborhood` ya purga el Barrio Tutorial completo — barrio, hábito y sus 2 tareas — en la misma transición de estado. La purga se deriva del dato (`isTutorial === true`), nunca de un id literal.
- **CA-01 → borde (resuelto en Fase 4):** el `id` del barrio entra como dato, nunca se genera en `src/core` (`GOVERNANCE.md` §2.6). `IdPort.ts` y `CryptoIdAdapter` existen desde el Peldaño 1 del slice: la generación de UUIDs vive en el borde, donde le corresponde.
- **CA-01:** no valida nombre vacío. El CA lo declara precondición del usuario, no regla del motor; se decide cuando la UI lo exija.
- **CA-01 → US-05:** `lastOperationalDay` a nivel barrio (declarado en `ARCHITECTURE.md` §5) todavía no existe en el tipo. Se agrega cuando la jornada operativa lo necesite.
- **CA-01 → CA-04:** `DecorationKind` ya declara los tres valores del catálogo; precios, efectos y XP llegan con CA-04 y ECONOMY.
- **CA-02 → CA-03/CA-04:** `withQualityOfLifeXp` (`src/core/rules/townHallLevel.ts`) ya resuelve el recálculo del nivel del Ayuntamiento; CA-03 (+30 XP) y CA-04 (+25/+60/+125 XP) deben reusarla, nunca reimplementar el umbral.
- **CA-02 → CA-03/CA-04:** las constantes de costo viven hoy dentro de `infrastructureUpgrade.ts`. `ARCHITECTURE.md` §3 reserva `src/core/constants/economyConstants.ts` para tasas y costos: cuando CA-03 sume los costos de nivelación (300/600/1000) y CA-04 los de decoración, todas deben mudarse ahí en un solo movimiento.
- **CA-02:** el resultado de la mejora devuelve `cost` además del estado, para que el HUD muestre el precio sin duplicar la fórmula. Mantener esa decisión en CA-03/CA-04.
- **CA-03 → US-03 CA-04:** nivelar una cuadra la direcciona por `gridPosition`. **La unicidad de coordenadas dentro de un barrio pasa a ser un invariante de dominio**, no un detalle de render: US-03 CA-04 (algoritmo de adyacencia) y cualquier alta de cuadra deben garantizarla.
- **CA-03 → `ARCHITECTURE.md` §5:** `CityBlock.id` sigue sin existir. Se agrega sólo si algún CA demuestra que la posición no alcanza como identidad, y en ese momento ya debe existir `IdPort` para generarlo.
- **Resuelto en CA-04:** todas las constantes económicas (infraestructura, nivelación, decoraciones) viven en `src/core/constants/economyConstants.ts`, como pide `ARCHITECTURE.md` §3. Todo valor nuevo de ECONOMY entra ahí, nunca dentro de una regla.
- **CA-04 → próxima US con economía:** `purchaseNeighborhoodDecoration` recibe `decorationId` como dato; el borde debe generarlo. Deuda saldada: `IdPort.ts` existe desde la Fase 4 y el store lo usa dentro de `purchaseDecoration`.



#### Pruebas de Usuario (Validación E2E en el HUD - Fase 4 Slice UI):
**Prueba 1: Alta de primer barrio real y reemplazo del tutorial**
- Acción: Abrir el HUD en el Día Cero, hacer clic en "Crear Barrio", ingresar el nombre "GYM", elegir una paleta de color y confirmar.  

- Resultado esperado: El Barrio Tutorial desaparece de la interfaz y aparece la tarjeta/inspector del barrio "GYM" en Nivel 1 con 0 🪙, 0% de urbanización y 1 cuadra rústica vacía (0/6 casas).   

**Prueba 2: Economía estanca entre dos barrios**
- Acción: Crear un segundo barrio "Estudio". Contando con monedas en "GYM" (cargadas mediante acción o herramienta DEV), abrir el Inspector Contextual de "Estudio" (0 🪙) e intentar comprar una Plaza Pequeña (500 🪙) o subir a Nivel 2 (600 🪙).   

- Resultado esperado: Los botones de compra y mejora en "Estudio" se muestran deshabilitados (o informan saldo insuficiente), demostrando que las monedas de "GYM" no pueden usarse en "Estudio".  

**Prueba 3: Flujo de Mejora de Infraestructura, Nivelación de Cuadra y subida del Ayuntamiento**
- Acción: En un barrio Nivel 1 con 1000 🪙 y 1 cuadra rústica:Hacer clic en [Mejorar Infraestructura a Nivel 2 (600 🪙)] en el Inspector del Barrio.   Hacer clic en [🚧 Nivelar Cuadra (300 🪙)] sobre su cuadra rústica.  

- Resultado esperado: El barrio pasa a Nivel 2 (400 🪙 restantes tras el primer paso) y el Ayuntamiento sube a 50 XP. Tras el segundo paso, la cuadra figura como Nivelada (100 🪙 restantes en tesorería) y la Barra Superior Global muestra el Ayuntamiento con 80 XP (50 + 30 XP).  



### US-03 (sistema): Expansión Automática de Cuadras `[DONE]`
> **Alcance cerrado:** dominio. Los 4 CAs están implementados y testeados (16 tests nuevos; 67 en el proyecto). **La Fase 4 sigue diferida al cierre de US-04:** la expansión no tiene todavía disparador de UI ni render; hoy se ejerce únicamente a través de `settleUrbanization`.
Como sistema, necesito inaugurar y posicionar una nueva cuadra rústica cuando las casas construidas superen la capacidad actual, para que el barrio crezca orgánicamente sin que el usuario tenga que administrar el espacio manualmente.  
#### Criterios de Aceptación:
**CA-01: Conversión de Barra de Urbanización en Casa Nueva y Ganancia de XP**
- Dado que el progreso de urbanización de un barrio (urbanizationProgress) suma puntos y alcanza o supera el 100% (ej. pasa de 75% a 125% tras una acción),  

- Cuando el motor procesa el umbral de construcción residencial en el instante now,  

- Entonces por cada 100 puntos acumulados deduce 100 de urbanizationProgress conservando el excedente exacto (ej. queda en 25%), genera una nueva instancia House con createdAt: now y una variante visual (designVariant: 1, 2 o 3), y acredita +10 XP de Calidad de Vida al Ayuntamiento (actualizando el nivel del Ayuntamiento si cruza un umbral de nivel).   


**CA-02: Asignación Secuencial de Lotes dentro de la Cuadra Activa (2 * 3)**
- Dado que nace una nueva casa en un barrio cuya última cuadra activa tiene menos de 6 casas (houses.length < 6),  

- Cuando el sistema ubica la casa dentro de esa cuadra,  

- Entonces le asigna el primer lotIndex libre en orden secuencial estricto (0, 1, 2, 3, 4 o 5) sin inaugurar una cuadra nueva.  

 
**CA-03: Inauguración Automática de Nueva Cuadra Rústica al Nacer la 7ma Casa**
- Dado que todas las cuadras existentes en el barrio han alcanzado su capacidad máxima de 6 casas (houses.length === 6),  

- Cuando el progreso de urbanización genera una nueva casa (la 7ma, 13ra, etc.),  

- Entonces el sistema inaugura automáticamente un nuevo CityBlock en estado rústico (isLeveled: false, independientemente de que el barrio esté en Nivel 2, 3 o 4) y aloja a la nueva casa inaugural en su primer lote (lotIndex: 0).   


**CA-04: Algoritmo de Posicionamiento Compacto por Mayor Adyacencia**
- Dado que el sistema debe asignar una coordenada { x, y } a una nueva cuadra recién inaugurada,  

- Cuando evalúa las coordenadas ortogonalmente vecinas (arriba, abajo, izquierda, derecha) a las cuadras ya existentes del barrio que se encuentren libres,  

- Entonces selecciona la coordenada candidata libre que posea la mayor cantidad de cuadras lindantes del mismo barrio (y en caso de empate en cantidad de vecinos, aplica una regla de desempate determinista por menor distancia al origen { x: 0, y: 0 } y orden de lectura de coordenadas), garantizando un crecimiento compacto, homogéneo y sin solapamientos. 



#### Pendientes heredados entre CA de esta US (no confundir con CA nuevos)
- **Resuelto en CA-04 (`gridPosition`):** la unicidad de coordenadas que US-02 CA-03 dejó declarada como invariante de dominio queda **garantizada por construcción**. Los candidatos de `freePosition` son vecinos ortogonales *libres* de cuadras existentes: dos cuadras no pueden compartir posición. Deuda saldada, no diferida.
- **CA-01 → US-04 CA-03 (contrato obligatorio):** US-04 debe invocar `settleUrbanization(state, neighborhoodId, now)` al cerrar la tarea que cruce el 100% de urbanización. **US-03 es dueño exclusivo de los +10 XP por casa;** US-04 no debe tocar `townHall` por urbanización. Esto es lo que impide la doble acreditación de XP anotada en la tabla de deuda.
- **CA-01 → `House`:** el tipo gana `createdAt: TimestampMs` requerido. La semilla del tutorial lo toma de `now`; el test de `dayZero` no se modificó (sólo mapea `lotIndex`/`designVariant`).
- **CA-01:** el bucle es `floor(progress / 100)`, nunca un `if` de un solo umbral. Con 250% nacen 2 casas y se conserva el excedente exacto.
- **CA-02:** `designVariant` se resuelve por `DESIGN_VARIANT_BY_LOT`, un `Record` exhaustivo por tipo. Si `House['lotIndex']` crece, `tsc` obliga a completar el mapa. Se eliminó el fallback `?? 1` que inventaba variante.
- **CA-02 → CA-03:** el lote se elige como **primer libre real**, no derivado de `houses.length`. Con huecos (lotes 0 y 2 ocupados) la versión anterior apilaba dos casas en el lote 2.
- **CA-03:** la cuadra nueva nace `isLeveled: false` de forma incondicional, ignorando `infrastructureLevel` (lo exige el CA y lo fija un test).
- **CA-03 → deuda menor:** en `placeHouses` la guarda `activeBlock !== undefined` del `while` es código muerto (tras `result.push` siempre hay cuadra). Se conserva por tipos, no por lógica.
- **CA-04 → decisión abierta:** el desempate del CA hace que, con una única cuadra en `{ x: 0, y: 0 }`, la segunda nazca en `{ x: 0, y: -1 }`. El barrio crece hacia `y` negativa. Si el render de la Fase 4 lo rechaza, **se modifica el CA en `BACKLOG.md`**, no el código por la puerta de atrás.
- **CA-04:** `freePosition` lanza si no encuentra candidato. La rama es inalcanzable (sólo se inaugura con al menos una cuadra existente); se eligió fallar ruidoso antes que devolver una coordenada inventada.
- **CA-04 → tests:** los tests de CA-03 **no asertan `gridPosition`** a propósito. Fijar coordenadas ahí habría inventado la mitad de CA-04 en el CA equivocado.




### US-04 (usuario): Gestión de Tareas y Construcción Residencial `[DONE]`
> **Alcance cerrado:** dominio. Los 4 CAs están implementados y testeados (15 tests en el archivo, 82 en el proyecto). **Con esta US se cierra el loop `tarea → monedas → urbanización → casa`.** **Fase 4 cerrada:** las Pruebas 1-3 del HUD fueron validadas a mano (Drawer con `Ctrl+B`, alta, activación y completado con casa nacida y +10 XP).
Como usuario, quiero registrar tareas según su complejidad, activarlas en mi pizarra del día y completarlas, para construir nuevas casas y obtener monedas locales en el barrio correspondiente.   

#### Criterios de Aceptación (Dominio y Reglas):

**CA-01: Creación de Tarea Única en el Plano Maestro (MASTER_PLAN)**
- Dado que existe un barrio válido en la ciudad y el usuario proporciona un título no vacío y un peso (SIMPLE, STANDARD o COMPLEX),  
- Cuando se ejecuta la acción de crear la tarea en el instante now,  
- Entonces el sistema registra una nueva OneOffTask con ID único vinculada a ese neighborhoodId, asigna su createdAt: now y la ubica por defecto en el listado general (boardStatus: 'MASTER_PLAN') sin fecha de vencimiento.  


**CA-02: Movimiento de Tareas entre "Plano Maestro" y "En Obra (Hoy)"**
- Dado que una tarea no ha sido completada (boardStatus es 'MASTER_PLAN' o 'IN_CONSTRUCTION'),  
- Cuando el usuario la activa para trabajar en el día o decide devolverla manualmente al listado general,  
- Entonces el sistema cambia su estado entre 'IN_CONSTRUCTION' y 'MASTER_PLAN' sin alterar sus pesos, fecha de creación ni contadores del barrio.  


**CA-03: Completado de Tarea en Tramo Óptimo (Monedas y Barra de Urbanización)**
- Dado que una tarea se encuentra activa (boardStatus: 'IN_CONSTRUCTION') y tanto el barrio como la estamina global de la ciudad operan en el tramo óptimo sin fatiga (M_fatiga = 1.0),  
- Cuando el usuario marca la tarea como completada en el instante now,  
- Entonces la tarea pasa a boardStatus: 'COMPLETED' con completedAt: now, se incrementa en +1 el contador dailyTasksCompletedCount del barrio (y el contador diario global de la ciudad), y se acredita en el barrio la recompensa base según su peso:   SIMPLE: +20 monedas a treasuryCoins y +10% a urbanizationProgress.   STANDARD: +50 monedas a treasuryCoins y +25% a urbanizationProgress.   COMPLEX: +100 monedas a treasuryCoins y +50% a urbanizationProgress.
(Nota: Si urbanizationProgress alcanza o supera 100, se dispara automáticamente la regla de construcción de casa y cuadra de US-03). 


**CA-04: Edición y Eliminación de Tareas Pendientes**
- Dado que una tarea se encuentra pendiente ('MASTER_PLAN' o 'IN_CONSTRUCTION'),  
- Cuando el usuario edita su título/peso o decide eliminarla antes de completarla,
- Entonces el sistema actualiza las propiedades solicitadas o remueve la tarea del registro tasks sin otorgar ni descontar monedas ni progreso de urbanización. (Las tareas con estado 'COMPLETED' son inmutables frente a edición/borrado directo, salvo mediante la ventana de Undo de US-12).  


#### Pendientes heredados entre CA de esta US (no confundir con CA nuevos)
- **CA-03 → deuda saldada (doble acreditación de XP):** cerrada de raíz. `completeTask` **delega** en `settleUrbanization` y el test aserta `townHall.qualityOfLifeXP === 10` **exacto** tras cruzar el 100%. US-04 no tiene código capaz de otorgar XP de casa, así que el bug no puede reaparecer.
- **CA-03 → representación:** el "contador diario global de la ciudad" **no se guarda**. Se deriva sumando `dailyTasksCompletedCount` de todos los barrios, porque US-05 CA-04 lo define literalmente como "la suma total de tareas completadas hoy entre todos los barrios". US-05 CA-02 debe resetear **solo** los contadores de barrio; el global se sigue solo.
- **CA-03 → US-05:** la fatiga **no está implementada**. CA-03 cubre únicamente el tramo óptimo (`M_fatiga = 1.0`). US-05 CA-03/CA-04 deben **envolver** `TASK_REWARDS` con el multiplicador, nunca reescribir las recompensas base.
- **CA-03 → `economyConstants.ts`:** `TASK_REWARDS` (SIMPLE 20/+10, STANDARD 50/+25, COMPLEX 100/+50) vive ahí, según la regla de US-02 CA-02 (todo valor de ECONOMY va a las constantes).
- **CA-01 → borde (resuelto en Fase 4):** el `id` de la tarea entra **como dato** y es la clave del `Record` `tasks`. `IdPort.ts` existe y el store genera el `taskId` antes de llamar a la regla pura.
- **CA-01, CA-04:** no se valida título vacío ni barrio o tarea inexistente. El CA los declara precondición del usuario, no regla del motor. Se decide en `Prueba 1` del HUD, donde existe el botón de guardar.
- **CA-01/CA-03 → tipos:** `OneOffTask` gana `createdAt: TimestampMs` y `completedAt: TimestampMs | null` (coherente con `HabitBuilding.lastCompletedAt`). El ripple tocó `dayZero.ts` y el fixture de `neighborhood.test.ts`: **ninguna aserción cambió**. El segundo lo detectó `tsc`, no vitest — de ahí la regla de que el gate es `test && typecheck`.
- **CA-02 → `moveTask`:** el destino es explícito (`'MASTER_PLAN' | 'IN_CONSTRUCTION'`), no un toggle. Un toggle con doble click o reintento termina en el estado opuesto al pedido.
- **CA-04 → decisión de contrato:** `updateTask`/`deleteTask` devuelven `GameState` y son **no-op** sobre tareas `COMPLETED`. Se descartó la unión con rechazo porque la UI filtra por `boardStatus` y no hay dónde mostrar el motivo; `blockLeveling` sí la tiene porque "saldo insuficiente" es un mensaje real. Si US-12 necesita el motivo, se agrega ahí.
- **CA-02 vs CA-04 (borde cerrado):** el duplicate-reward exploit quedó cerrado. `moveTask` ya no mueve una tarea `COMPLETED` (lista negra) y `completeTask` exige `boardStatus === 'IN_CONSTRUCTION'` (lista blanca). Invariante único: **solo una tarea En Obra es completable; solo una tarea pendiente es movible.** Dos tests nuevos lo fijan: reabrir una completada devuelve el estado idéntico, y completar dos veces no duplica monedas, urbanización, contador ni XP de Ayuntamiento. 84 tests verdes.

#### Pruebas de Usuario (Validación E2E en el HUD - Fase 4 Slice UI):

**Prueba 1: Apertura del Drawer y alta en el Plano Maestro**
- Acción: Presionar Ctrl+B (o tecla [ / Tab) para desplegar el Drawer Lateral ("La Pizarra Diaria"), ir a la pestaña "Plano Maestro", seleccionar el barrio "Estudio", escribir "Resumir unidad 1", elegir peso COMPLEX (+50% casa / 100 🪙) y guardar.  

- Resultado esperado: La tarea aparece listada en el "Plano Maestro" bajo el barrio "Estudio" sin aparecer aún en la lista activa del día.   


**Prueba 2: Activación a "En Obra (Hoy)"**
- Acción: En el "Plano Maestro", hacer clic en el botón de pasar a "En Obra" sobre la tarea "Resumir unidad 1" y cambiar a la pestaña "En Obra (Hoy)".  
- Resultado esperado: La tarea desaparece del "Plano Maestro" y se visualiza en "En Obra (Hoy)" lista para ser tildada.   


**Prueba 3: Ciclo completo de construcción de casa mediante tareas**
- Acción: En un barrio con 0 🪙, 0% de urbanización y 0 casas: crear, activar a "En Obra" y tildar como completadas 2 tareas COMPLEX (+50% cada una).  
- Resultado esperado: Al tildar la primera tarea, el barrio muestra 100 🪙 y la barra de urbanización al 50%. Al tildar la segunda tarea, el barrio alcanza 200 🪙, la barra vuelve a 0%, la cuadra del barrio pasa a mostrar 1/6 casas construidas y el Ayuntamiento en la Barra Superior suma +10 XP.   



### US-05 (sistema): Reciclaje Nocturno de Tareas y Regulación de Fatiga `[DONE]`
> **Alcance cerrado:** los 4 CAs están implementados y testeados (44 tests nuevos; 137 en el proyecto). **Fase 4 cerrada:** `calculateTick` corre al arrancar (`main.tsx`, después de hidratar) y cada 60 s vía `useGameLoop`; la rotación se persiste con un evento `OPERATIONAL_DAY_ROLLED_OVER`. El Drawer muestra la recompensa **efectiva** con badge `FATIGA ×0.5` / `AGOTADO ×0.1`. Auditorías de `UI_DESIGN.md` §7 pasadas y build de producción OK. **Pruebas 1-2 validadas a mano (2026-11-15).**
Como sistema, necesito devolver las tareas inconclusas al listado general cuando finalice el día operativo y ajustar las recompensas cuando se supere el cupo diario de trabajo, para que el usuario comience cada jornada limpio de culpa y mantenga un ritmo sostenible.  


#### Criterios de Aceptación:

**CA-01: Cálculo Determinista del Día Operativo (YYYY-MM-DD) con Horas de Gracia**
- Dado que la ciudad tiene configurado un horario de corte (dayCutoffHour, por defecto 00:00) y un margen de horas de gracia nocturnas (gracePeriodHours, por defecto 4),  
- Cuando el motor evalúa a qué día operativo (YYYY-MM-DD) pertenece un timestamp now,  
- Entonces desplaza el reloj restando (dayCutoffHour + gracePeriodHours) horas antes de extraer la fecha calendario; de modo que cualquier acción realizada durante la madrugada antes de las 04:00 AM (por defecto) computa como perteneciente a la jornada del día anterior.  


**CA-02: Transición de Jornada y Reciclaje Silencioso al Plano Maestro**

- Dado que el día operativo calculado para now es posterior al lastOperationalDay registrado en los barrios y en el estado global,  
- Cuando el motor ejecuta el tick de actualización de jornada (calculateTick),  
- Entonces todas las tareas que quedaron con boardStatus: 'IN_CONSTRUCTION' vuelven automáticamente a 'MASTER_PLAN' sin aplicar penalizaciones; se reinician a 0 los contadores dailyTasksCompletedCount de todos los barrios (así como la estamina global consumida en el día y los litros diarios del Acueducto dailyLiters: 0); y se actualiza lastOperationalDay al nuevo día operativo YYYY-MM-DD.  


**CA-03: Multiplicador de Fatiga Laboral por Cupo Local del Barrio (N_barrio)
- Dado que un barrio registra una cantidad de tareas completadas en el día (dailyTasksCompletedCount) y la ciudad cuenta con un bono hídrico activo B_agua = min(2, dailyLiters),  
- Cuando se evalúa el tramo de rendimiento local del barrio para la siguiente tarea a completar,  
- Entonces el multiplicador local es 1.0 (100%) para las tareas 1 a (5 + B_agua), 0.5 (50%) para las 5 tareas siguientes (tramo de fatiga), y 0.1 (10%) de la tarea (11 + B_agua) en adelante (agotamiento).   


**CA-04: Multiplicador de Fatiga por Estamina Global de la Ciudad (N_global) y Regla del Mínimo**

- Dado que la suma total de tareas completadas hoy entre todos los barrios determina el consumo de Estamina Global de la ciudad,  
- Cuando el usuario completa una tarea en cualquier barrio,  
- Entonces el motor calcula el multiplicador global (1.0 para las tareas globales 1 a (8 + B_agua), 0.5 para las 6 tareas siguientes, y 0.1 para el excedente posterior) y aplica como multiplicador final efectivo M_fatiga el mínimo entre el multiplicador del barrio y el multiplicador global, afectando proporcionalmente tanto a las monedas ganadas como al porcentaje sumado en urbanizationProgress.  



#### Pendientes heredados entre CA de esta US (no confundir con CA nuevos)
- **CA-01 (ya en verde por US-00 CA-02):** `getOperationalDay` (`src/core/rules/dayCycle.ts`) ya implementa corte + gracia y está cubierto de forma indirecta en `dayZero.test.ts`. No se reimplementa: esta US sólo le da test co-locado propio en `src/core/rules/__tests__/dayCycle.test.ts` y lo cierra. Ese test **no puede nacer en rojo** porque el código lo precede.
- **CA-02 → US-07 CA-03 (contrato obligatorio, DEC-016):** `calculateTick` nace **aquí** como orquestador mínimo de jornada: detecta el cambio de día operativo y ejecuta el reciclaje (`IN_CONSTRUCTION` → `MASTER_PLAN`, reset de `dailyTasksCompletedCount` por barrio, estamina global y `dailyLiters: 0`). **No liquida producción pasiva.** US-07 CA-03 es dueña de esa liquidación y **extiende** este mismo `calculateTick`; tiene prohibido crear un tick paralelo o duplicar la detección de jornada.
- **Resuelto en CA-02 (tipos):** `lastOperationalDay` subió a `GameState.lastOperationalDay` y a cada `Neighborhood.lastOperationalDay`; el campo suelto de `globals.aqueduct` se eliminó. `createNeighborhood` no recibe `now`: el barrio nuevo **hereda** `state.lastOperationalDay`, porque el día global es la fuente de verdad y el barrio sólo lo copia.
- **Resuelto en Fase 4:** `calculateTick` corre al arrancar (`main.tsx`, después de hidratar) y cada 60 s (`useGameLoop`, `GAME_LOOP_INTERVAL_MS`). Como la regla devuelve la misma referencia cuando el día no cambió, el loop nunca escribe eventos fantasma. **Observación heredada:** el Outbox se lee por `eventId`, así que `listPendingEvents` **no** devuelve orden de inserción; si el orden importa, sale del `timestamp` de cada evento (relevante para CloudSync).
- **CA-03/CA-04 → ECONOMY §2.3:** `B_agua = min(2, ⌊dailyLiters⌋)`. El texto del CA dice `min(2, dailyLiters)` sin truncar y se lee **según ECONOMY** (GOVERNANCE §1.2). Con 1.5 L el bono es +1 tarea, no +1.5.
- **CA-03/CA-04 → `economyConstants.ts`:** umbrales (5 local / 8 global, +5 / +6, 0.5, 0.1) y `B_agua` son valores de ECONOMY: viven en constantes, nunca dentro de la regla.
- **CA-04 → `completeTask` (US-04):** la fatiga **envuelve** `TASK_REWARDS`, no las reescribe, y afecta monedas **y** `urbanizationProgress`. Los tests existentes de US-04 (20/50/100 con contador en 0) deben seguir verdes sin modificarse.
- **CA-04 → estamina global:** se **deriva** sumando `dailyTasksCompletedCount` de todos los barrios (decidido en US-04 CA-03). No se persiste un contador global: resetear los barrios resetea el global por construcción.



#### Pruebas de Usuario (Validación E2E en el HUD - Fase 4 Slice UI):

**Prueba 1: Fatiga visible en la Pizarra Diaria**
- Acción: En un barrio con 5 tareas completadas hoy y 0 L de agua, abrir la Pizarra Diaria y mirar una tarea COMPLEX activa.

- Resultado esperado: La tarea muestra el badge `FATIGA ×0.5` y la recompensa a la mitad (`+50 CR / +25%`), no `+100 CR / +50%`.

**Prueba 2: Rotación de jornada al recargar**
- Acción: Dejar 1 tarea en "En Obra (Hoy)", cerrar la aplicación y reabrirla pasadas las 04:00 del día siguiente.

- Resultado esperado: La tarea vuelve al Plano Maestro, los contadores diarios del barrio y del HUD quedan en 0, la tesorería conserva las monedas de ayer y no aparece ninguna penalización.

**Estado: VALIDADO a mano (2026-11-15).** Fatiga visible y cobro a la mitad desde la 6ª tarea; rotación de jornada al recargar con reciclaje de tareas, contadores en 0, tesorería intacta y sin eventos fantasma en la segunda recarga.

### US-06 (usuario): Gestión, Mudanza y Retiro de Hábitos `[DONE]`
> **Alcance cerrado:** los 5 CAs están implementados y testeados (43 tests nuevos; 180 en el proyecto). **Fase 4 cerrada:** Plaza de Infraestructura y Museo de Hábitos en el Inspector, check-in en la Pizarra Diaria, mudanza con confirmación inline. El HUD no muestra eficiencia ni tasa de monedas: son de US-07 CA-01 (ver nota de la Prueba 1). **Pruebas 1-2 validadas a mano (2026-11-15).** **Prueba 3 diferida a DEV-01:** validar el retiro al Museo exige sembrar un hábito Nivel 5 sin ensuciar el XP real, y la herramienta DEV todavía no existe.
Como usuario, quiero registrar hábitos en un barrio, marcar su cumplimiento, cambiar su frecuencia, mudarlos de distrito o retirarlos al museo cuando alcancen su nivel máximo, para consolidar mis rutinas y liberar espacio manteniendo su reconocimiento histórico.   


#### Criterios de Aceptación (Dominio y Reglas):

**CA-01: Creación de Hábito y Límite de 4 Lotes Productivos por Barrio**

- Dado que un barrio posee menos de 4 hábitos activos o pausados en su Plaza de Infraestructura (status !== 'RETIRED_TO_MUSEUM'),  
- Cuando el usuario crea un nuevo hábito indicando un título válido y una frecuencia (DAILY o TIMES_PER_WEEK con count entre 1 y 6),  
- Entonces el sistema registra un nuevo HabitBuilding vinculado al neighborhoodId con status: 'ACTIVE', currentStreakDays: 0, checkpointLevel: 1, lastCompletedAt: null y createdAt: now (la ventana de enfriamiento corre desde createdAt, por lo que nace en Pleno: eficiencia derivada 1.0, ver GOVERNANCE.md DEC-013); y si el barrio ya tiene ocupados sus 4 lotes productivos, rechaza la creación hasta que uno se mude o se retire al Museo.  


**CA-02: Cumplimiento de Hábito (Check-in), Recarga al 100% y Desbloqueo de Checkpoints**

- Dado que un hábito se encuentra activo (status: 'ACTIVE') y aún no fue cumplido en el día operativo actual,  
- Cuando el usuario registra su cumplimiento en el instante now,  
- Entonces el hábito actualiza `lastCompletedAt: now` (su eficiencia derivada pasa a 1.0) e incrementa su progreso en +1 día (currentStreakDays); y si currentStreakDays alcanza por primera vez uno de los pisos seguros (7, 21, 50 o 100 días), sube checkpointLevel al nivel correspondiente (2, 3, 4 o 5) y acredita el XP Global único en el Ayuntamiento (+25, +50, +100 o +250 XP respectivamente).  


**CA-03: Cambio de Frecuencia con Cooldown y Reinicio al Piso del Checkpoint**

- Dado que el usuario solicita editar la frecuencia (frequency) de un hábito existente y no se ha modificado su frecuencia en los últimos 7 días,  
- Cuando el motor aplica el cambio de frecuencia en el instante now,  
- Entonces conserva intacto su checkpointLevel actual, ajusta currentStreakDays al piso exacto de dicho Checkpoint (0/1, 7, 21, 50 o 100), recalcula inmediatamente su eficiencia derivada (`getHabitEfficiency`) según lastCompletedAt con la nueva ventana de enfriamiento, e inicia un cooldown de 7 días antes de permitir otro cambio de frecuencia en ese hábito.   


**CA-04: Mudanza de Hábito entre Barrios con Economía Estanca**

- Dado que existe un hábito activo en un barrio de origen y el usuario confirma explícitamente mudarlo a un barrio destino que dispone de al menos 1 lote productivo libre (menos de 4 hábitos activos),  
- Cuando se ejecuta la acción de mudanza,  
- Entonces el hábito actualiza su neighborhoodId al barrio destino conservando intactos su checkpointLevel, currentStreakDays y lastCompletedAt (la eficiencia derivada se recalcula sola en el barrio destino) para empezar a producir monedas en el nuevo barrio a partir de ese instante, mientras que las monedas generadas anteriormente permanecen en el treasuryCoins del barrio de origen.  


**CA-05: Retiro con Honores al Museo de Hábitos en Nivel 5 (100 Días)**

- Dado que un hábito ha alcanzado el Nivel 5 (checkpointLevel === 5, 100 días cumplidos),  
- Cuando el usuario solicita retirarlo con honores al Museo del barrio en el instante now,  
- Entonces el hábito pasa a status: 'RETIRED_TO_MUSEUM' con retiredAt: now (eficiencia derivada 0.0: deja de producir monedas pero queda exhibido en el Museo del barrio), libera el lote físico en la Plaza de Infraestructura para permitir un nuevo hábito activo, y acredita +300 XP de Calidad de Vida al Ayuntamiento.  


#### Pendientes heredados entre CA de esta US (no confundir con CA nuevos)

- **Resuelto en CA-01:** el alta vive en `src/core/entities/habit.ts` (`createHabit`), no en una regla, siguiendo el precedente de `createNeighborhood`. El tope de 4 es una capacidad estructural y por eso es constante local (`PRODUCTIVE_LOTS`), igual que los 6 lotes de una cuadra en `urbanizationSettlement.ts`. El predicado de ocupación es literal: `status !== 'RETIRED_TO_MUSEUM'` (un hábito pausado **sí** ocupa lote). No existe `NEIGHBORHOOD_NOT_FOUND`: crear un hábito no requiere lookup del barrio, sólo filtrar por `neighborhoodId`.
- **Resuelto en CA-02:** `completeHabit` (`src/core/rules/habitCheckIn.ts`) compara días **operativos** con `getOperationalDay`, nunca fechas calendario: un check-in a las 03:00 pertenece a la jornada anterior (US-05 CA-01). Los pisos 7/21/50/100 y el XP +25/+50/+100/+250 viven en `economyConstants.ts` como `HABIT_CHECKPOINTS` (ECONOMY §5.1). La promoción es por **igualdad de racha** (`nuevaRacha === piso`), no derivando el nivel de la racha: es lo que el CA pide ("por primera vez") y lo que mantiene coherente el reinicio de CA-03.
- **CA-03 → US-07 CA-01 (contrato obligatorio, deuda de orden entre historias):** el CA dice que el cambio de frecuencia *"recalcula inmediatamente su eficiencia derivada (`getHabitEfficiency`)"*, pero esa función **no pertenece a esta US**. La ventana de enfriamiento `T` (escalones `0.5T` / `0.75T` / `T`, gracia y bono de *Inercia Urbana*) es **US-07 CA-01**. Resolución: la eficiencia es **derivada** de `(lastCompletedAt, frequency, now)`, así que cambiar `frequency` la cambia **por construcción**, sin llamar a nadie. US-06 no crea `getHabitEfficiency` ni la deja como stub; nace en US-07 CA-01 y US-06 no la necesita.
- **CA-03 → tipo:** `HabitBuilding` gana `lastFrequencyChangeAt: TimestampMs | null` (no estaba en `ARCHITECTURE.md` §5). El ripple llega a `dayZero.ts`, donde el hábito semilla nace en `null`. El cooldown se mide en **millisegundos exactos** (7 × 24 h), no en días operativos: es una espera, no una jornada.
- **CA-03 → piso del nivel 1:** el CA escribe el piso como `"0/1"`. Se resuelve a **0**, porque `createHabit` nace con `currentStreakDays: 0` y la promoción a nivel 2 ocurre exactamente al llegar a 7. Adoptar 1 haría que un alta nueva "arranque" con un día regalado.
- **CA-03 → ubicación de la constante:** el cooldown de 7 días entra en `economyConstants.ts` aunque **`ECONOMY.md` no lo declara en ninguna tabla**: hoy el único origen es este CA. Queda como deuda de documentación (ver `DOC-01` en Deuda Registrada), no como libertad para volver a inventarlo dentro de la regla.
- **CA-04 → CA-01:** la mudanza **no** revalida el tope de lotes con `createHabit`: el destino necesita su propio chequeo de lote libre (menos de 4 activos). Reusar el contador de `habit.ts` es válido; duplicar el `4` no.
- **Resuelto en CA-04:** `moveHabit` (`src/core/rules/habitRelocation.ts`) reusa `hasFreeProductiveLot`, exportado desde `entities/habit.ts`, así que el `4` sigue viviendo en un lugar. La mudanza es un spread: nivel, racha, `lastCompletedAt` y el cooldown de frecuencia viajan intactos, y ningún `treasuryCoins` se toca. Se agregó la guarda **`SAME_NEIGHBORHOOD`**, que el CA no nombra: sin ella, mudar a un barrio propio con 4 hábitos devolvía `PRODUCTIVE_LOTS_FULL`, un diagnóstico falso. **No se agregó `movedAt`** (YAGNI: no hay contabilidad de devengado todavía); queda el agujero declarado para US-07 CA-03.
- **Resuelto en CA-05:** `retireHabit` (`src/core/rules/habitRetirement.ts`) exige `checkpointLevel === 5` y `status === 'ACTIVE'`. El guard de estado no es decorativo: **sin él los +300 XP se pueden cobrar en bucle**. `retiredAt` es requerido y nullable (la placa del Museo necesita la fecha). Los +300 viven en `HABIT_MUSEUM_RETIREMENT_TOWN_HALL_XP` (ECONOMY §5.1). El test que importa aserta la **consecuencia** — que el barrio vuelve a aceptar un quinto hábito — no el cambio de `status`.
- **Fase 4 → HUD:** `Plaza`/`Museo` viven en el Inspector y el check-in en la Pizarra Diaria. El HUD **no** muestra eficiencia, `%` de suministro ni tasa de monedas: son de US-07 CA-01. La ocupación `N/4` y el predicado de lote ocupado se **importan** de `core/entities/habit.ts` (`PRODUCTIVE_LOTS`, `countProductiveHabits`); la capa de presentación no reimplementa la regla. "Cumplido hoy" se decide comparando días operativos contra el **instante actual**, nunca contra `state.lastOperationalDay`, que sólo está tan fresco como el último tick. La confirmación de mudanza es **inline** y no un modal: `UI_DESIGN.md` §7 auditoría 8 fija `bg-pearl` en exactamente 3 superficies. El check-in usa botón negro, no `red-600`: el acento está limitado a cinco puestos (§6). `changeHabitFrequency` está en el store pero **sin cablear a la UI**: ninguna Prueba de Usuario de esta US lo pide.


#### Pruebas de Usuario (Validación E2E en el HUD - Fase 4 Slice UI):

**Prueba 1: Alta de hábitos, tope de 4 lotes y primer check-in**

- Acción: En el Inspector del barrio "GYM", crear un hábito "Entrenar Fuerza" (3 veces por semana) y luego marcar su check-in desde la Pizarra Diaria (En Obra (Hoy)). Intentar crear un 5to hábito en el mismo barrio tras haber llenado los 4 lotes.  

- Resultado esperado: Al crearse, "Entrenar Fuerza" aparece en la Plaza de Infraestructura en Nv.1, con racha 0 d y ocupando 1 de 4 lotes; el hábito **nace en Pleno** (eficiencia derivada 1.0) porque la ventana de enfriamiento corre desde `createdAt` (DEC-013). Al marcar el check-in desde la Pizarra Diaria, la fila pasa a "Cumplido Hoy" y la racha sube a 1 d. Al intentar crear un 5to hábito en "GYM", la UI bloquea el alta indicando que los 4 lotes de la Plaza de Infraestructura están ocupados.  

> **Corregida (2026-11-15):** esta prueba decía antes *"figura apagado (0%) … se enciende al 100% (5 🪙/h)"*. Contradecía su propio CA-01 y a DEC-013 (origen de la ventana: `createdAt`, no el primer check-in). La **eficiencia visible** y la **tasa de monedas por hora** son de **US-07 CA-01** (`getHabitEfficiency`): hasta que esa US exista, el HUD no las muestra y US-06 no las inventa. La Fase 4 de US-06 valida alta, racha, tope de lotes y check-in; no valida producción. **US-07 ya cerró a dominio (2026-11-15) y el HUD sigue sin mostrarlas**: la presentación es ahora `UX-02`, no un pendiente implícito de esta prueba.


**Prueba 2: Mudanza de distrito con confirmación**

- Acción: En el Inspector de "GYM" (con 200 🪙 acumulados), seleccionar el hábito "Leer documentación", elegir [Mudar de Barrio -> Estudio] y aceptar el diálogo de confirmación.  

- Resultado esperado: El hábito desaparece de la Plaza de "GYM" (dejando 1 lote libre y manteniendo sus 200 🪙 intactos en "GYM") y aparece en la Plaza de "Estudio" con la misma racha, nivel y eficiencia que tenía.  


**Prueba 3: Retiro al Museo en Nivel 5**

- Acción: Sobre un hábito en Nivel 5 (100 días), hacer clic en [🏛️ Retirar con Honores al Museo].  
- Resultado esperado: El Ayuntamiento suma +300 XP en la Barra Superior, la Plaza de Infraestructura del barrio libera el lote (3/4 ocupados) y la pestaña del Museo de Hábitos del barrio muestra la placa conmemorativa con el nombre del hábito y su fecha de retiro.   



### US-07 (sistema): Producción Pasiva y Decaimiento con Piso Seguro `[DONE]`
> **Alcance cerrado: dominio.** Los 4 CAs están implementados y testeados (54 tests nuevos; 234 en el proyecto). **La US no declara Pruebas de Usuario ni Fase 4 propias**, así que no hay HUD que validar aquí: su única consecuencia visible —eficiencia y tasa de monedas por hora— es la deuda visual `UX-02`, que US-06 difirió explícitamente a esta US y que **no es un CA del motor**. Queda además una precisión abierta en `ECONOMY.md` §2.1.1: el "margen de gracia" del switch `DAILY` está fijado en 4 h como constante económica (`HABIT_DAILY_GRACE_HOURS`), **no** en `config.dayCycle.gracePeriodHours`.

El sistema debe calcular la generación pasiva de monedas y reducir gradualmente la eficiencia del hábito según el tiempo transcurrido sin cumplirse de forma transparente, para que el usuario reciba ingresos constantes por su constancia y conserve su último piso seguro sin castigos destructivos si falla.  


#### Criterios de Aceptación:

**CA-01: Ventana de Enfriamiento (T) e Inercia Urbana por Nivel de Barrio**
- Dado que un hábito activo (status: 'ACTIVE') pertenece a un barrio con un infrastructureLevel determinado (1, 2, 3 o 4),  
- Cuando el motor calcula su ventana total de enfriamiento T (en horas) a partir de su último cumplimiento (lastCompletedAt),  
- Entonces suma el bono de Inercia Urbana del barrio (+0h en Nv.1, +2h en Nv.2, +4h en Nv.3, +6h en Nv.4) a la ventana base según su frecuencia:   Para hábitos semanales (TIMES_PER_WEEK con frecuencia X) o fórmula continua: T = ((7/X) * 24) + 12h + InerciaUrbana (o las 24h + margen de gracia para el switch DAILY).   


**CA-02: Curva Escalonada de Decaimiento de Eficiencia (1.0 -> 0.66 -> 0.33 -> 0.0)**
- Dado que han transcurrido 't' horas desde el lastCompletedAt de un hábito activo con ventana de enfriamiento T,  
- Cuando el motor evalúa el estado de suministro del hábito en el instante now,  
- Entonces su eficiencia derivada (`getHabitEfficiency`) sigue los escalones exactos de ECONOMY.md. Valores canónicos exactos `{1, 2/3, 1/3, 0}` (ver `GOVERNANCE.md` DEC-006): los `0.66` / `0.33` de los corchetes son presentación redondeada y no deben usarse como valor de cálculo:   Pleno (1.0 / 100%): si 0 <= t <= 0.5T.   Desgaste (0.66 / 66%): si 0.5T < t <= 0.75T (aplica a hábitos de tanque semanal; los hábitos DAILY operan como switch pasando de 1.0 a 0.0 al vencer su ventana).   Crítico (0.33 / 33%): si 0.75T < t < T.   Apagón (0.0 / 0%): si t >= T.   


**CA-03: Liquidación Determinista de Monedas Pasivas por Intervalo (Delta t)**
- Dado que la ciudad se encuentra activa (cityStatus === 'ACTIVE') y transcurre un intervalo de tiempo Delta t = now - lastTickAt,  
- Cuando el motor ejecuta calculateTick(state, now),  
- Entonces calcula para cada hábito activo las monedas generadas en cada tramo horario según su eficiencia (E) y el multiplicador del barrio (M_barrio = 0.5 si reactivationPenaltyUntil > now, o 1.0 en caso normal) a razón de 5.00 monedas/hora al 100% (120/día), 3.33 monedas/hora al 66% (80/día), 1.66 monedas/hora al 33% (40/día) y 0 monedas/hora al 0%, acreditando el total en treasuryCoins de su barrio a través del acumulador de resto por barrio (`ECONOMY.md` §2.1.2) y adelantando lastTickAt = now **sólo si la liquidación o alguna regla de dominio mutó el estado** (DEC-018): un latido técnico sin mutación devuelve el mismo `GameState` y no emite evento.   


**CA-04: Protección de Piso Seguro (Retroceso al Checkpoint en Caso de Apagón)**
- Dado que un hábito activo supera su ventana máxima de enfriamiento sin renovarse (t >= T) y cae en Apagón (eficiencia derivada 0.0),  
- Cuando el motor procesa la caída a 0% de eficiencia,  
- Entonces el hábito detiene su producción de monedas pero no pierde su edificio ni vuelve a cero absoluto: conserva intacto su checkpointLevel alcanzado (1, 2, 3, 4 o 5) y retrocede su currentStreakDays únicamente hasta el piso de días de ese último Checkpoint seguro (0/1 en Nv.1, 7 en Nv.2, 21 en Nv.3, 50 en Nv.4, o 100 en Nv.5). (La caída a Apagón es una **mutación de negocio**, no un latido técnico: emite su propio evento. **No necesita marca persistida** — el retroceso al piso es idempotente, así que una segunda aplicación deja el estado idéntico y DEC-018 lo descarta por igualdad de estado.)   



#### Pendientes heredados entre CA de esta US (no confundir con CA nuevos)
- **CA-03 → US-05 CA-02 (deuda aceptada, DEC-016):** `calculateTick` ya existe desde US-05 como orquestador de jornada (reciclaje nocturno y reset diario). Esta US **extiende esa misma función** con la liquidación de producción pasiva: no crea un segundo tick ni reimplementa la detección de cambio de día operativo.

### US-08 (usuario): Registro de Hidratación, Lectura y Sesiones de Foco `[DONE]`
> **Alcance cerrado:** dominio + Fase 4. Los 4 CAs y las Pruebas 1-3 están implementados y validados a mano (2026-11-16), con 284 tests en el proyecto. El control Pomodoro ejecuta el **set completo**: 4 bloques de trabajo encadenados con sus descansos (`getBreakAfterWork` / `isPomodoroSetComplete`, funciones puras en `src/core`), cierra al completar `cyclesBeforeLongBreak` y sólo interrumpir un bloque de trabajo lo corta. El alta de presets (`+Preset`, CA-03) vive inline en la cinta negra y `useGameStore.createPreset` dejó de descartar `shortBreakMinutes`/`longBreakMinutes`. Un snapshot sembrado antes de que `PomodoroPreset` tuviera `id`/`name` se sanea en `normalizeSavedState`, de donde salían los chips en blanco que apuntaban siempre al preset de 25 min. **El foco todavía no paga monedas ni XP:** eso es US-09 CA-03/CA-04 (DEC-020), y las monedas que se mueven al terminar un bloque son producción pasiva de hábitos liquidada en `requireSettledState` (DEC-019).

Como usuario, quiero registrar mi consumo de agua, mis páginas leídas y mis sesiones de concentración asignadas a un barrio, para hacer evolucionar los edificios centrales de la ciudad y obtener recompensas por mi tiempo de estudio.   


#### Criterios de Aceptación (Dominio y Reglas):

**CA-01: Registro Rápido de Agua (+0.5 L / +1.0 L) y Evolución del Acueducto Central**
- Dado que el usuario ejecuta la acción de registrar agua (0.5 o 1.0 litros) en el instante now,  
- Cuando el motor procesa el suministro hídrico en el Acueducto Central (globals.aqueduct),  
- Entonces incrementa dailyLiters y totalHistoricalLiters (respetando el tope diario regulado por el sistema), y actualiza automáticamente el level del Acueducto Central si totalHistoricalLiters alcanza o supera los umbrales de evolución: Nivel 1 (0 L), Nivel 2 (15 L), Nivel 3 (60 L), Nivel 4 (200 L) y Nivel 5 (500 L).   


**CA-02: Registro de Páginas Leídas y Evolución de la Gran Biblioteca**
- Dado que el usuario ingresa una cantidad entera positiva de páginas leídas,  
- Cuando el motor acredita la lectura en la Gran Biblioteca (globals.library),  
- Entonces suma las páginas válidas del día al acumulador totalPagesRead, y actualiza el level de la Gran Biblioteca al cruzar sus umbrales históricos: Nivel 1 (0 págs), Nivel 2 (100 págs), Nivel 3 (500 págs), Nivel 4 (1.500 págs) y Nivel 5 (5.000 págs).   


**CA-03: Creación y Selección de Presets Pomodoro Personalizados**
- Dado que la configuración inicial incluye por defecto los presets 25/5 y 50/15 (cyclesBeforeLongBreak: 4),  
- Cuando el usuario crea un nuevo PomodoroPreset definiendo un nombre y los minutos de trabajo W (workMinutes > 0),   Entonces el sistema sugiere por defecto un descanso corto de [W / 5] minutos (shortBreakMinutes, editable por el usuario), 4 bloques antes del descanso largo (cyclesBeforeLongBreak) y un descanso largo opcional (longBreakMinutes: number | null), guardándolo en config.pomodoroPresets.   


**CA-04: Ejecución de Sesión Pomodoro Asignada a un Barrio**
- Dado que existe al menos un barrio activo y el usuario selecciona un barrio destino y un PomodoroPreset,
- Cuando inicia la sesión de foco y decide completarla al llegar a workMinutes o interrumpirla anticipadamente tras haber transcurrido al menos 1 minuto,
- Entonces el sistema registra la sesión de foco vinculada al neighborhoodId seleccionado y dispara el cálculo de liquidación de monedas locales (para ese barrio) y XP Global (para el Ayuntamiento).
- Y al completar un bloque de trabajo encadena el descanso que dicta el preset: descanso corto (`shortBreakMinutes`) después de cada bloque, y descanso largo (`longBreakMinutes`) al completar `cyclesBeforeLongBreak` bloques de trabajo; si `longBreakMinutes` es `null`, repite el descanso corto. Los descansos **no** registran sesión de foco, no acreditan monedas ni XP y no piden confirmación al cancelarse. El ciclo **encadena solo**: al terminar o saltear un descanso arranca el siguiente bloque de trabajo, salvo que el set ya haya completado sus `cyclesBeforeLongBreak` bloques —ahí el set **termina** y hay que iniciar uno nuevo—, o que se interrumpa un bloque de trabajo, que también lo cierra. El siguiente bloque de trabajo liquida como sesión nueva. Qué descanso corresponde y cuándo cierra el set son **funciones puras de `src/core`**, nunca lógica suelta en `src/ui`.


#### Pendientes heredados entre CA de esta US (no confundir con CA nuevos)
- **CA-01/CA-02/CA-04 → US-09 (contrato obligatorio, DEC-020):** el *hard cap* diario (3.0 L / 150 págs) es de **US-09 CA-01**; US-08 acredita **sin recortar** y US-09 lo envuelve. "Páginas del día" sigue diferido a US-09 (`GOVERNANCE.md` §4). La curva `F_día` y la regla del 80% son **US-09 CA-03/CA-04**: US-08 registra la sesión y dispara, no liquida.
- **CA-01 → umbrales de nivel:** 15 / 60 / 200 / 500 L son de `ECONOMY.md` §5.1 y viven en `economyConstants.ts`, nunca dentro de la regla (misma deuda de estilo que `townHallLevel.ts`, que hoy tiene su tabla adentro).
- **CA-03 → tipos:** `PomodoroPreset` no tiene `id` ni `longBreakMinutes`, y el CA exige ambos (`longBreakMinutes: number | null`). El ripple toca `dayZero.ts`. `shortBreakMinutes` sugerido = `floor(W / 5)` es un **valor por defecto editable**, no una regla de dominio: se sugiere en el formulario, no se reimpone en `core` (DEC-017).
- **CA-04 → sin sesión persistida todavía:** la "liquidación" de esta US es un disparo. Si US-09 necesita el detalle de la sesión, el tipo nace ahí, no acá (YAGNI).
- **CA-03 → formulario de alta cableado:** `+Preset` en el control Pomodoro abre un formulario inline sobre la cinta negra (nombre, W, descanso corto sugerido `floor(W/5)` y editable, descanso largo opcional). `cyclesBeforeLongBreak` queda fijo en 4 porque el CA no lo declara editable. `useGameStore.createPreset` acepta el `Omit<NewPomodoroPresetInput, 'id'>` completo: antes descartaba el descanso corto y largo, que son justamente los campos que este CA exige.
- **CA-03/CA-04 → snapshot legacy (saldado):** un `GameState` sembrado antes de que `PomodoroPreset` tuviera `id`/`name` se hidrataba intacto y el control Pomodoro mostraba chips en blanco que apuntaban todos al primer preset (siempre 25 min). `normalizeSavedState` ahora reconstruye `id`, `name`, `shortBreakMinutes` y `longBreakMinutes` derivándolos de `workMinutes`, que es el único dato que ese snapshot guardaba. El contador `cyclesBeforeLongBreak` acumula bloques **dentro del set** y sólo se resetea al pulsar Iniciar —que abre un set nuevo— o al cambiar de preset; resetearlo sin cierre explícito del set habría impedido que existiera el descanso largo.


#### Pruebas de Usuario (Validación E2E en el HUD - Fase 4 Slice UI):

**Prueba 1: Botones de 1 clic de Hidratación en la Barra Superior**
- Acción: En la Barra Superior Flotante, hacer clic en [+500ml] y luego en [+1L].  
- Resultado esperado: El indicador de hidratación diaria en la barra superior pasa de 0.0 / 2.0 L a 0.5 / 2.0 L y luego a 1.5 / 2.0 L, actualizando el contador histórico del Acueducto.   


**Prueba 2: Carga rápida de Lectura y subida a Nivel 2 de la Gran Biblioteca**
- Acción: En la Barra Superior, hacer clic en [+Págs], ingresar 100 páginas y confirmar.  
- Resultado esperado: El contador de la Gran Biblioteca muestra 100 págs y su indicador de nivel sube inmediatamente de Nivel 1 a Nivel 2.   


**Prueba 3: Ciclo de Reloj Pomodoro completo y cancelación con advertencia**
- Acción: En el control Pomodoro de la Barra Superior, elegir el barrio "Estudio", seleccionar el preset 25/5 e iniciar el reloj. Probar detenerlo antes de tiempo haciendo clic en [Cancelar].  
- Resultado esperado: Al intentar cancelar un bloque en curso, el HUD muestra un modal/mensaje de advertencia informando que se acreditará el 80% de los minutos transcurridos en monedas para "Estudio" y XP para el Ayuntamiento antes de confirmar la interrupción.   



### US-09 (sistema): Bonos Hídricos, Topes Diarios y Liquidación de Foco `[DONE]`
> **Alcance cerrado:** dominio + Fase 4 (2026-11-17), con 318 tests en el proyecto. Los 4 CAs están en verde y conectados: `recordFocus` registra la sesión y la liquida en el **mismo commit** (DEC-019), así que el barrio cobra al instante; el HUD no necesita el evento para mostrar recompensas porque deriva el tramo de `F_día` con `getFocusTier` (`F {acumulado} · Óptimo/Fatiga/Agotamiento` en la leyenda del bloque de trabajo). La advertencia del 80 % al cancelar ya existía desde US-08 y sigue siendo inline sobre negro, no un modal (UI_DESIGN §7, auditoría 8). US-09 no declara Pruebas de Usuario propias: su validación E2E es la de US-08 más el registro de agua y páginas de la TopBar.
Como sistema, necesito otorgar bonos de energía diaria cuando el usuario registra agua, aplicar topes diarios saludables y liquidar recompensas proporcionales cuando una sesión de foco termina o se interrumpe, para que el usuario vea reflejado su cuidado personal en el rendimiento de la ciudad sin perder el crédito por sesiones parciales.  


#### Criterios de Aceptación:

**CA-01: Tope Efectivo Diario (Hard Cap) en Hidratación (2.0 L, DEC-021) y Lectura (150 págs)**
- Dado que los suministros globales autodeclarados poseen topes anti-exploit por día operativo,  
- Cuando el usuario registra litros de agua o páginas leídas que harían superar el acumulado del día operativo actual por encima de 3.0 L de agua o 150 páginas,  
- Entonces el motor recorta el incremento acreditable de modo que el aporte sumado a totalHistoricalLiters del Acueducto nunca supere 2.0 L en un mismo día operativo (**DEC-021**: el cupo es igual a la meta diaria y el HUD lo muestra como denominador), y el aporte sumado a totalPagesRead de la Gran Biblioteca nunca supere 150 páginas en un mismo día operativo (reiniciando ambos cupos al cambiar de día operativo).  


**CA-02: Bonos Sistémicos del Agua (Ampliación de Estamina y Presión de Calderas)**
- Dado que el usuario incrementa dailyLiters en el Acueducto Central durante el día operativo actual,  
- Cuando dailyLiters alcanza los umbrales de 1.0 L y 2.0 L (dailyTargetLiters),  
- Entonces el sistema amplía automáticamente en +1 tarea por cada litro entero (máximo +2 tareas con 2.0 L) el tramo óptimo del 100% tanto en el cupo local de todos los barrios como en la Estamina Global de la ciudad (B_agua = min(2, dailyLiters)); y al alcanzar la meta diaria (dailyLiters >= dailyTargetLiters), limpia en el acto cualquier penalización activa de Arranque de Motores (reactivationPenaltyUntil = null) en todos los barrios de la ciudad.   


**CA-03: Liquidación de Pomodoro por Curva de Fatiga Mental Diaria (F_día)**
- Dado que la ciudad lleva un acumulador de minutos efectivos de foco completados en el día operativo actual (F_día), que se reinicia a 0 en cada corte de día),  
- Cuando se liquidan M minutos efectivos de una sesión Pomodoro asignada a un barrio,  
- Entonces el motor evalúa minuto a minuto (permitiendo tramos mixtos si una sesión cruza un umbral) en qué rango de F_día cae cada minuto trabajado y acredita al barrio y al Ayuntamiento:   Foco Óptimo (Minuto 1 al 100 del día): 2.0 monedas / min al barrio y 1 XP Global cada 5 minutos acumulados en este tramo (máximo 20 XP).   Fatiga Mental (Minuto 101 al 200 del día): 1.0 moneda / min al barrio y 1 XP Global cada 10 minutos acumulados en este tramo (máximo 10 XP).   Agotamiento (Minuto 201 en adelante): 0.2 monedas / min al barrio y 0 XP Global.   


**CA-04: Liquidación Proporcional por Interrupción de Pomodoro (Regla del 80%)**
- Dado que una sesión Pomodoro en curso de duración objetivo W se cancela o interrumpe antes de finalizar habiendo transcurrido t_transcurridos minutos (0 < t_transcurridos < W),  
- Cuando el motor procesa la cancelación de la sesión,  
- Entonces calcula los minutos efectivos como MinutosEfectivos = [t_transcurridos * 0.80] y los liquida aplicando exactamente la misma curva de fatiga diaria (F_día) del CA-03, sumando únicamente esos MinutosEfectivos al acumulador diario F_día.  

#### Notas de implementación

- **CA-01 → modelo del cupo de páginas:** `CentralLibrary.dailyPagesRead` es el acumulador del día operativo. Se incrementa dentro de `registerPageReading` (US-09 **extiende** la regla de US-08, mismo patrón que `calculateTick`/DEC-016) y se reinicia en `calculateTick`, al lado de `dailyLiters`. `applyWaterDailyCap` / `applyPageDailyCap` en `src/core/rules/dailyCaps.ts` son los dueños únicos del *hard cap* (DEC-020): recortan al remanente y devuelven la **misma referencia** cuando el cupo está agotado, para que el store no emita un evento sin mutación.
- **CA-01 → UI:** el acumulador del día **no se muestra** en ninguna superficie. La TopBar sólo emite un aviso sin números (*"Cupo diario: no todas las páginas se acreditaron"*) cuando `creditedPages < páginas pedidas`. El agua recortada hoy es silenciosa: no hay aviso pedido.
- **CA-01 → ripple:** `registerWaterIntake` pasa a recibir `number` en vez de `WaterIntakeAmount`, porque un recorte puede dejar una fracción (2.5 L + 1 L → 0.5 L acreditados). El tipo cerrado sigue siendo el de la UI y el store.
- **CA-01 → snapshot legacy:** `normalizeSavedState` siembra `dailyPagesRead: 0` cuando el snapshot es anterior a este CA; sin eso el primer registro del día hacía `undefined + n = NaN` y envenenaba el cupo. 
- **CA-02 → el bono ya estaba cubierto:** `getWaterBonusTasks` (`min(2, ⌊dailyLiters⌋)`) alimenta el cupo local y la Estamina Global desde US-05 CA-03/CA-04. Lo nuevo es `isWaterDailyTargetMet` + `clearReactivationPenaltiesAtWaterTarget` en `dailyCaps.ts`, compuestos dentro de `applyWaterDailyCap` para que el store no encadene reglas. `reactivationPenaltyUntil` sigue **sin productor**: escribirlo es US-11 CA-02, que consume el mismo predicado en vez de repetir la comparación.
- **CA-03 → acumulador y XP derivado:** `GameState.dailyFocusMinutes` es `F_día` (se reinicia en `calculateTick` y `normalizeSavedState` lo siembra en 0 para snapshots anteriores). `liquidateFocus` parte la sesión por intersección con cada tramo y paga cada minuto a su tarifa. El XP **no se guarda**: es `⌊min(F,100)/5⌋ + ⌊min(max(F−100,0),100)/10⌋` y se acredita por diferencia entre el acumulado de después y el de antes; guardar "XP ya otorgado" aparte sería una segunda fuente de verdad que puede divergir. Los topes 20 / 10 del CA no son constantes: salen del cociente entre la duración del tramo y su bloque de XP. Las fracciones de Agotamiento (0.2/min) van al `pendingCoinsRemainder` del barrio a través de `coinCredit.ts`, el mismo dueño del redondeo que usa la producción pasiva.
- **CA-04 → el 80 % es de la liquidación, no del registro:** `recordFocusSession` (US-08, en verde) conserva `focusMinutes` crudos; `liquidateFocusSession` aplica la regla en forma **racional** (4/5, `FOCUS_CURVE.interruptionRetained`) sobre esos minutos y delega en `liquidateFocus`. Multiplicar por `0.8` en coma flotante puede tirar un minuto entero al tramo de abajo. Una interrupción cuyo 80 % no alcanza el minuto devuelve la misma referencia: se registra la sesión, no se liquida nada.
- **Fase 4 → cableado:** `recordFocus` compone `recordFocusSession` + `liquidateFocusSession` y commitea el estado ya liquidado, así que el evento y las monedas son atómicos (DEC-019). El payload del evento sigue igual: el HUD deriva el tramo con `getFocusTier` en vez de leer recompensas del evento.



### US-10 (usuario): Pausa Manual Consciente: `[DONE]`
> **Alcance cerrado:** dominio + Fase 4 (2026-11-17), con 339 tests en el proyecto. Los 3 CAs están en verde y conectados: `activateManualPause` liquida con `calculateTick` antes de congelar, `getCityNow` mantiene el reloj de la ciudad en `lastTickAt` durante la pausa (producción 0, racha y eficiencia intactas, sin auto-pause) y `resumeManualPause` desplaza el `lastCompletedAt` de los hábitos activos por la duración exacta, limpia el motivo y anula `reactivationPenaltyUntil`. Completar tareas y hábitos se rechaza durante la pausa (el store no emite evento fantasma). Las 3 Pruebas de Usuario se validaron a mano en el HUD.
Como usuario, quiero pausar y reanudar la ciudad indicando un motivo, para congelar mis rachas y ausentarme temporalmente sin sufrir penalizaciones.  


#### Criterios de Aceptación (Dominio y Reglas):

**CA-01: Activación de Pausa Manual con Motivo Obligatorio y Liquidación Previa**
- Dado que la ciudad se encuentra activa (cityStatus === 'ACTIVE'),  
- Cuando el usuario solicita activar la Pausa Manual en el instante now ingresando un texto de motivo (manualPauseReason),  
- Entonces el sistema valida que el motivo no sea una cadena vacía ni solo espacios en blanco; si es válido, primero ejecuta calculateTick(state, now) para liquidar cualquier producción pasiva pendiente hasta ese segundo exacto, cambia cityStatus a 'MANUAL_PAUSE', guarda el motivo en manualPauseReason y actualiza lastTickAt y lastUserInteractionAt a now. (Si el motivo está vacío, rechaza la acción sin mutar el estado).   


**CA-02: Congelamiento Total durante la Pausa Manual (Producción 0 y Rachas Intactas)**
- Dado que la ciudad se encuentra en estado 'MANUAL_PAUSE',  
- Cuando transcurre cualquier cantidad de horas o días y el motor ejecuta calculateTick(state, now),  
- Entonces la producción pasiva de monedas de todos los hábitos es exactamente 0, el tiempo transcurrido en pausa no se descuenta de la ventana de enfriamiento de los hábitos (manteniendo congeladas su eficiencia derivada (evaluada contra el Día Operativo Activo, ver `GOVERNANCE.md` §2.4) y su currentStreakDays al valor exacto que tenían al pausar), no se dispara el Auto-Pause por Inactividad (72h), y cualquier intento de completar tareas o hábitos mientras dure la pausa es rechazado hasta reanudar la ciudad.  


**CA-03: Reanudación de la Ciudad sin Penalización de Retorno**
- Dado que la ciudad se encuentra en 'MANUAL_PAUSE',  
- Cuando el usuario ejecuta la acción de reanudar la ciudad en el instante now,  
- Entonces el sistema restablece cityStatus a 'ACTIVE', limpia manualPauseReason (undefined), actualiza lastTickAt = now y lastUserInteractionAt = now, y desplaza hacia adelante el lastCompletedAt de los hábitos activos por la duración exacta que estuvo pausada la ciudad (para que retomen su curva de enfriamiento en el mismo punto exacto donde quedaron congelados), sin aplicar la penalización del 50% de Arranque de Motores (reactivationPenaltyUntil: null).  


#### Pruebas de Usuario (Validación E2E en el HUD - Fase 4 Slice UI):

**Prueba 1: Validación de motivo obligatorio al pausar**
- Acción: Abrir el menú/modal de Pausar Ciudad en el HUD e intentar confirmar con el campo de motivo vacío. Luego escribir "Semana de finales" y confirmar.  
- Resultado esperado: Con el campo vacío, el botón de confirmar permanece deshabilitado (o muestra error de campo requerido). Al ingresar "Semana de finales", la interfaz entra en estado visual de Ciudad en Pausa Manual, mostrando el motivo en pantalla y el botón [▶️ Reanudar Ciudad].   


**Prueba 2: Bloqueo de acciones e inmunidad al paso del tiempo**
- Acción: Con la ciudad en Pausa Manual (y un hábito al 100% de eficiencia), simular el avance de 48 horas (o recargar la app tiempo después) e intentar tildar una tarea en la Pizarra Diaria.  
- Resultado esperado: El hábito sigue mostrando 100% de eficiencia, la tesorería del barrio no sumó monedas pasivas durante esas horas, y los controles de completar tareas/hábitos indican que primero debe reanudarse la ciudad.  


**Prueba 3: Reanudación limpia al 100%**
- Acción: Hacer clic en [▶️ Reanudar Ciudad].  
- Resultado esperado: El aviso de pausa desaparece, los hábitos retoman su producción normal al 100% (5 🪙/h) sin mostrar penalización de Arranque de Motores, y la Pizarra Diaria vuelve a permitir completar tareas y hábitos. 



### US-11 (sistema): Hibernación por Inactividad y Arranque de Motores: `[DONE]`
> **Alcance cerrado:** dominio + Fase 4 (2026-11-17), con 363 tests en el proyecto. Los 4 CAs están en verde y conectados: `calculateTick` hiberna a las 72 h de inactividad (hábitos `PAUSED`, racha al piso seguro, `lastTickAt` marcado, `CITY_HIBERNATED` en el Outbox); completar una tarea o un hábito en un barrio lo reactiva con `reactivationPenaltyUntil = now + 24 h`, salvo que la meta diaria de agua ya esté cumplida; la liquidación pasiva parte el intervalo en el borde de la ventana (×0.5 antes, ×1 después) y limpia la penalización al vencer; registrar agua hasta la meta libera todos los barrios. La actividad del usuario se sella en `requireSettledState`, así que el latido técnico no posterga la hibernación. El HUD permite completar durante la hibernación (sólo la pausa manual bloquea) y muestra el aviso correspondiente.
Como sistema, necesito poner la ciudad en hibernación cuando detecte una inactividad prolongada y aplicar un período de adaptación al reactivar cada barrio, para proteger la ciudad durante ausencias imprevistas y acompañar el retorno gradual del usuario.  


#### Criterios de Aceptación:

**CA-01: Disparo Automático de Hibernación tras 72 Horas de Inactividad**
- Dado que la ciudad se encuentra activa (cityStatus === 'ACTIVE') y el tiempo transcurrido desde la última interacción del usuario supera o iguala las 72 horas (now - lastUserInteractionAt >= 72 horas),  
- Cuando el motor ejecuta el cálculo de actualización (calculateTick(state, now)),   
- Entonces liquida únicamente la producción pasiva que les correspondía a los hábitos hasta el momento de agotarse sus ventanas de enfriamiento (o hasta el límite de las 72 horas), cambia el estado global a cityStatus: 'AUTO_PAUSED_HIBERNATION', apaga todos los hábitos activos llevando su eficiencia derivada a 0.0, y retrocede el currentStreakDays de cada hábito hasta el piso seguro de su último checkpointLevel alcanzado (0/1, 7, 21, 50 o 100).   


**CA-02: Reactivación de la Ciudad e Inicio de "Arranque de Motores" por Barrio (50% por 24h)**
- Dado que la ciudad se encuentra en 'AUTO_PAUSED_HIBERNATION' (o un barrio sigue pendiente de reactivación tras una hibernación),   
- Cuando el usuario regresa y completa 1 tarea o 1 hábito en un barrio específico en el instante now,   
- Entonces el estado global de la ciudad vuelve a cityStatus: 'ACTIVE' con lastUserInteractionAt = now, y ese barrio se reactiva entrando en período de Arranque de Motores: el sistema asigna reactivationPenaltyUntil = now + 24 horas en dicho barrio (a menos que la meta diaria de agua ya esté cumplida en ese instante).  


**CA-03: Penalización del 50% en Producción Pasiva durante el Arranque de Motores**
- Dado que un barrio posee una ventana de penalización activa (reactivationPenaltyUntil !== null y now < reactivationPenaltyUntil),  
- Cuando el motor liquida la producción pasiva de monedas de los hábitos activos de ese barrio durante calculateTick(state, now),  
- Entonces aplica un multiplicador de barrio M_barrio = 0.5 (50% de producción), reduciendo a la mitad las tasas horarias (2.50 🪙/h al 100%, 1.665 🪙/h al 66%, 0.83 🪙/h al 33%) hasta el instante exacto en que now alcance reactivationPenaltyUntil, momento a partir del cual limpia reactivationPenaltyUntil = null y restaura el multiplicador al 100% (M_barrio = 1.0).  


**CA-04: Cancelación Instantánea del Arranque de Motores por Presión de Calderas (Meta de Agua)**
- Dado que uno o más barrios tienen activa la penalización de Arranque de Motores (reactivationPenaltyUntil > now),  
- Cuando el usuario registra agua y alcanza o supera la meta diaria en el Acueducto Central (dailyLiters >= dailyTargetLiters, por defecto 2.0 L),  
- Entonces el sistema anula inmediatamente la penalización estableciendo reactivationPenaltyUntil = null en todos los barrios, restaurando al instante el 100% de la producción en toda la ciudad.   



### US-12 (usuario): Comandos Rápidos, Reversibilidad Manual y Respaldos: `[IN PROGRESS]`
Como usuario, quiero ejecutar acciones mediante comandos de teclado, deshacer equivocaciones recientes, ocultar la interfaz con un modo limpio y exportar o importar mis datos, para operar la aplicación con agilidad y total control sobre mi información.  

#### Criterios de Aceptación (Dominio, Adaptadores y HUD):

**CA-01: Parser y Ejecución de Comandos por Teclado (Command Palette - Ctrl+K)**
- Dado que el usuario invoca el Command Palette (Ctrl+K) e ingresa una cadena de comando rápido,  
- Cuando el parser del sistema evalúa y despacha la instrucción en el instante now,  
- Entonces interpreta y ejecuta sin usar el mouse los comandos de sintaxis rápida soportados:Hidratación: agua 0.5 o agua 1 (registra litros en el Acueducto).   Lectura: leer <N> (ej. leer 25, acredita páginas en la Gran Biblioteca).   Alta de tarea: t <nombre_barrio> <título> !<10|25|50> (ej. t gym comprar suplemento !25, crea la tarea con el peso correspondiente en el barrio indicado).   Inicio de foco: pomo <nombre_barrio> <minutos> (ej. pomo estudio 50, inicia sesión Pomodoro asignada a ese barrio).   


**CA-02: Ejecución de Reversibilidad Manual (Undo) con Evento Compensatorio**
- Dado que el usuario acaba de realizar una acción que mutó el estado y existe una entrada vigente en la cola de reversibilidad (now <= expiresAt, dentro de los 5 minutos posteriores a la acción),  
- Cuando el usuario acciona el botón [↩️ Deshacer] en el Toast de Reversibilidad,  
- Entonces el motor revierte exactamente el GameState al estado previo (previousState) restaurando monedas, progreso de casas, estructuras o suministros modificados por error, y emite al registro de eventos (domain_events / Outbox) un evento compensatorio de tipo ACTION_UNDONE con sus metadatos de sincronización (userId, deviceId, syncedAt: null).   


**CA-03: Alternancia de Modo Zen en el HUD**
- Dado que el usuario se encuentra en la pantalla principal con los paneles del HUD visibles,  
- Cuando activa el Modo Zen desde la barra inferior (o atajo de teclado),  
- Entonces se ocultan todos los paneles flotantes, cajones e inspectores del HUD, dejando visible únicamente el lienzo/fondo de la ciudad y el indicador compacto del reloj Pomodoro si hay una sesión activa.   


**CA-04: Exportación e Importación de Respaldo .todotown Validado con Zod (Producción) y Cheats (DEV_ONLY)**
- Dado que el sistema provee portabilidad de datos hacia futuras etapas (Tauri v2),  
- Cuando el usuario exporta o importa un archivo .todotown desde la barra inferior en cualquier entorno (Producción o Desarrollo),  
- Entonces al exportar descarga un archivo empaquetando el GameState y el historial domain_events; y al importar valida estrictamente la estructura e invariantes del esquema mediante Zod antes de reemplazar los almacenes game_state y domain_events en IndexedDB (rechazando archivos corruptos o inválidos sin dañar el estado actual). Adicionalmente, las herramientas manuales de inyección/edición libre de JSON y cheats solo se montan y habilitan si import.meta.env.DEV === true.  


#### Pruebas de Usuario (Validación E2E en el HUD - Fase 4 Slice UI):

**Prueba 1: Flujo completo sin mouse con Ctrl+K**
- Acción: Presionar Ctrl+K, escribir t gym comprar suplemento !25 y presionar Enter. Volver a presionar Ctrl+K, escribir agua 1 y presionar Enter.  
- Resultado esperado: Se registra +1.0 L en la Barra Superior y aparece la tarea "comprar suplemento" con peso STANDARD (+25%) en el barrio "GYM" sin haber tocado el mouse.   


**Prueba 2: Deshacer acción recién completada desde el Undo Toast**
- Acción: Completar una tarea COMPLEX (+100 🪙 y +50% de casa) y, al aparecer el Undo Toast en la esquina inferior izquierda, hacer clic en [↩️ Deshacer].  
- Resultado esperado: El Toast desaparece, el barrio descuenta las 100 🪙 y el 50% de barra (o demuele la casa si esa tarea había completado el 100%), y la tarea vuelve a figurar como pendiente en "En Obra (Hoy)".  


**Prueba 3: Respaldo .todotown y restauración limpia**
- Acción: Hacer clic en [💾 Exportar Backup .todotown] en la barra inferior, borrar los datos del navegador (o modificar la ciudad) y luego importar el archivo .todotown descargado. Intentar importar un archivo .json/.todotown adulterado con tipos inválidos.  
- Resultado esperado: Con el archivo válido, la ciudad restaura exactamente sus barrios, monedas, rachas y edificios globales. Con el archivo adulterado, el validador Zod bloquea la importación mostrando un mensaje de error claro y conserva intacta la ciudad actual.     



### US-13 (sistema): Gestión y Expiración de la Ventana de Reversibilidad: `[DONE]`
> **Alcance cerrado:** dominio (2026-11-17), con 384 tests en el proyecto. Los 3 CAs están en verde como reglas puras de `src/core/rules`: `createUndoSnapshot` registra `actionId`, `description`, `createdAt`, `expiresAt = now + 300_000` y una copia **aislada** del estado previo (`structuredClone`, no la referencia viva); `undoAction(snapshot, now)` devuelve `{ status: 'UNDONE', state }` o `{ status: 'REJECTED', reason: 'UNDO_WINDOW_EXPIRED' }`, y `pruneExpiredSnapshots(queue, now)` descarta las vencidas devolviendo una cola nueva. El borde es inclusivo y está clavado por tests en las dos reglas: `now === expiresAt` todavía revierte, `now === expiresAt + 1` no. El rechazo no expone `state`, así que el store **no puede** emitir un `ACTION_UNDONE` con una reversión vencida: la garantía es de tipos, no de disciplina. **Fase 4 diferida a la tanda de UI posterior:** la cola todavía no vive en `useGameStore` ni hay UndoToast. El evento `ACTION_UNDONE` se emite vía `commit` (no vía `appendEvent`), decisión que desbloquea US-12 CA-02.

El sistema debe gestionar y depurar el historial de acciones reversibles pasados unos minutos de forma transparente, para que el usuario pueda corregir clics accidentales al instante sin comprometer el rendimiento de la aplicación.  


#### Criterios de Aceptación:

**CA-01: Generación Automática de Instantánea (UndoSnapshot) con TTL de 5 Minutos**
- Dado que se ejecuta una acción de usuario que muta el GameState (completar tarea, cumplir hábito, comprar mejora/decoración, nivelar cuadra o registrar agua/lectura/Pomodoro) en el instante now,  
- Cuando la capa de estado/motor aplica la transición,  
- Entonces registra una nueva entrada UndoSnapshot que almacena un actionId único, la descripción legible de la acción (description), createdAt: now, el tiempo exacto de expiración a los 5 minutos (expiresAt: now + 300_000) y una copia inmutable del estado inmediatamente anterior (previousState).  


**CA-02: Rechazo Determinista de Reversión Fuera de la Ventana de 5 Minutos**
- Dado que existe un UndoSnapshot registrado con su marca expiresAt,  
- Cuando se intenta ejecutar la acción de deshacer (undoAction) en un instante now que supera el tiempo límite (now > expiresAt),  
- Entonces el sistema rechaza la operación de reversión manteniendo intacto el GameState actual y sin emitir ningún evento ACTION_UNDONE al registro de eventos.   


**CA-03: Depuración Automática (Garbage Collection) de Instantáneas Vencidas**
- Dado que la cola de instantáneas en useGameStore contiene uno o más registros UndoSnapshot,  
- Cuando el reloj del sistema avanza en cada tick (useGameLoop) o se despacha una nueva acción en el instante now,  
- Entonces el sistema filtra y elimina automáticamente de la memoria todas las instantáneas cuyo expiresAt < now, ocultando de forma sincronizada el UndoToast en el HUD cuando la última acción disponible acaba de expirar y liberando las referencias a previousState para evitar fugas de memoria.  



---

## Deuda Registrada (no son User Stories nuevas)

### DEV-01: Herramienta DEV de siembra de saldos y edición de estado

**Dependencia:** pertenece a **US-12 CA-04** (*"las herramientas manuales de inyección/edición libre de JSON y cheats solo se montan y habilitan si `import.meta.env.DEV === true`"*). No crear una US paralela ni duplicar el criterio.

**Motivo:** US-02 Prueba 3 exige un barrio Nivel 1 con 1000 🪙 y XP de Ayuntamiento en cero. El loop real (`tarea → monedas`) siembra +10 XP por casa en el camino, así que los números literales del criterio (50 → 80 XP) no se pueden reproducir sin sembrar saldo directamente.

**Segundo consumidor (US-06 Prueba 3):** validar el retiro al Museo exige un hábito en **Nivel 5**, y el único camino honesto hoy es cumplirlo 100 días o editar IndexedDB a mano. La misma herramienta DEV resuelve ambos casos; por eso la Prueba 3 de US-06 queda **diferida a esta deuda** y no se marca como validada.

**Alcance mínimo cuando se tome:** función pura en `src/adapters/dev-tools/` que devuelva un `GameState` con la tesorería inyectada, acción espejo en `useGameStore` y botón visible sólo bajo `import.meta.env.DEV`. **Entra con test**: produce estado, no es un detalle de presentación.

**Estado:** diferido por decisión explícita del usuario. No se inventa antes.

### UI-01: Formalizar el sistema de diseño "Odyssey OS"

**Motivo:** las directrices estéticas viven hoy sólo en la conversación. Sin documento vinculante, la próxima sesión —o el próximo agente— vuelve a `rounded-lg` e `indigo-600` por inercia.

**Pendiente:** crear `UI_DESIGN.md` con geometría (radio cero, retícula ortogonal, cajas modulares), paleta (neutrales + `red-600` como único acento), tipografía (mono para datos y badges, black para títulos) y patrones de interacción (sin sombras difusas; sólo cambio de color de borde en hover, transiciones secas). Registrarlo en la tabla de precedencia de `GOVERNANCE.md` §1 y en el mapa de documentos de `AGENTS.md` §1.

**Estado: CERRADA.** `UI_DESIGN.md` existe (**v2.2**), registrado como séptimo documento normativo en `GOVERNANCE.md` §1 y `DEC-015`, y en el mapa de `AGENTS.md` §1. Incluye §0.2 con las divergencias resueltas contra `DOMAIN_DESIGN.md` §7 (radio cero vs. "píldoras", ventanas adosadas vs. "paneles flotantes", `Ctrl+B`/`[` vs. `Tab`), §2 con la **metáfora de ventana zonificada** (lienzo negro, tres zonas perla `#ececec`, cinta negra por zona, opciones seleccionadas invertidas, divisores *inset* que no cortan el bloque), §6 con el presupuesto del acento (cinco puestos) y §7 con las nueve auditorías de `grep` que se corren antes de cerrar cualquier cambio en `src/ui/`.

### UX-01: Las tareas viven sólo en la Pizarra Diaria (decisión, no bug)

`ROADMAP.md` §3 define el Inspector Contextual como *"Tesorería, Plaza de Infraestructura (4 lotes + Museo), cuadras, mejoras de infraestructura (Niveles 1-4) y mudanzas"*: las tareas no están en esa lista. Las Pruebas 1 y 2 de US-04 ubican la tarea **únicamente** en el Drawer.

**Consecuencia:** con el Drawer cerrado no hay indicador de tareas pendientes. Si se quiere un contador por barrio en el Inspector, entra como **mejora explícita con su propio criterio**, nunca como corrección silenciosa de un "bug".

### UX-02: Eficiencia y tasa de monedas visibles en el HUD

**Motivo:** US-07 cerró a nivel dominio y el motor ya deriva la eficiencia (`getHabitEfficiency`, `getHabitEfficiencyRatio`) y sabe cuánto rinde (`HABIT_COINS_PER_HOUR × ratio`), pero **nada lo muestra**. US-06 difirió esa presentación a US-07 CA-01 (ver la corrección de su Prueba 1) y US-07 no declara Pruebas de Usuario propias, así que la deuda quedó sin dueña documental.

**Pendiente:** decidir **dónde** vive el indicador (Inspector del barrio vs. Pizarra Diaria), **qué** se muestra exactamente (`%` de eficiencia y `🪙/h` resultante) y **cuándo** se recalcula. La eficiencia es **derivada**: se lee en el instante de render desde `getHabitEfficiency(habit, neighborhood.infrastructureLevel, now)`, nunca se persiste (DEC-005) y nunca se reimplementa en `src/ui`. La curva y sus cortes son de `src/core/rules/habitEfficiency.ts`; la presentación no los duplica.

**Fuera de alcance:** el encendido de ventanas del edificio isométrico expresa la **misma** eficiencia en el lienzo (`DOMAIN_DESIGN.md` §6). Si se quiere, es un criterio visual aparte; no entra por arrastre en esta deuda.

**Estado:** registrada. Espera su propio carril visual; **no** se implementa como corrección silenciosa de un "bug" de US-06.

### DOC-01: `ECONOMY.md` no declara el cooldown de cambio de frecuencia

**Motivo:** el cooldown de 7 días entre cambios de frecuencia de un hábito existe **sólo** en `BACKLOG.md` (US-06 CA-03). `GOVERNANCE.md` §1.2 asigna los umbrales de modelo a `ECONOMY.md`, así que hoy la constante (`economyConstants.ts`) tiene menos respaldo documental que las demás.

**Alcance mínimo:** agregar una fila/sección en `ECONOMY.md` §2.1 con el cooldown y, si corresponde, la fórmula de la ventana `T` que hoy vive en `DOMAIN_DESIGN.md` §4. No es un cambio de código: el valor ya está en su lugar.

**Estado: CERRADA (2026-11-15).** `ECONOMY.md` §2.1.1 declara la fórmula `T = (7/X)·24 + 12h + InerciaUrbana` (copiada de US-07 CA-01), remite el bono de Inercia Urbana a §4.1 en lugar de duplicarlo y fija el cooldown de frecuencia en 7 × 24 h exactas. Queda **una** precisión abierta, anotada ahí mismo: US-07 CA-01 no cuantifica el "margen de gracia" del switch `DAILY`. Esa definición es de US-07, no de este documento.

### VAL-01: Validación de entrada del hábito sin dueño explícito

**Motivo:** dos User Stories tomaron la misma decisión por separado. US-02 CA-01 dejó el `title` vacío fuera del motor ("precondición del usuario, no regla del motor") y US-06 CA-01 dejó afuera el `count` entre 1 y 6 de `TIMES_PER_WEEK`. Ninguna de las dos quedó registrada como deuda, así que un tercer formulario puede decidir distinto.

**Pendiente:** decidir una sola vez si la validación vive en el borde (formulario) o en `core` como guarda, y aplicarla retroactivamente a `createNeighborhood` y `createHabit`. **No se decide antes de que exista el formulario del Inspector** (US-06 Fase 4): sin el borde a la vista, la decisión se toma a ciegas.

**Estado: CERRADA (2026-11-15) como `GOVERNANCE.md` DEC-017.** La validación de texto vive en el borde; `core` sólo valida reglas de negocio. No se toca `createNeighborhood` ni `createHabit`: la guarda ya existe en `HabitPlaza` (recorte, corte de vacío y envío deshabilitado) y el dominio queda protegido de lógica de presentación. Ningún test de dominio cambia. 

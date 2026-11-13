
### 1. US-00 (sistema): Día Cero y Ciclo de Vida del Barrio Tutorial:
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



### US-01 (sistema): Persistencia Local y Registro de Eventos
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



### US-02 (usuario): Creación y Urbanización de Barrios
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



### US-03 (sistema): Expansión Automática de Cuadras
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



### US-04 (usuario): Gestión de Tareas y Construcción Residencial
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



### US-05 (sistema): Reciclaje Nocturno de Tareas y Regulación de Fatiga
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



### US-06 (usuario): Gestión, Mudanza y Retiro de Hábitos:
Como usuario, quiero registrar hábitos en un barrio, marcar su cumplimiento, cambiar su frecuencia, mudarlos de distrito o retirarlos al museo cuando alcancen su nivel máximo, para consolidar mis rutinas y liberar espacio manteniendo su reconocimiento histórico.   


#### Criterios de Aceptación (Dominio y Reglas):

**CA-01: Creación de Hábito y Límite de 4 Lotes Productivos por Barrio**

- Dado que un barrio posee menos de 4 hábitos activos o pausados en su Plaza de Infraestructura (status !== 'RETIRED_TO_MUSEUM'),  
- Cuando el usuario crea un nuevo hábito indicando un título válido y una frecuencia (DAILY o TIMES_PER_WEEK con count entre 1 y 6),  
- Entonces el sistema registra un nuevo HabitBuilding vinculado al neighborhoodId con status: 'ACTIVE', currentStreakDays: 0, checkpointLevel: 1, lastCompletedAt: null (eficiencia derivada 0.0: apagado hasta su primer check-in); y si el barrio ya tiene ocupados sus 4 lotes productivos, rechaza la creación hasta que uno se mude o se retire al Museo.  


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


#### Pruebas de Usuario (Validación E2E en el HUD - Fase 4 Slice UI):

**Prueba 1: Alta de hábitos, tope de 4 lotes y primer encendido**

- Acción: En el Inspector del barrio "GYM", crear un hábito "Entrenar Fuerza" (3 veces por semana) y luego marcar su check-in desde la Pizarra Diaria (En Obra (Hoy)). Intentar crear un 5to hábito en el mismo barrio tras haber llenado los 4 lotes.  

- Resultado esperado: Al crearse, "Entrenar Fuerza" figura apagado (0%); al tildarlo hoy, se enciende al 100% (5 🪙/h) con racha 1. Al intentar agregar un 5to hábito en "GYM", la UI bloquea el alta indicando que los 4 lotes de la Plaza de Infraestructura están ocupados.  


**Prueba 2: Mudanza de distrito con confirmación**

- Acción: En el Inspector de "GYM" (con 200 🪙 acumulados), seleccionar el hábito "Leer documentación", elegir [Mudar de Barrio -> Estudio] y aceptar el diálogo de confirmación.  

- Resultado esperado: El hábito desaparece de la Plaza de "GYM" (dejando 1 lote libre y manteniendo sus 200 🪙 intactos en "GYM") y aparece en la Plaza de "Estudio" con la misma racha, nivel y eficiencia que tenía.  


**Prueba 3: Retiro al Museo en Nivel 5**

- Acción: Sobre un hábito en Nivel 5 (100 días), hacer clic en [🏛️ Retirar con Honores al Museo].  
- Resultado esperado: El Ayuntamiento suma +300 XP en la Barra Superior, la Plaza de Infraestructura del barrio libera el lote (3/4 ocupados) y la pestaña del Museo de Hábitos del barrio muestra la placa conmemorativa con el nombre del hábito y su fecha de retiro.   



### US-07 (sistema): Producción Pasiva y Decaimiento con Piso Seguro: 
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
- Entonces calcula para cada hábito activo las monedas generadas en cada tramo horario según su eficiencia (E) y el multiplicador del barrio (M_barrio = 0.5 si reactivationPenaltyUntil > now, o 1.0 en caso normal) a razón de 5.00 monedas/hora al 100% (120/día), 3.33 monedas/hora al 66% (80/día), 1.66 monedas/hora al 33% (40/día) y 0 monedas/hora al 0%, acreditando el total en treasuryCoins de su barrio y actualizando lastTickAt = now.   


**CA-04: Protección de Piso Seguro (Retroceso al Checkpoint en Caso de Apagón)**
- Dado que un hábito activo supera su ventana máxima de enfriamiento sin renovarse (t >= T) y cae en Apagón (eficiencia derivada 0.0),  
- Cuando el motor procesa la caída a 0% de eficiencia,  
- Entonces el hábito detiene su producción de monedas pero no pierde su edificio ni vuelve a cero absoluto: conserva intacto su checkpointLevel alcanzado (1, 2, 3, 4 o 5) y retrocede su currentStreakDays únicamente hasta el piso de días de ese último Checkpoint seguro (0/1 en Nv.1, 7 en Nv.2, 21 en Nv.3, 50 en Nv.4, o 100 en Nv.5).   



### US-08 (usuario): Registro de Hidratación, Lectura y Sesiones de Foco
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



### US-09 (sistema): Bonos Hídricos, Topes Diarios y Liquidación de Foco
Como sistema, necesito otorgar bonos de energía diaria cuando el usuario registra agua, aplicar topes diarios saludables y liquidar recompensas proporcionales cuando una sesión de foco termina o se interrumpe, para que el usuario vea reflejado su cuidado personal en el rendimiento de la ciudad sin perder el crédito por sesiones parciales.  


#### Criterios de Aceptación:

**CA-01: Tope Efectivo Diario (Hard Cap) en Hidratación (3.0 L) y Lectura (150 págs)**
- Dado que los suministros globales autodeclarados poseen topes anti-exploit por día operativo,  
- Cuando el usuario registra litros de agua o páginas leídas que harían superar el acumulado del día operativo actual por encima de 3.0 L de agua o 150 páginas,  
- Entonces el motor recorta el incremento acreditable de modo que el aporte sumado a totalHistoricalLiters del Acueducto nunca supere 3.0 L en un mismo día operativo, y el aporte sumado a totalPagesRead de la Gran Biblioteca nunca supere 150 páginas en un mismo día operativo (reiniciando ambos cupos al cambiar de día operativo).  


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



### US-10 (usuario): Pausa Manual Consciente:
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



### US-11 (sistema): Hibernación por Inactividad y Arranque de Motores: 
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



### US-12 (usuario): Comandos Rápidos, Reversibilidad Manual y Respaldos: 
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



### US-13 (sistema): Gestión y Expiración de la Ventana de Reversibilidad: 
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

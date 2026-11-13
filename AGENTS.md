# AGENTS.md - Reglas de Pair Programming, TDD y Vertical Slices

Sos mi par de programación (**Navigator / Driver**) en el desarrollo de **To-Do Town**. Tu objetivo NO es generar grandes volúmenes de código de forma autónoma, sino iterar conmigo paso a paso manteniendo el control mental y arquitectónico del sistema. Debes ser conciso con los Tests, si yo veo codigo que necesita ser refactorizado, debe poder pasar los mismos Test sin que estos se cambien. ES MUY IMPORTANTE QUE **NO DEBE** MODIFICARSE LOS TEST PARA TERMINAR CON UN GREEN.

---

## 1. Mapa de Documentación (Pull Reference, NO Push)

* `GOVERNANCE.md`: **Ley suprema del repo.** Protocolo de Alineación y Gobernanza Técnica. Ante cualquier conflicto entre documentos, rige su tabla de precedencia. Este archivo (`AGENTS.md`) está subordinado a él.
* `BACKLOG.md`: **Fuente de trabajo activa.** Solo trabajamos en la User Story marcada como `[IN PROGRESS]`, y debe haber **exactamente una** en ese estado. Una US cuyos CAs dependen de otra historia se marca `[BLOCKED: <desbloqueante>]` y permanece visible en el BACKLOG; vuelve a `[IN PROGRESS]` cuando el desbloqueante cierra. Nunca se la deja en `[IN PROGRESS]` mientras está esperando.
* `ROADMAP.md`: Estrategia macro de Épicas y Quality Gates.
* `DOMAIN_DESIGN.md`, `ECONOMY.md`, `ARCHITECTURE.md`: **Oráculos pasivos de consulta.**
  * **REGLA YAGNI ESTRICTA:** Tenés prohibido leer esos documentos para crear interfaces, tipos, constantes o funciones de historias futuras. Solo extraemos las definiciones exactas que pide el Criterio de Aceptación actual.

---

## 2. Protocolo Inquebrantable de Trabajo (Ping-Pong TDD)

Abordamos **UN SOLO Criterio de Aceptación (CA)** a la vez. Nunca avances al siguiente CA sin mi confirmación explícita. Dentro de cada CA, respetá estrictamente estas 4 fases y **frená al terminar cada una**:

### Fase 1: RED (Primero el Test)
1. Identificá el CA actual en `BACKLOG.md`.
2. Escribí o modificá **únicamente el test unitario** en `Vitest`, **co-locado en la capa que implementa el CA**: `<capa>/__tests__/<archivo>.test.ts` (`src/core`, `src/adapters` o `src/state`). Ver `GOVERNANCE.md` §2.3.
3. Ejecutá `npm run test` para verificar que el test **falle por el motivo esperado** (o falle por compilación si el tipo/función aún no existe).
4. **STOP:** Mostrame el test en rojo y esperá mi validación (o dejame escribir la implementación si te lo pido). Prohibido escribir el código de producción en el mismo turno en que creaste el test.

### Fase 2: GREEN (Implementación Mínima)
1. Una vez aprobado el test en rojo, escribí el **código mínimo, más simple y directo posible** en `src/core` para que el test pase a verde.
2. Prohibido agregar validaciones extra, optimizaciones prematuras o casos borde que no estén pedidos por un test activo.
3. Ejecutá `npm run test` y `npm run typecheck`.
4. **STOP:** Confirmame que está en verde y esperá.

### Fase 3: REFACTOR (Limpieza Conjunta)
1. Con los tests en verde, analizá si hay duplicación, nombres poco claros o acoplamiento.
2. Proponeme mejoras breves o aplicá el refactor acordado, verificando que `npm run test` siga en verde.

### Fase 4: CIERRE DE VERTICAL SLICE (State + Adapter + UI)
1. Recién cuando los Criterios de Aceptación de dominio de la User Story estén en verde, conectamos la funcionalidad al store (`src/state`), persistencia (`src/adapters`) y al componente mínimo en `src/ui/hud`.
2. Verificamos que la historia funcione de punta a punta y marcamos el check `[x]` en `BACKLOG.md`.

---

## 3. Reglas Arquitectónicas Duras (Invariantes)

* **Pureza en `src/core`:** Cero imports de React, Zustand, IndexedDB, DOM o librerías externas dentro de `src/core`. Todo el motor es TypeScript puro y determinista (recibe `now: TimestampMs` por parámetro, jamás usa `Date.now()` adentro de una regla).
* **Tipos Evolutivos:** Las interfaces en `src/core/types` crecen propiedad por propiedad a medida que las User Stories las necesitan. No declares campos que hoy no se usan.
* **Límite de Archivos por Turno:** En las fases RED y GREEN no modifiques más de **1 o 2 archivos** por respuesta. Si creés que necesitás tocar más de 3 archivos, frená y consultame antes.

---

## 4. Comandos de Validación

```bash
npm run test          # Ejecutar Vitest (obligatorio en cada paso RED / GREEN / REFACTOR)
npm run typecheck     # Ejecutar tsc --noEmit
npm run dev           # Levantar servidor de desarrollo Vite
```

---

## 5. Estilo de Respuesta
* Sé conciso, técnico y directo.
* Al final de cada intervención, indicá claramente en qué estado del ciclo estamos: `[ESTADO: RED - Esperando OK para implementar]`, `[ESTADO: GREEN - Listo para Refactor o siguiente CA]` o `[ESTADO: SLICE UI]`.

## 6. Tablero Collattice (coordinación humano-agente)

El tablero vive fuera del repo y se opera por MCP. La conexión ya está registrada en `opencode.jsonc` (servidor `collattice` → `http://localhost:8080/mcp`, `oauth: false`).

* **Credencial:** la agent key está en `.collattice.local` (ignorada por git). Se pasa como argumento `authKey` en **cada** tool call — nunca en un header de conexión ni en la config del MCP.
* **Flujo:** antes de crear tarjetas, consultá `get_boards`, `get_lanes` y `get_cards` para no duplicar trabajo. Referenciá tarjetas por `#número` + board.
* **Sincronización:** `BACKLOG.md` sigue siendo la única fuente de verdad de los CAs y del código. El tablero refleja el estado de trabajo (mover la tarjeta a `In Progress` al arrancar una US, a `Done` al cerrarla), no lo reemplaza.
* **Fallback:** si el MCP no responde, usá la API REST: base `http://localhost:8080/api/v1`, header `X-User-Key: <agent key>`. Ver `README.md` § Collattice.

# To-Do Town

**Idle-city builder que gamifica tus hábitos y tareas reales.**

To-Do Town es un gestor de hábitos y pendientes disfrazado de *idle game*: cada hábito que sostenés produce monedas para tu barrio, cada tarea que terminás construye casas, y la ciudad se apaga visualmente cuando dejás de cumplir. Pensado para quedar abierto en el escritorio acompañando tu jornada, no para castigarte.

> **Filosofía del producto:** el progreso solo nace del progreso. No hay castigos destructivos ni demoliciones: fallar detiene la producción, nunca borra lo construido. Y la economía está anclada al tiempo — 1 hora de hábito activo vale siempre lo mismo, el día 1 y el día 500.

## Estado del proyecto

| | |
| :--- | :--- |
| **Fase** | Etapa 1 — Web Core & Sandbox (SPA) |
| **Hito activo** | 1.1 — Ciclo de productividad completo (US-00 a US-13) |
| **Gate 1.1** | Código cerrado: `typecheck` limpio, `src/core` sin imports externos, **436 tests en 53 archivos** en verde. Resta el dogfooding de 7 días operando la app real. |
| **Siguiente** | Hito 1.2 — motor isométrico 2:1 (`src/ui/city-canvas`) |

## Qué funciona hoy

- **Día Cero y Barrio Tutorial** que se autodestruye al crear el primer barrio real.
- **Barrios y urbanización:** tesorería local, mejora de infraestructura (Niveles 1-4), progreso de urbanización y **expansión automática de cuadras** 2×3 por adyacencia.
- **Tareas** separadas entre *En Obra* (hoy) y *Plano Maestro* (backlog), con reciclaje nocturno y **fatiga laboral de doble capa** (5 por barrio / 8 globales).
- **Hábitos** con curva continua de enfriamiento, eficiencia por tramos (100% / 66% / 33% / 0%), progresión por Días de Suministro Activo, checkpoints (1, 7, 21, 50, 100), mudanza entre barrios y retiro al Museo.
- **Producción pasiva y decaimiento** con piso seguro y cálculo determinista por `now`.
- **Hidratación, lectura y Pomodoro** con presets, curva de fatiga diaria y liquidación de foco.
- **Pausa manual consciente** (con motivo obligatorio), **auto-pausa por 72h** de inactividad y **Arranque de Motores** al reactivar.
- **Reversibilidad de 5 minutos** vía eventos compensatorios, **Command Palette** (`Ctrl+K`) y **Pizarra Diaria** (`Ctrl+B`).
- **Persistencia en IndexedDB** (`game_state` + outbox `domain_events`) y **backup `.todotown`** validado con Zod.

Todavía no existe el lienzo isométrico: el HUD actual opera con tarjetas esquemáticas de barrio. Eso es el Hito 1.2.

## Stack

React 18 · TypeScript (strict) · Vite · Zustand · Tailwind CSS 4 · Zod · Vitest

## Empezar

```bash
npm install
npm run dev        # http://localhost:5173
```

| Comando | Qué hace |
| :--- | :--- |
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run test` | Suite completa de Vitest |
| `npm run test:watch` | Vitest en modo watch |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Typecheck + build de producción |

## Arquitectura

Clean / Hexagonal simplificada, con el dominio completamente aislado:

```text
src/
├── core/          # Dominio: TypeScript puro, determinista, cero imports externos
│   ├── types/     # Interfaces del modelo y eventos
│   ├── entities/  # Hábitos, barrios, cuadras, tareas, Pomodoro, Día Cero
│   ├── rules/     # Fórmulas: decaimiento, fatiga, nivelación, tick, undo
│   ├── ports/     # Contratos: Storage, EventLog, UnitOfWork, Id
│   └── constants/ # Constantes económicas
├── adapters/      # Infraestructura: IndexedDB, backup .todotown, dev-tools
├── state/         # Aplicación: store Zustand, hidratación, game loop
└── ui/hud/        # Presentación: paneles, inspector, paleta de comandos
```

Dos invariantes duros:

1. **`src/core` no importa React, Zustand, DOM ni librerías externas.** Todo el motor es TypeScript puro.
2. **Determinismo por timestamp.** Ninguna regla llama a `Date.now()`: toda función recibe `(state, now: TimestampMs)` y calcula deltas exactos. El progreso *idle* nunca depende de los FPS.

## Metodología

El repo se construye con **vertical slices guiadas por User Stories** y **Ping-Pong TDD por Criterio de Aceptación**: primero el test en rojo, después la implementación mínima, y los tests nunca se tocan para forzar un verde.

- `GOVERNANCE.md` — Ley suprema del repo: protocolo de alineación y tabla de precedencia.
- `ROADMAP.md` — Hitos, etapas y Quality Gates.
- `BACKLOG.md` — User Stories y Criterios de Aceptación. Fuente única de verdad del trabajo activo.
- `ARCHITECTURE.md` — Estructura de capas y stack por etapas.
- `DOMAIN_DESIGN.md` — Modelo de dominio, geografía urbana y estética.
- `ECONOMY.md` — Constantes, fórmulas y topes anti-exploit.
- `UI_DESIGN.md` — Contrato visual del HUD ("Odyssey OS").
- `AGENTS.md` — Reglas de pair programming y TDD para agentes.

Si vas a contribuir o a hacer que un agente trabaje acá, leé `GOVERNANCE.md` y `AGENTS.md` primero.

## Roadmap

1. **Etapa 1 — Web Sandbox:** motor de dominio + HUD (completo) y luego lienzo isométrico procedural.
2. **Etapa 2 — Desktop:** contenedor Tauri v2 + SQLite local + notificaciones del SO.
3. **Etapa 3 — Ecosistema:** sincronización local-first y cliente móvil de captura rápida.

---

## Collattice (tablero compartido humano-agente)

Herramienta de coordinación del proyecto, no parte del juego. [Collattice](https://github.com/MrBildo/collattice) es el tablero kanban self-hosted que usamos para coordinar el trabajo: un único binario (.NET 10 + SQLite) pensado para que humanos y agentes operen el mismo board.

### 1. Levantar el servidor

```bash
curl -sSL https://raw.githubusercontent.com/MrBildo/collattice/main/install.sh | bash
~/.collattice/Collabot.Collattice.Api
```

El portal queda en `http://localhost:8080` (puerto por defecto, configurable con `Urls` o `Hosting:ListenPort`). La **admin auth key** se imprime en consola la primera vez y solo esa vez: guardala.

### 2. Conectar por MCP (recomendado)

Collattice trae un servidor MCP integrado. No hace falta escribir un cliente HTTP propio:

| | |
| --- | --- |
| URL | `http://localhost:8080/mcp` |
| Transporte | Streamable HTTP |
| Server name | `collattice` |
| Auth | Argumento `authKey` por llamada (la conexión `/mcp` no lleva auth) |

**OpenCode** (`opencode.json` / `opencode.jsonc`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "servers": {
      "collattice": {
        "type": "remote",
        "url": "http://localhost:8080/mcp",
        "oauth": false
      }
    }
  }
}
```

`oauth: false` es intencional: el servidor no usa OAuth, la identidad viaja en cada tool call. También podés registrarlo por CLI:

```bash
opencode mcp add collattice --url http://localhost:8080/mcp
```

**Claude Code** (`.mcp.json` o config equivalente):

```json
{
  "mcpServers": {
    "collattice": {
      "type": "http",
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

### 3. Crear la agent key

1. Iniciar sesión como administrator en el portal.
2. Panel **Admin** → crear usuario con rol **Agent** (valor `2`).
3. La respuesta incluye el `authKey` (ULID) del usuario.

Esa key **no va en la configuración del MCP**: se pasa como argumento `authKey` en cada invocación de herramienta. Si se pierde, se desactiva el usuario y se emite uno nuevo.

Para que el agente la use sin exponerla en git, guardala en `.collattice.local` (cubierto por `*.local` en `.gitignore`):

```bash
curl -s -X POST http://localhost:8080/api/v1/users \
  -H "X-User-Key: <admin-auth-key>" \
  -H "Content-Type: application/json" \
  -d '{"name": "opencode", "role": 2}' \
| python3 -c "import sys,json;print(json.load(sys.stdin)['authKey'])" > .collattice.local
```

### 4. Herramientas expuestas

- **Descubrir**: `get_api_info`, `get_boards`, `get_lanes`, `get_sizes`, `get_labels`, `get_cards`, `get_card`, `get_card_history`, `search_cards`
- **Trabajar tarjetas**: `create_card`, `duplicate_card`, `move_card`, `update_card`, `archive_card`, `restore_card`
- **Comentarios**: `add_comment`, `update_comment`, `delete_comment`
- **Adjuntos**: `upload_attachment`, `download_attachment`, `delete_attachment`
- **Labels**: `add_label_to_card`, `remove_label_from_card`
- **Bulk**: `bulk_update_cards`, `bulk_archive_cards`, `bulk_restore_cards`
- **Administración del board** (requiere key admin): `create_board`, `create_lane`, `reorder_lanes`, `create_size`, `create_label`, `prune`, y el resto del catálogo

Las tarjetas se referencian por número (`#42`, scopeado por board) o GUID; labels por nombre (`"Bug"`) o ID.

### 5. Alternativa: REST directo

Collattice **sí** expone una API REST convencional además del MCP, por si preferís curl o un cliente propio:

- Base: `http://localhost:8080/api/v1`
- Auth: header `X-User-Key: <authKey>` (misma credencial que el argumento `authKey` del MCP, distinto canal)

```bash
# Crear un usuario
curl -X POST http://localhost:8080/api/v1/users \
  -H "X-User-Key: <admin-auth-key>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "role": 1}'
```

Referencia completa de endpoints y códigos de error: [docs/api-reference.md](https://github.com/MrBildo/collattice/blob/main/docs/api-reference.md).

### 6. Skill listo para agentes

Collattice publica un skill drop-in con la referencia operativa completa (conexión, herramientas, modelo de datos, reglas de identificadores y Markdown soportado): [`docs/collattice/SKILL.md`](https://github.com/MrBildo/collattice/blob/main/docs/collattice/SKILL.md). Conviene cargarlo en el harness en lugar de reescribir las instrucciones a mano.

### Roles de usuario

| Rol | Valor | Permisos |
| --- | --- | --- |
| Administrator | `0` | Acceso total: boards, lanes, usuarios, labels, todas las tarjetas |
| HumanUser | `1` | CRUD sobre sus propias tarjetas, comentarios y adjuntos |
| AgentUser | `2` | Igual que Human, pero no puede borrar tarjetas |
| AgentAdministrator | `3` | Rol agent + administración del board (lanes, sizes, labels, prune, bulk) |

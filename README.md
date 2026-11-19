
# To-Do Town

Idle game de gestión de hábitos. Motor de dominio puro en `src/core`, estado en `src/state`, persistencia en `src/adapters` y UI en `src/ui/hud`.

## Stack

React 18 · TypeScript · Vite · Zustand · Vitest

## Comandos

```bash
npm install           # Dependencias
npm run dev           # Servidor de desarrollo
npm run test          # Vitest
npm run typecheck     # tsc --noEmit
```

## Collattice (tablero compartido humano-agente)

[Collattice](https://github.com/MrBildo/collattice) es el tablero kanban self-hosted que usamos para coordinar el trabajo de To-Do Town: un único binario (.NET 10 + SQLite) pensado para que humanos y agentes operen el mismo board.

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




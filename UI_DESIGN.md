# UI_DESIGN.md — Sistema de Diseño "Odyssey OS"

**To-Do Town · v2.3 · APROBADA — MIGRACIÓN EN CURSO**

> Contrato ejecutable de la interfaz DOM. Toda clase de Tailwind que se escriba en `src/ui/` o `src/App.tsx` sale de este documento o no existe. La vigencia sobre el código heredado está acotada por la regla de trinquete de §0.3.

---

## 0. Dominio de Autoridad

`UI_DESIGN.md` legisla **cómo se ve y cómo se comporta el HUD construido en DOM**: geometría, paleta, tipografía, interacción, accesibilidad y tokens de clase.

**No legisla:**

| Materia | Autoridad |
| :--- | :--- |
| Inventario de zonas del HUD (qué paneles existen) | `DOMAIN_DESIGN.md` §7 y `ROADMAP.md` §3 |
| Combinación concreta de atajos y comportamiento de cada control | `BACKLOG.md` (Criterios de Aceptación ejecutables), dentro de las restricciones de §4.4 |
| Arte isométrico del lienzo de la ciudad | `DOMAIN_DESIGN.md` §6 |
| Valores, costos y fórmulas mostrados | `ECONOMY.md` |

### 0.1. Frontera HUD ↔ Lienzo

Son **dos superficies estéticas distintas y deliberadas**:

- **Lienzo isométrico** (`src/ui/canvas/`, Hito 1.2): pixel-art cálida, paleta 80/20, tres tonos planos por superficie (`DOMAIN_DESIGN.md` §6). No se toca.
- **HUD / chrome DOM** (`src/ui/hud/`): Odyssey OS, frío, neutro, cero radio. Este documento.

La convivencia es intencional: el HUD debe leerse como el sistema operativo que *contiene* la ciudad, no como parte de ella. La metáfora de tiling WM (Hyprland/i3) es **identidad visual**: no promete el comportamiento de un tiling WM. La ergonomía del HUD la define §4 y §9.

### 0.2. Divergencias registradas con `DOMAIN_DESIGN.md` §7

`DOMAIN_DESIGN.md` §7 describe el HUD en prosa de 2024: *"píldora compacta"*, *"paneles flotantes"*, *"botón flotante"*, atajo `Tab`. Odyssey OS las resuelve así:

- **"Píldora" → bloque rectangular.** Radio cero (§1). No hay excepciones.
- **"Paneles flotantes" → ventanas adosadas.** Sin sombras difusas (§4.1). Lo transitorio se resuelve con overlays (§7), no con paneles flotantes.
- **"Botón flotante" → se conserva como lanzador anclado.** Es el único control que vive sobre el lienzo: geometría rectangular, capa `z-20` (§7).
- **`Tab` → atajo definido en `BACKLOG.md` US-04.** `Tab` es la tecla de navegación por foco del navegador; secuestrarla rompe accesibilidad. El atajo que lo reemplace debe cumplir §4.4, salvo la excepción registrada del Drawer.

### 0.3. Vigencia, migración y trinquete

**Este documento fue aprobado por `GOVERNANCE.md` DEC-022.** `GOVERNANCE.md` sigue siendo el rector: cuando un `DEC` y estas páginas discrepen, gana el `DEC`, y este documento registra la excepción en lugar de revocarla.

**Estado real a la aprobación.** La v2.3 introduce tres piezas que el HUD todavía **no** implementa: la capa de tokens de §2.4, los contextos de superficie (`data-surface`) de §2.2 y `<Zone>` de §5. El código actual sí cumple la geometría (§1, §2.1, §2.3), el techo del 65% y la sidebar de `17rem` (§5.1) y la tipografía mono.

**Regla de trinquete.** Hasta que cierre `BACKLOG.md` `MIG-02`, la auditoría de §11 se aplica **por archivo**, no por árbol:

1. Un cambio **no puede aumentar** los hallazgos de los archivos que toca.
2. Un archivo que se migre debe quedar **en cero**.
3. La auditoría sobre `src/ui` completo es gate recién cuando cierre `MIG-02`.
4. "Migración pendiente" **nunca** justifica introducir un patrón nuevo que contradiga §1–§8. El trinquete baja; no sube.

---

## 1. Geometría — Cero Curvas

| Regla | Prohibido | Obligatorio |
| :--- | :--- | :--- |
| Radio de borde | `rounded`, `rounded-sm/md/lg/xl/full` | `rounded-none` en **todo** contenedor, botón, badge, input y tarjeta |
| Sombras | `shadow-sm/md/lg/xl`, `drop-shadow-*` | Nada. El relieve se logra con superficie y borde |
| Gradientes | `bg-gradient-*`, `from-*`, `to-*` | Fondos planos |
| Separación | Márgenes que dejan huecos sin estructura | Retícula ortogonal: divisores **inset** de 2px y bloques alineados |

**Cajas modulares:** cada zona se lee como la ventana de un tiling WM. Bordes rectos, esquinas vivas, jerarquía por **superficie** (perla contra negro) y por **chrome** (la cinta negra).

---

## 2. La Metáfora de Ventana — Zonificación

**Regla madre:** *lienzo negro, zonas perla, chrome negro.*

La pantalla se divide en **zonas funcionales grandes**, no en elementos sueltos. Cada zona es **un único bloque perla** sobre el lienzo negro:

```
lienzo: negro (contexto oscuro por defecto)
┌─────────────────────────────────────────────────────┐
│ ███ navbar (negra)                                  │
├─────────────────────────────────────────────────────┤
│ ┌───────────┐ ┌──────────────────────┐              │
│ │ ███ cinta │ │ ███ cinta            │  lienzo      │
│ │   perla   │ │   perla              │  isométrico  │
│ │  ─────    │ │  ─────  (divisores   │  (Hito 1.2)  │
│ │   perla   │ │  ─────   internos)   │  negro       │
│ └───────────┘ └──────────────────────┘              │
└─────────────────────────────────────────────────────┘
        ≤ 65% del ancho de main         resto: lienzo
```

Las tres zonas permanentes de hoy: **sidebar de distritos**, **inspector del distrito activo** y **Drawer de la pizarra**.

### 2.1. Las reglas de zonificación

1. **El perla aparece tres veces, no quince.** Una mancha por zona permanente. Si un bloque perla nuevo no es una zona, no se pinta: se resuelve con una línea. Lo transitorio (modal) es la única excepción y se rige por §7.
2. **La cinta negra va arriba de la zona, una sola vez.** Es el chrome de la ventana. Las secciones internas (`INFRAESTRUCTURA`, `DECORACIONES`, `CUADRAS`) **no** llevan cinta propia: una segunda barra negra trocea el bloque y produce el efecto a rayas.
3. **Lo seleccionado se invierte al contexto contrario.** El distrito activo y la pestaña activa pasan a contexto oscuro dentro del bloque perla. La selección se lee por inversión **más marcador de texto** (§4.2), nunca por un tercer gris.
4. **Selección y acción no comparten forma.** Ver §4.2.

**Prohibido:** alternar bloques negros y perlas en cascada. **Prohibido:** una caja perla dentro de una caja perla. **Prohibido:** cualquier tercera superficie. Hay exactamente dos: **perla** (las zonas) y **negro** (el lienzo y el chrome). Los *tonos de estado* de §2.2 no son superficies.

### 2.2. Contextos de superficie y roles

El sistema tiene **dos contextos**: `dark` (por defecto, el lienzo) y `light` (dentro de una zona perla). Los componentes **nunca nombran un color**: nombran un **rol**, y el contexto lo resuelve.

| Rol | Clase | En contexto `dark` | En contexto `light` |
| :--- | :--- | :--- | :--- |
| Fondo | `bg-surface` | negro | perla `#ececec` |
| Texto principal | `text-ink` | perla | negro |
| Texto secundario / etiqueta / metadato / placeholder | `text-ink-muted` | `#a3a3a3` | `#525252` |
| Línea suave (divisor, hairline, borde de cuadra) | `bg-line` / `border-line` | `#262626` | negro al 15% |
| Relleno de acento (CTA, marca) | `bg-accent` | `#b91c1c` | `#b91c1c` |
| Texto y borde de acento | `text-accent-ink` / `border-accent-ink` | `#f87171` | `#7f1d1d` |

**Cómo se usan los contextos:**

| Elemento | Contexto |
| :--- | :--- |
| Raíz, `main`, navbar, fondo tras las zonas | `dark` (herencia de `:root`) |
| Zona (sidebar, inspector, Drawer) | `<Zone>` → `data-surface="light"` |
| Cinta de título dentro de la zona | `data-surface="dark"` |
| Opción seleccionada dentro de la zona | `data-surface="dark"` |
| Overlay, popover, toast | ver §7 |

Las zonas **no llevan borde exterior**: el perla contra el negro ya es el borde. Un borde negro sobre lienzo negro sería invisible.

**Tonos de estado (lista cerrada).** No son superficies: son estados o líneas. Fuera de esta lista, cualquier `black/N` o `pearl/N` está prohibido.

| Tono | Uso |
| :--- | :--- |
| `bg-black/5` | Velo de hover en filas de lista |
| `black/15` | Sólo vía el rol `line` (divisores, borde de cuadra) |
| `bg-black/80` | Scrim detrás de un overlay (§7) |

Los componentes **no nombran** `neutral-*`, `red-*` ni ningún matiz: esos valores viven únicamente en la declaración de contextos (§2.4).

### 2.3. Grosor de Línea

| Elemento | Grosor |
| :--- | :--- |
| Divisor entre secciones de una zona | `h-0.5 bg-line` (**inset**) |
| Divisor entre filas de una lista | `after:h-px after:bg-line` (inset, `last:after:hidden`) |
| Borde de bloque interno (cuadra) | `border border-line` (1px) |
| Borde de input, select, badge, botón | `border` (1px) |
| Divisor dentro de la navbar negra | `border border-line` (1px) |
| Muestra de paleta | `border-2` (única excepción: su relleno es el dato y el borde es el único indicador de selección) |

**El divisor nunca llega al borde del bloque.** Una línea de lado a lado corta la mancha en dos y la zona deja de leerse como una superficie. Por eso todos los divisores son **inset**: `Rule` usa `mx-5`, las filas de lista usan `after:left-4 after:right-4`.

Los **controles** conservan 1px: engrosarlos los vuelve torpes. La retícula que se lee es la de los divisores.

### 2.4. Capa de tokens — `src/index.css`

`#ececec` (perla) y las demás tintas se declaran **una sola vez**, aquí. Todo lo demás consume roles.

```css
@theme {
  --color-pearl: #ececec;

  --font-mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  --font-sans: ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif;

  --text-label: 0.75rem;
  --text-label--line-height: 1rem;

  --animate-flash: flash 0.3s steps(1) 2;
  --animate-blink: blink 1s steps(1) infinite;

  @keyframes flash { 50% { background-color: var(--c-ink); color: var(--c-surface); } }
  @keyframes blink { 50% { opacity: 0; } }
}

@theme inline {
  --color-surface: var(--c-surface);
  --color-ink: var(--c-ink);
  --color-ink-muted: var(--c-ink-muted);
  --color-line: var(--c-line);
  --color-accent: var(--c-accent);
  --color-accent-ink: var(--c-accent-ink);
}

:root,
[data-surface="dark"] {
  --c-surface: #000000;
  --c-ink: #ececec;
  --c-ink-muted: #a3a3a3;   /* neutral-400 · 8.3:1 sobre negro */
  --c-line: #262626;        /* neutral-800 */
  --c-accent: #b91c1c;      /* red-700 */
  --c-accent-ink: #f87171;  /* red-400 · 7.6:1 sobre negro */
}

[data-surface="light"] {
  --c-surface: #ececec;
  --c-ink: #000000;
  --c-ink-muted: #525252;   /* neutral-600 · 6.6:1 sobre perla */
  --c-line: rgb(0 0 0 / 0.15);
  --c-accent: #b91c1c;
  --c-accent-ink: #7f1d1d;  /* red-900 · 8.5:1 sobre perla */
}

@utility meter-fill { transition: width 0.3s steps(8); }
```

`pearl` como clase (`bg-pearl`, `text-pearl`) sólo se admite dentro de `primitives.tsx` y para el texto sobre relleno de acento (`BUTTON_CTA`). **Prohibido** el blanco puro `#ffffff` y cualquier literal `[#...]`: sobre negro, el blanco puro deslumbra y rompe la sobriedad técnica.

**Tipografía.** `font-mono` para chrome, etiquetas, datos y botones; `font-sans` para texto de tarea y prosa. La fuente mono se sirve autoalojada (`woff2`, `font-display: swap`) con la pila de respaldo declarada arriba. Los tamaños se expresan en `rem`: nunca `text-[Npx]`.

### 2.5. Texto — Piso de Contraste

Dos roles de texto bastan: `text-ink` y `text-ink-muted`. Ambos superan 4.5:1 (WCAG AA) en su contexto:

| Combinación | Contraste |
| :--- | :--- |
| `ink` sobre perla (negro / `#ececec`) | 17.8:1 |
| `ink` sobre negro (`#ececec` / negro) | 17.8:1 |
| `ink-muted` sobre perla (`#525252`) | 6.6:1 |
| `ink-muted` sobre negro (`#a3a3a3`) | 8.3:1 |
| `text-pearl` sobre `bg-accent` (`#ececec` / `#b91c1c`) | 5.5:1 |
| `accent-ink` sobre negro (`#f87171`) | 7.6:1 |
| `accent-ink` sobre perla (`#7f1d1d`) | 8.5:1 |

> **Regla dura:** no existe un tercer gris de texto. `neutral-500` (4.0:1 sobre perla, 4.4:1 sobre negro) **no se usa** ni siquiera en placeholders ni deshabilitados: ambos usan `ink-muted`. Si un texto no llega al piso de su contexto, no se renderiza: se elimina.

### 2.6. Acento Único

Un solo matiz de acento: **crimson técnico desaturado**, que entra únicamente por los roles `accent` y `accent-ink`.

**Prohibida** toda otra familia de color: `indigo`, `blue`, `sky`, `cyan`, `emerald`, `green`, `teal`, `violet`, `purple`, `fuchsia`, `pink`, `lime`, `amber`, `yellow`, `orange`, `rose`, `gray`, `slate`, `zinc`, `stone`.

**El rojo nunca es el único portador de significado.** Todo estado que use rojo lleva además texto o glifo (§4.3, §8). Ver §6 para el presupuesto exacto de apariciones.

### 2.7. Botones

Los botones usan roles, así que **un mismo token funciona en ambos contextos**: sobre perla es negro con texto perla; sobre el lienzo negro (el lanzador del Drawer) es perla con texto negro.

| Token | Uso | Aspecto |
| :--- | :--- | :--- |
| `BUTTON_PRIMARY` | Acción principal de una zona | `bg-ink text-surface` |
| `BUTTON_OUTLINE` | Acción secundaria | `border-ink text-ink` |
| `BUTTON_CTA` | Única acción crítica del loop (`Completar`) | `bg-accent text-pearl` |

**Estado deshabilitado:** el bloque se conserva como **contorno discontinuo** (`border-dashed`, `border-ink-muted`, `text-ink-muted`), sin relleno. El borde discontinuo lo distingue del secundario (contorno sólido) y mantiene la función visible. Un deshabilitado que explique su causa lo hace con texto visible vinculado por `aria-describedby`, no con un tooltip.

**Hover:** el primario y el CTA se **subrayan** (`hover:underline underline-offset-4`); el secundario se **invierte** a la apariencia del primario. Un primario nunca se invierte al aspecto de una opción no seleccionada.

### 2.8. Unidad Monetaria

La moneda se escribe como **`CR`** en monoespaciada, junto al número (`300 CR`). Prohibido el emoji 🪙 y cualquier otro glifo a color.

Unidades del sistema: **`CR`** (créditos), **`L`** (litros), **`XP`** (experiencia), **`%`** (progreso). Todas en `font-mono`.

---

## 3. Tipografía y Jerarquía

Tres pesos, con función fija: **400** cuerpo y metadatos, **500** controles, etiquetas de sección y texto de tarea, **700** sólo valores, títulos de cinta y CTA. Cuando todo pesa igual, el peso deja de jerarquizar.

| Nivel | Clase canónica |
| :--- | :--- |
| Cinta de zona (chrome) | `font-mono text-label font-bold uppercase tracking-wider text-ink` |
| Título de entidad en la cinta | `font-mono text-sm font-bold uppercase tracking-wider text-ink` |
| Etiqueta de sección dentro de la zona | `font-mono text-label font-medium uppercase tracking-wider text-ink` |
| Etiqueta / metadato | `font-mono text-label uppercase tracking-wider text-ink-muted` |
| Valor principal | `font-mono text-2xl font-bold leading-none text-ink` |
| Valor de progreso | `font-mono text-4xl font-bold leading-none text-ink` |
| Valor compacto en navbar | `font-mono text-base font-bold leading-none text-ink` |
| Texto de tarea | `font-sans text-base font-medium text-ink` |
| Texto de apoyo de tarea | `font-sans text-sm text-ink-muted` |
| Badge | `border-ink-muted text-ink-muted` |

**Reglas:**

1. **Todo dato numérico va en `font-mono`.** Contadores, niveles (`NV.2`), recursos (`300 CR`), porcentajes, coordenadas, XP.
2. **Ningún valor principal baja de `text-2xl` en su tarjeta.** Excepción única: el valor compacto de la navbar. Si no entra, se acorta el texto o se ensancha la tarjeta.
3. **Piso de legibilidad: `text-label` (0.75rem, 12px).** Ningún texto va por debajo. Las etiquetas no suben de `text-sm`: su trabajo es ubicar, no competir.
4. **El contenido de la tarea es lo más legible de la pantalla:** `text-base`, nunca más pequeño que los valores decorativos que lo rodean en su fila.
5. `tracking-wider` en etiquetas, badges y títulos de cinta. Las mayúsculas con tilde conservan su altura: no se recorta el `line-height`.
6. Todos los tamaños en `rem` para respetar la preferencia de tamaño de texto del usuario.

---

## 4. Interacción y Efectos

### 4.1. Hover, foco y transiciones

- **Sin sombras difusas.** El hover **invierte el bloque** (secundario), **subraya** (primario y CTA), cambia el **color de borde** o aplica el **velo del 5%** (`hover:bg-black/5`) en filas de lista. El velo es un estado, no una superficie.
- **Transiciones secas.** `transition-colors` es la única transición de clases admitida. Prohibidos `transition-all`, `duration-*` y `ease-*`. Las demás transiciones viven en `index.css` y usan `steps()` (§4.3).
- **Foco visible en todo elemento interactivo** (botón, fila, pestaña, input, enlace):
  `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink`. Dentro de filas a todo lo ancho, el outline va **hacia adentro** (`-outline-offset-2`). Un input conserva además `focus:border-ink`. Prohibido `outline-none` sin reemplazo.
- **Estado deshabilitado legible.** Ver §2.7.

### 4.2. Seleccionado ≠ Accionable

| | Seleccionado | Accionable |
| :--- | :--- | :--- |
| Forma | Fila o pestaña a todo el ancho de su lista | Bloque de ancho intrínseco |
| Borde | Sin borde | 1px (`border-ink`) |
| Alineación | Texto a la izquierda | Texto centrado |
| Marcador | Prefijo `>` (texto, `aria-hidden`) y etiqueta `ACTIVO` | Ninguno |
| Semántica | `aria-current="true"` o `aria-selected="true"` | `<button>` |
| Contexto | `data-surface="dark"` (inversión) | Resuelto por rol |

**Un botón nunca se usa para mostrar selección.** Un estado alternable usa `aria-pressed` y el mismo marcador `>`.

### 4.3. Movimiento y recompensa

Completar una tarea, ganar XP y subir de nivel son los momentos de mayor valor del producto. El lenguaje de movimiento es **discreto, no continuo**: solo `steps()`, nunca curvas.

| Evento | Movimiento | Tope |
| :--- | :--- | :--- |
| Completar tarea | La fila parpadea invertida dos veces (`animate-flash`) y pasa a `[x]` | 600 ms |
| Ganar XP / créditos | El contador sube en pasos enteros | 8 pasos, 400 ms |
| Medidor de progreso | El relleno avanza por bloques (`meter-fill`, `steps(8)`) | 300 ms |
| Subir de nivel | La etiqueta `NV.N` parpadea invertida y aparece un toast `NV.N ALCANZADO` | 600 ms |
| Carga | Guion bajo parpadeante tras `CARGANDO` (`animate-blink`) | Sólo si dura más de 300 ms |

**Reglas:**

1. Toda animación va con `motion-safe:`. Con `prefers-reduced-motion: reduce`, el estado final aparece al instante.
2. **Ninguna información viaja sólo por movimiento.** El logro siempre se anuncia además en texto (toast o `aria-live="polite"`).
3. Se anima a lo sumo **un evento a la vez**; si llegan varios, se encolan.
4. Prohibido el rebote, el desvanecido suave, el parpadeo continuo y cualquier efecto que sobreviva a su evento.

### 4.4. Teclado

- `BACKLOG.md` fija la combinación de cada atajo, pero **debe cumplir**:
  1. Nunca una tecla simple (letra, número, `[`) sin modificador. Viola WCAG 2.1.4 y choca con la escritura. **Excepción registrada:** ver abajo.
  2. Nunca una combinación que el navegador o el sistema ya usan (`Ctrl+D`, `Ctrl+Shift+B`, etc.). Se valida en Chrome, Firefox y Safari antes de adoptarla. **Excepción registrada:** ver abajo.
  3. Inactivo mientras el foco esté en `input`, `textarea`, `select` o `contenteditable`.
  4. Todo atajo existe **también** como control visible: no hay función accesible sólo por teclado ni sólo por puntero.
  5. El atajo se declara con `aria-keyshortcuts` y se muestra en el texto del control.
- **Orden de foco = orden del DOM = orden visual:** navbar → sidebar → inspector → lanzador del Drawer.
- `Esc` cierra el overlay o el Drawer abierto y devuelve el foco a quien lo abrió.
- Un enlace "Saltar al inspector" es el primer elemento enfocable.

#### Excepción del Drawer (DEC-015 · DEC-022)

El atajo de la Pizarra Diaria es **`Ctrl+B`**, con **`[`** como acelerador secundario. Las reglas 1 y 2 lo prohibirían por sí solas; se conserva por decisión registrada:

- **`GOVERNANCE.md` lo fija** en DEC-015, y es ley superior a este documento. `UI_DESIGN.md` no revoca un `DEC`: lo registra.
- **La regla 4 se cumple.** El Drawer tiene un lanzador visible, así que `[` acelera un control que ya está en pantalla; no es el único camino y ninguna función queda accesible sólo por teclado.
- **Costo aceptado:** en Chrome y Firefox, `Ctrl+B` alterna la barra de marcadores. Si eso molesta en uso real, la salida es un `DEC` nuevo que cambie la combinación; no un cambio silencioso acá ni en el HUD.
- `Tab` **no** es atajo del HUD: pertenece a la navegación por foco (WCAG 2.1.1). `DOMAIN_DESIGN.md` §7 lo menciona en prosa obsoleta y `BACKLOG.md` US-04 es la fuente del atajo.

### 4.5. Táctil

Todo control mide **al menos 24×24 px** y, en puntero grueso, **44×44 px** (`pointer-coarse:min-h-11 pointer-coarse:min-w-11`). Los controles contiguos se separan por la retícula, no por huecos.

---

## 5. Tokens Canónicos

Todos viven en `src/ui/hud/primitives.tsx`. **No se duplican en componentes.**

```ts
// Zona (<Zone>): la única mancha perla permanente
'data-surface="light" bg-surface text-ink rounded-none'

// Cinta de zona (PanelTitle) — contexto oscuro propio
'flex flex-wrap items-center justify-between gap-3 bg-surface px-4 py-2.5 text-ink' + 'data-surface="dark"'
// ...título
'font-mono text-label font-bold uppercase tracking-wider text-ink'

// Etiqueta de sección dentro de la zona (SectionLabel)
'font-mono text-label font-medium uppercase tracking-wider text-ink'

// Divisor inset entre secciones (Rule) — el margen es lo que evita el corte
'mx-5 h-0.5 bg-line'

// Fila de lista con divisor inset
'relative after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-line last:after:hidden'

// Fila seleccionada (Selected): inversión + marcador
'data-surface="dark" bg-surface text-ink' // + <span aria-hidden>&gt;</span> y aria-current="true"

// Celda de métrica (sin caja: la alineación es la tabla)
'rounded-none'
// ...etiqueta
'font-mono text-label uppercase tracking-wider text-ink-muted'
// ...valor
'mt-1 font-mono text-2xl font-bold leading-none text-ink'
// ...tira de métricas
'grid grid-cols-2 gap-x-6 gap-y-4 px-5 pb-5 sm:grid-cols-4'

// Medidor de progreso (role="progressbar" con aria-valuenow/min/max)
'h-2 w-full border border-ink'
'h-full bg-ink motion-safe:meter-fill'

// Badge (ambos contextos)
'inline-block rounded-none border border-ink-muted px-1.5 py-0.5 font-mono text-label uppercase tracking-wider text-ink-muted'

// Foco (compartido por todos los controles)
'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

// BUTTON_PRIMARY
'rounded-none border border-ink bg-ink px-4 py-2 font-mono text-label font-bold uppercase tracking-wider text-surface transition-colors hover:underline hover:underline-offset-4 pointer-coarse:min-h-11 disabled:cursor-not-allowed disabled:border-dashed disabled:border-ink-muted disabled:bg-transparent disabled:text-ink-muted disabled:no-underline'

// BUTTON_OUTLINE
'rounded-none border border-ink px-4 py-2 font-mono text-label font-medium uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-surface pointer-coarse:min-h-11 disabled:cursor-not-allowed disabled:border-dashed disabled:border-ink-muted disabled:text-ink-muted disabled:hover:bg-transparent disabled:hover:text-ink-muted'

// BUTTON_CTA (Completar)
'rounded-none border border-accent bg-accent px-4 py-2 font-mono text-label font-bold uppercase tracking-wider text-pearl transition-colors hover:underline hover:underline-offset-4 pointer-coarse:min-h-11 disabled:cursor-not-allowed disabled:border-dashed disabled:border-ink-muted disabled:bg-transparent disabled:text-ink-muted disabled:no-underline'

// Mensaje de error (ErrorNote) — contorno, nunca relleno
'rounded-none border border-accent-ink px-3 py-2 font-mono text-label uppercase tracking-wider text-accent-ink' // role="alert", prefijo "ERR"
```

### 5.1. Distribución

- **Aire interno: `p-4` mínimo.** Los cuerpos de zona respiran con `p-4`/`p-5`. `p-2`/`p-3` sólo para controles compactos.
- **Nunca dos bordes adyacentes.** Un solo lado por junta.
- **Dos superficies, no tres.** Perla (las zonas) o negro (el lienzo y el chrome). Los tonos de estado (§2.2) no cuentan como superficie.
- **Listas planas antes que cajas.** Una lista de items vive dentro del bloque y se separa con divisores **inset** (`after:h-px`), no con una pila de tarjetas.
- **Una mancha por zona.** Antes de pintar un `data-surface="light"` nuevo, preguntate si es una zona. Si no lo es, es una línea.
- **Techo de ancho: 65%.** En desktop, el grupo de bloques (sidebar + inspector) no supera el 65% del ancho de `main` (`lg:max-w-[65%]`). La sidebar conserva sus `17rem` fijos y la navbar sigue a todo lo ancho. El techo se justifica por densidad: pasado ~1100px, las filas del inspector pierden agrupación y las líneas de lectura se alargan. El resto del ancho pertenece al lienzo isométrico (§0.1) cuando esté montado; hasta entonces es negro de respiro, no un panel vacío.

---

## 6. Presupuesto del Acento

El acento aparece en **exactamente cinco** lugares. Si se agrega el sexto, se elimina uno.

1. **La marca:** el cuadrado de 8px junto a cada wordmark de chrome (`h-2 w-2 bg-accent`) — navbar y cinta del Drawer. Un solo puesto semántico.
2. El badge `ACTIVE` de la ciudad (`border border-accent-ink text-accent-ink`, sin relleno).
3. La etiqueta `ACTIVO` en la fila del distrito seleccionado (`text-accent-ink`, que resuelve al contexto oscuro de la fila invertida).
4. El botón `Completar` — la CTA crítica del loop (`BUTTON_CTA`).
5. Los mensajes de error (`ErrorNote`: contorno `border-accent-ink`, texto `text-accent-ink`).

**Rojo sólido = acción. Rojo en contorno con prefijo `ERR` = error.** Nunca se intercambian: la CTA es rellena y no lleva `ERR`; el error es contorno, lleva `ERR` y `role="alert"`.

**El acento nunca rellena superficies grandes.** Vive en el chrome negro, en la CTA y en contornos, jamás en un cuerpo perla. La pestaña activa del Drawer **no** usa rojo: se marca por inversión y marcador (§4.2).

---

## 7. Capas y Overlays

### 7.1. Escala de capas

| Capa | Clase | Qué vive aquí |
| :--- | :--- | :--- |
| Lienzo | `z-0` | Canvas isométrico |
| Zonas | `z-10` | Sidebar, inspector |
| Lanzador | `z-20` | Botón *Pizarra Diaria* |
| Drawer | `z-30` | Zona Drawer |
| Popover / menú / tooltip | `z-40` | Chrome transitorio |
| Overlay | `z-50` | Scrim + modal |
| Toast | `z-60` | Notificaciones |

### 7.2. Overlay modal (zona transitoria)

- **Una sola a la vez, nunca anidada.** Es la única mancha perla adicional al presupuesto de §2.1: `<Overlay>` envuelve un `<Zone>` con cinta negra, título y botón `CERRAR`.
- **Scrim:** `bg-black/80` a pantalla completa.
- Semántica de diálogo modal (`<dialog>` o `role="dialog" aria-modal="true"`), foco atrapado, `Esc` cierra, el foco vuelve al disparador.
- **Confirmación destructiva:** vive en un overlay. El foco inicial va a `Cancelar`. La acción destructiva usa `BUTTON_PRIMARY` con un verbo explícito (`ELIMINAR DISTRITO`), no `BUTTON_CTA`: el acento está reservado a `Completar`. El texto del overlay enuncia la consecuencia.

### 7.3. Popover, menú y tooltip

Son **chrome**, no zona: `data-surface="dark" bg-surface text-ink border border-ink`, `text-label`, sin sombra. Un tooltip nunca contiene información imprescindible ni controles: lo imprescindible es texto visible.

### 7.4. Toast

- `data-surface="dark" bg-surface text-ink border border-ink`, anclado abajo a la izquierda (`fixed bottom-4 left-4`), uno visible a la vez, con cola.
- Prefijo en mono: `OK`, `NV.N`, `INFO`. Éxito e información: `role="status"`, se descartan solos tras 6 s y se pausan con hover o foco. Errores: `role="alert"`, **no se descartan solos**.

---

## 8. Estados de Interfaz

Todo bloque que carga, falla o queda vacío usa el mismo vocabulario. Ningún estado depende sólo del color.

| Estado | Resolución |
| :--- | :--- |
| **Vacío** | Dentro de la zona, `font-mono text-label uppercase text-ink-muted` (`SIN TAREAS EN ESTE DISTRITO`) + una frase de causa + una acción `BUTTON_OUTLINE` |
| **Carga** | `CARGANDO` + guion bajo `animate-blink`; sólo si supera 300 ms; la región lleva `aria-busy="true"`. Con progreso conocido, medidor determinado |
| **Error** | `ErrorNote` (`ERR` + causa) con `role="alert"` + `BUTTON_OUTLINE` `Reintentar` |
| **Éxito** | Toast `OK` + el cambio visible en la fila |
| **Destructivo** | Overlay de confirmación (§7.2) |

### 8.1. Estado de tarea

El estado de una tarea se lee por **glifo y texto**, nunca por color.

**La lista es cerrada y es exactamente la unión de `OneOffTask.boardStatus`** (`src/core/types`). Este documento **no** puede agregar estados: si el dominio no lo declara, no existe en el HUD.

| `boardStatus` | Glifo | Etiqueta | Tratamiento |
| :--- | :--- | :--- | :--- |
| `MASTER_PLAN` | `[ ]` | `PLANO MAESTRO` | Texto `text-ink` |
| `IN_CONSTRUCTION` | `[~]` | `EN OBRA` | Texto `text-ink` |
| `COMPLETED` | `[x]` | `HECHA` | Texto `text-ink-muted`, sin tachado |

**Sin fechas, sin vencimiento.** `OneOffTask` no declara `dueDate` ni ningún estado derivado del tiempo: el producto no castiga la acumulación (`DOMAIN_DESIGN.md` §1), así que "vencida" es una categoría inexistente. Un badge de urgencia exige **primero** un campo en el dominio y un `DEC`; nunca se inventa en la capa visual.

Un estado nuevo se agrega **primero** al tipo, **después** a esta tabla, en ese orden. `COMPLETED` es inmutable salvo la ventana de Undo (US-12).

Los glifos son caracteres de texto en `font-mono`, con el estado en texto accesible (`<span class="sr-only">`). No son emojis.

---

## 9. Accesibilidad

El cumplimiento mínimo es **WCAG 2.2 AA**.

- **Contraste:** los roles de §2.5 son el único origen de color de texto. Todo texto debe cumplir 4.5:1; los íconos y bordes que portan significado, 3:1.
- **Landmarks:** `<header>` navbar, `<nav aria-label="Distritos">` sidebar, `<main>` inspector, `<aside aria-label="Pizarra diaria">` Drawer. Cada zona es una región con nombre.
- **Patrones ARIA:**
  - Lista de distritos: botones con `aria-current="true"` en el activo.
  - Pestañas del Drawer: `role="tablist"`, `role="tab"` con `aria-selected`, `role="tabpanel"`, navegación con flechas.
  - Medidor: `role="progressbar"` con `aria-valuenow`, `aria-valuemin`, `aria-valuemax` y `aria-label`.
  - Lanzador del Drawer: `aria-expanded` y `aria-controls`.
- **Anuncios:** los cambios de `CR`, `XP`, `NV` y el resultado de completar una tarea se anuncian en una región `aria-live="polite"`.
- **Estado nunca sólo visual:** selección, vencimiento, error y logro llevan texto o glifo **y** el atributo ARIA correspondiente (§4.2, §8.1).
- **Reflow y zoom:** el HUD funciona a 320 px de ancho y a 400% de zoom sin scroll horizontal; el texto escala con `rem`.
- **Idioma:** `<html lang="es">`.
- **Foco, teclado, táctil y movimiento:** §4.1–§4.5.

---

## 10. Responsive

Un solo breakpoint de layout (`lg`, 1024px) y una política clara por debajo.

| Ancho | Layout |
| :--- | :--- |
| `< sm` (640px) | Una columna. Las zonas se apilan: sidebar → inspector. El Drawer ocupa todo el ancho y el alto disponible |
| `sm` – `< lg` | Una columna. La tira de métricas pasa a `sm:grid-cols-4`. El Drawer se limita a `sm:max-w-md` |
| `≥ lg` | Sidebar de `17rem` + inspector, grupo limitado al 65% de `main` (§5.1) |

- **Sidebar bajo `lg`:** se colapsa a un disclosure en su cinta (`DISTRITOS`, `aria-expanded`) que muestra el distrito activo; al elegir uno, se cierra.
- **Lanzador:** `bottom-4 right-4`, respetando `env(safe-area-inset-*)`.
- **Mínimo soportado:** 320px, sin scroll horizontal.
- La posición del lienzo bajo `lg` la define `DOMAIN_DESIGN.md` §7; el HUD no lo tapa por defecto.

---

## 11. Auditoría

Ejecutar antes de cerrar cualquier cambio que toque `src/ui/`. Los puntos 1–10 deben salir vacíos, salvo donde se indica.

**Alcance hoy (§0.3).** El trinquete es **por archivo**, no por árbol: un cambio no puede aumentar los hallazgos de los archivos que toca, y un archivo migrado debe quedar en cero. La auditoría sobre `src/ui` completo es gate recién cuando cierre `BACKLOG.md` `MIG-02`; hasta entonces el árbol conserva hallazgos heredados y eso no bloquea trabajo ajeno.

```bash
# 1. Radio: nada salvo rounded-none
grep -rnE "rounded(-[a-z0-9]+)?" src/ui src/App.tsx | grep -v "rounded-none"

# 2. Sombras y gradientes
grep -rnE "shadow-|drop-shadow|gradient" src/ui src/App.tsx

# 3. Colores con nombre: los componentes sólo usan roles (surface, ink, ink-muted, line, accent, accent-ink)
grep -rnE "(neutral|gray|slate|zinc|stone|red|rose|indigo|blue|sky|cyan|emerald|green|teal|violet|purple|fuchsia|pink|lime|amber|yellow|orange)-[0-9]" src/ui src/App.tsx

# 4. Blanco puro, literales de color, tamaños y estilos arbitrarios
grep -rnE "bg-white|text-white|border-white|#[fF]{3}|\[#|text-\[[0-9.]+(px|rem)\]|style=\{\{" src/ui src/App.tsx

# 5. Alfa: sólo /5, /15 y /80
grep -rnE "(bg|border|text|outline)-(black|pearl)/[0-9]+" src/ui src/App.tsx | grep -vE "/(5|15|80)\b"

# 6. Transiciones y easing no secos
grep -rnE "transition-all|duration-[0-9]|ease-" src/ui src/App.tsx

# 7. Glifos a color (emojis y símbolos pictográficos)
grep -rnP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" src/ui src/App.tsx

# 8. Foco suprimido sin reemplazo
grep -rnE "outline-none|focus:outline-none" src/ui src/App.tsx

# 9. Divisor inset: ningún border-t-2/border-b-2 debe cortar una zona
grep -rn "border-t-2\|border-b-2" src/ui src/App.tsx

# 10. Zonificación: 3 zonas permanentes + 1 transitoria de overlay (§7.2)
grep -rn 'data-surface="light"' src/ui src/App.tsx | grep -v primitives.tsx   # debe salir vacío
grep -rn "<Zone\b" src/ui src/App.tsx | wc -l                                  # 4: sidebar, inspector, Drawer, <Overlay>
```

**El conteo de #10 es 3 + 1, no 3.** `<Overlay>` (§7.2) envuelve un `<Zone>`, así que el total esperado es **cuatro** en cuanto exista el overlay: sidebar, inspector, Drawer y la zona transitoria. Hasta que `MIG-02` lo implemente son tres, y ese es el número que el trinquete de §0.3 usa como referencia. Un `<Zone>` fuera de esas cuatro es una zona inventada, no un bloque.

**Límites del grep:** no ve template strings, clases compuestas dinámicamente ni estilos calculados. Se complementa con (a) una regla de ESLint que prohíba literales de color y tamaño en `className`, (b) `eslint-plugin-jsx-a11y`, y (c) un test que recorra el CSS generado y verifique que sólo existen los tokens de §2.4. Los contrastes de §2.5 se verifican de nuevo cada vez que cambia un valor de §2.4.

---

## 12. Checklist para un componente nuevo

- [ ] Todo contenedor tiene `rounded-none` explícito.
- [ ] Cero `shadow-*`, cero `bg-gradient-*`.
- [ ] Sólo roles de color (`surface`, `ink`, `ink-muted`, `line`, `accent`, `accent-ink`); ningún `neutral-*`, `red-*` ni literal.
- [ ] ¿Es una **zona**? Usa `<Zone>` y **una sola** cinta negra arriba.
- [ ] ¿Es una sección dentro de una zona? Usa `SectionLabel` (sin fondo) y un `Rule` inset, nunca otra cinta.
- [ ] ¿Es una celda de métrica? No lleva caja: la alineación hace la tabla.
- [ ] ¿Es una opción seleccionable? Fila a todo el ancho, inversión + marcador `>` + `aria-current`/`aria-selected`.
- [ ] ¿Es un overlay, popover o toast? Respeta §7: capa correcta, uno a la vez, foco gestionado.
- [ ] Divisores **inset**; ninguno de lado a lado.
- [ ] Controles en **1px**; bloques internos en **1px**; sólo la muestra de paleta va en 2px.
- [ ] Texto en `text-label` (12px) como mínimo, todo en `rem`.
- [ ] Valor principal a `text-2xl` (o `text-4xl` si es progreso) `font-mono font-bold`.
- [ ] Texto de tarea a `text-base font-medium`.
- [ ] Botón desde `BUTTON_PRIMARY`, `BUTTON_OUTLINE` o `BUTTON_CTA`, nunca redefinido localmente.
- [ ] Estado deshabilitado visible (contorno discontinuo) con su causa en texto.
- [ ] Foco visible en todo interactivo (`focus-visible:outline-2`).
- [ ] Objetivo táctil ≥ 24px y `pointer-coarse:min-h-11`.
- [ ] Todo estado (selección, estado de tarea de §8.1, error, logro) tiene texto o glifo y atributo ARIA, no sólo color o inversión.
- [ ] Todo movimiento con `motion-safe:`, `steps()` y anuncio en texto.
- [ ] Atajos sin tecla simple, sin choque con el navegador, con control visible equivalente.
- [ ] Estados vacío, carga y error resueltos según §8.
- [ ] Cero emojis o glifos a color; moneda como `300 CR` en mono.
- [ ] Si agregaste rojo, ¿justifica uno de los cinco puestos de §6?

---

## 13. Modificación

Igual que `GOVERNANCE.md` §5: este documento cambia por decisión explícita del humano dueño del proyecto. Un agente no puede relajar una regla por conveniencia ni "consistencia" con otro documento. Ante ambigüedad, se pregunta; no se inventa.

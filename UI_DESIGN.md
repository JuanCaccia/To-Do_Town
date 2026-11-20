# UI_DESIGN.md — Sistema de Diseño "Odyssey OS"

**To-Do Town · v2.4 · APROBADA — MIGRACIÓN EN CURSO**

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

La convivencia es intencional: el HUD debe leerse como el sistema operativo que *contiene* la ciudad, no como parte de ella. La metáfora de tiling WM es **identidad visual**: no promete el comportamiento de un tiling WM. La ergonomía la definen §4 y §9.

**Referencia estética:** la landing de Odyssey Linux (`odysseylinux.org`). El HUD replica su lenguaje —monoespaciada única, jerarquía por tamaño y tono, bloques grises sobre negro, retícula de celdas, marcadores cuadrados de estado— no su composición de página. Los valores medidos viven **sólo** en §2.4.

### 0.2. Divergencias registradas con `DOMAIN_DESIGN.md` §7

`DOMAIN_DESIGN.md` §7 describe el HUD en prosa de 2024: *"píldora compacta"*, *"paneles flotantes"*, *"botón flotante"*, atajo `Tab`. Odyssey OS las resuelve así:

- **"Píldora" → bloque rectangular.** Radio cero (§1). No hay excepciones.
- **"Paneles flotantes" → ventanas adosadas.** Sin sombras difusas (§4.1). Lo transitorio se resuelve con overlays (§7).
- **"Botón flotante" → se conserva como lanzador anclado.** Es el único control que vive sobre el lienzo: geometría rectangular, capa `z-20` (§7).
- **`Tab` → atajo definido en `BACKLOG.md` US-04.** `Tab` es la tecla de navegación por foco del navegador; secuestrarla rompe accesibilidad. El atajo que lo reemplace debe cumplir §4.4, salvo la excepción registrada del Drawer.

### 0.3. Vigencia, migración y trinquete

**Este documento fue aprobado por `GOVERNANCE.md` DEC-022 y DEC-023.** `GOVERNANCE.md` sigue siendo el rector: cuando un `DEC` y estas páginas discrepen, gana el `DEC`, y este documento registra la excepción en lugar de revocarla.

**Estado real a la aprobación.** La v2.4 introduce piezas que el HUD todavía **no** implementa: la capa de tokens de §2.4, los contextos `data-surface` de §2.2, `<Zone>` con bisel de §5, la retícula de celdas de §2.3 y la tipografía mono única de §3. El código actual sí cumple la geometría de radio cero, el techo del 65% con sidebar de `17rem` (§5.1) y el uso de mono en los datos.

**Cambio de vocabulario visual (v2.3 → v2.4).** "Perla" sigue siendo el nombre del contexto `light`; su valor pasó de `#ececec` a `#d4d4d4`. El token es `bg-surface` / `text-ink`. La clase `pearl` **ya no existe**: su uso en código es deuda de `MIG-02`.

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
| Sombras | `shadow-sm/md/lg/xl`, `drop-shadow-*` | Nada. El relieve se logra con superficie, borde y el bisel de zona (§2.3) |
| Gradientes | `bg-gradient-*`, `from-*`, `to-*` | Fondos planos |
| Separación | Márgenes que dejan huecos sin estructura | Retícula ortogonal: líneas de 1px, celdas alineadas |

**Cajas modulares:** cada zona se lee como la ventana de un tiling WM. Bordes rectos, esquinas vivas, jerarquía por **superficie** (gris contra negro), por **chrome** (la cinta negra) y por **tamaño y tono del texto**, no por peso.

---

## 2. La Metáfora de Ventana — Zonificación

**Regla madre:** *lienzo negro, zonas perla, chrome negro.*

La pantalla se divide en **zonas funcionales grandes**, no en elementos sueltos. Cada zona es **un único bloque perla** (gris claro) sobre el lienzo negro:

```
lienzo: negro (contexto oscuro por defecto)
┌─────────────────────────────────────────────────────┐
│ ■ to-do town               nav en minúsculas        │
├─────────────────────────────────────────────────────┤
│ ┌───────────┐ ┌──────────────────────┐              │
│ │ ███ cinta │ │ ███ cinta            │  lienzo      │
│ │ MICRO-ETQ │ │ MICRO │ MICRO │ MICRO│  isométrico  │
│ │  ítems    │ │ ítems │ ítems │ ítems│  (Hito 1.2)  │
│ │  ───────  │ │ ─────────────────────│              │
│ │ ■ ESTADO  │ │ ■ ESTADO   abrir →   │              │
│ └───────────┘ └──────────────────────┘              │
└─────────────────────────────────────────────────────┘
        ≤ 65% del ancho de main         resto: lienzo
```

Las tres zonas permanentes de hoy: **sidebar de distritos**, **inspector del distrito activo** y **Drawer de la pizarra**.

### 2.1. Las reglas de zonificación

1. **El perla aparece tres veces, no quince.** Una mancha por zona permanente. Si un bloque perla nuevo no es una zona, no se pinta: se resuelve con una línea. Lo transitorio (modal) es la única excepción y se rige por §7.
2. **La cinta negra va arriba de la zona, una sola vez.** Es el chrome de la ventana. Las secciones internas **no** llevan cinta propia: una segunda barra negra trocea el bloque y produce el efecto a rayas.
3. **Lo seleccionado se invierte al contexto contrario.** El distrito activo, la pestaña activa y la celda activa de un grupo pasan a contexto oscuro dentro del bloque perla. La selección se lee por inversión, nunca por un tercer gris.
4. **Selección y acción no comparten forma.** Ver §4.2.

**Prohibido:** alternar bloques negros y perlas en cascada. **Prohibido:** una caja perla dentro de una caja perla. **Prohibido:** cualquier tercera superficie. Hay exactamente dos: **perla** (las zonas) y **negro** (el lienzo y el chrome). Los *tonos de estado* de §2.2 no son superficies.

### 2.2. Contextos de superficie y roles

El sistema tiene **dos contextos**: `dark` (por defecto, el lienzo) y `light` (dentro de una zona perla). Los componentes **nunca nombran un color**: nombran un **rol**, y el contexto lo resuelve.

| Rol | Clase | Contexto `dark` | Contexto `light` |
| :--- | :--- | :--- | :--- |
| Fondo | `bg-surface` | `#000000` | `#d4d4d4` |
| Texto principal, títulos | `text-ink` | `#ececec` | `#000000` |
| Texto de cuerpo, etiqueta, metadato, placeholder | `text-ink-muted` | `#b5b5b5` | `#525252` |
| Línea (divisor, hairline, retícula) | `bg-line` / `border-line` | `#262626` | `#9c9c9c` |
| Relleno de acción | `bg-fill` | `#d4d4d4` | `#000000` |
| Texto sobre relleno de acción | `text-on-fill` | `#000000` | `#ececec` |
| Marca y marcador de atención (sólo relleno) | `bg-accent` | `#e11d2e` | `#e11d2e` |
| Texto y borde de acento | `text-accent-ink` / `border-accent-ink` | `#ff4d5e` | `#a5121f` |

**Cómo se usan los contextos:**

| Elemento | Contexto |
| :--- | :--- |
| Raíz, `main`, navbar, fondo tras las zonas | `dark` (herencia de `:root`) |
| Zona (sidebar, inspector, Drawer) | `<Zone>` → `data-surface="light"` |
| Cinta de título dentro de la zona | `data-surface="dark"` |
| Opción o celda seleccionada dentro de la zona | `data-surface="dark"` |
| Overlay, popover, toast | ver §7 |

**Tonos de estado (lista cerrada).** No son superficies: son estados. Fuera de esta lista, cualquier `black/N` o `white/N` está prohibido.

| Tono | Uso |
| :--- | :--- |
| `bg-black/5` | Velo de hover en filas sobre perla |
| `bg-black/80` | Scrim detrás de un overlay (§7) |

Los componentes **no nombran** `neutral-*`, `red-*` ni ningún matiz: esos valores viven únicamente en la declaración de contextos (§2.4).

### 2.3. Líneas, retícula y bisel

| Elemento | Grosor |
| :--- | :--- |
| Divisor entre secciones de una zona | `h-px bg-line`, **inset** (`mx-5`) |
| Divisor entre filas de una lista | `after:h-px after:bg-line` (inset, `last:after:hidden`) |
| Línea de retícula entre celdas | `border-line` 1px (vertical y horizontal) |
| Borde de bloque interno, input, select, badge, botón, celda | `border` 1px |
| Divisor dentro de la navbar negra | `border-b border-line` 1px |
| Muestra de paleta | `border-2` (única excepción: su relleno es el dato y el borde es el único indicador de selección) |

**Retícula de celdas.** Dentro de una zona, el contenido se organiza en columnas separadas por líneas verticales de 1px y filas separadas por líneas horizontales de 1px. Una celda no lleva caja propia: la alineación y las líneas hacen la tabla.

**Divisores inset.** Los divisores *dentro* de una lista nunca llegan al borde de la zona: una línea de lado a lado corta la mancha en dos. La retícula de celdas, en cambio, ocupa el ancho útil del contenido de la zona.

**Bisel de zona.** Cada `<Zone>` lleva dos líneas planas, no una sombra: una **línea superior clara** de 2px (`border-t-2 border-t-edge-hi`) y una **línea inferior oscura** de 6px (`border-b-6 border-b-edge-lo`). Es la única excepción a "sin relieve" y vive sólo en `<Zone>`.

### 2.4. Capa de tokens — `src/index.css`

Todos los valores de color y tipografía se declaran **una sola vez**, aquí. Todo lo demás consume roles.

> **Valores estimados de la referencia.** Los colores y la tipografía de este bloque se midieron a ojo sobre capturas de `odysseylinux.org`. Se verifican con DevTools (pestañas *Computed* y *Rendered Fonts*) y se ajustan **sólo aquí**. Tras cualquier cambio se recalculan los contrastes de §2.5.

```css
@theme {
  --font-mono: ui-monospace, "DejaVu Sans Mono", "Liberation Mono", "SFMono-Regular", Menlo, Consolas, monospace;

  --text-display: clamp(3rem, 7vw, 5.25rem);
  --text-display--line-height: 1.05;
  --text-h1: clamp(2rem, 4vw, 3.125rem);
  --text-h1--line-height: 1.15;
  --text-h2: 1.375rem;
  --text-h2--line-height: 1.3;
  --text-label: 0.75rem;
  --text-label--line-height: 1rem;
  --leading-body: 1.7;

  --color-edge-hi: #ececec;
  --color-edge-lo: #8a8a8a;

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
  --color-fill: var(--c-fill);
  --color-on-fill: var(--c-on-fill);
  --color-accent: var(--c-accent);
  --color-accent-ink: var(--c-accent-ink);
}

:root,
[data-surface="dark"] {
  --c-surface: #000000;
  --c-ink: #ececec;
  --c-ink-muted: #b5b5b5;   /* 10.2:1 sobre negro */
  --c-line: #262626;
  --c-fill: #d4d4d4;
  --c-on-fill: #000000;
  --c-accent: #e11d2e;
  --c-accent-ink: #ff4d5e;  /* 6.5:1 sobre negro */
}

[data-surface="light"] {
  --c-surface: #d4d4d4;
  --c-ink: #000000;
  --c-ink-muted: #525252;   /* 5.3:1 sobre perla */
  --c-line: #9c9c9c;
  --c-fill: #000000;
  --c-on-fill: #ececec;
  --c-accent: #e11d2e;
  --c-accent-ink: #a5121f;  /* 5.2:1 sobre perla */
}

html { font-family: var(--font-mono); }

@utility meter-fill { transition: width 0.3s steps(8); }
```

**Tipografía única.** Todo el HUD usa la **monoespaciada**: cuerpo, títulos, botones, nav y datos. No existe `font-sans`. Para que se vea igual en todos los sistemas, la fuente que resulte de la verificación con DevTools se autoaloja (`woff2`, `font-display: swap`) y encabeza la pila. Los tamaños se expresan en `rem`: nunca `text-[Npx]`.

**Prohibido** el blanco puro `#ffffff` y cualquier literal `[#...]`: sobre negro, el blanco puro deslumbra y rompe la sobriedad técnica.

### 2.5. Texto — Piso de Contraste

Dos roles de texto bastan: `text-ink` y `text-ink-muted`. Todos superan 4.5:1 (WCAG AA) en su contexto:

| Combinación | Contraste |
| :--- | :--- |
| `ink` sobre perla (`#000` / `#d4d4d4`) | 14.2:1 |
| `ink` sobre negro (`#ececec` / negro) | 17.8:1 |
| `ink-muted` sobre perla (`#525252`) | 5.3:1 |
| `ink-muted` sobre negro (`#b5b5b5`) | 10.2:1 |
| `on-fill` sobre `fill` (negro / `#d4d4d4`; `#ececec` / negro) | 14.2:1 · 17.8:1 |
| `accent-ink` sobre negro (`#ff4d5e`) | 6.5:1 |
| `accent-ink` sobre perla (`#a5121f`) | 5.2:1 |
| `accent` como relleno (cuadrado) sobre negro / perla | 4.4:1 · 3.2:1 (mínimo 3:1 para no-texto) |

> **Regla dura:** no existe un tercer gris de texto. Un texto que no llega al piso de su contexto no se renderiza: se elimina. **`accent` (`#e11d2e`) nunca es color de texto**: el texto rojo es siempre `accent-ink`.

### 2.6. Acento Único

Un solo matiz de acento: **rojo técnico**, que entra únicamente por los roles `accent` y `accent-ink`.

**Prohibida** toda otra familia de color: `indigo`, `blue`, `sky`, `cyan`, `emerald`, `green`, `teal`, `violet`, `purple`, `fuchsia`, `pink`, `lime`, `amber`, `yellow`, `orange`, `rose`, `gray`, `slate`, `zinc`, `stone`.

**El rojo nunca es el único portador de significado.** Todo marcador rojo lleva además texto (§8.1). Ver §6 para el presupuesto exacto de apariciones.

### 2.7. Botones

Los botones usan roles, así que **un mismo token funciona en ambos contextos**: sobre perla es negro con texto claro; sobre el lienzo negro (el lanzador del Drawer) es gris claro con texto negro.

| Token | Uso | Aspecto |
| :--- | :--- | :--- |
| `BUTTON_PRIMARY` | Acción principal de una zona | `■ Etiqueta` sobre `bg-fill` |
| `BUTTON_OUTLINE` | Acción secundaria o de navegación | `border-ink`, con `→` final si navega |

- **Etiqueta en frase** (`Completar`, `Descubrir más →`), peso normal, nunca en mayúsculas.
- **Marcador `■` al inicio del primario:** un cuadrado CSS (`<Marker>`). En la CTA crítica del loop (`Completar`) el cuadrado es `bg-accent`; en los demás primarios es `bg-on-fill`.
- **Estado deshabilitado:** el bloque se conserva como **contorno discontinuo** (`border-dashed border-ink-muted text-ink-muted`), sin relleno. La causa se muestra en texto visible vinculado por `aria-describedby`, no en un tooltip.
- **Hover:** el primario se **subraya** (`hover:underline underline-offset-4`); el secundario se **invierte** a la apariencia del primario.

### 2.8. Unidad Monetaria

La moneda se escribe como **`CR`** junto al número (`300 CR`). Prohibido el emoji 🪙 y cualquier otro glifo a color.

Unidades del sistema: **`CR`** (créditos), **`L`** (litros), **`XP`** (experiencia), **`%`** (progreso).

### 2.9. Anatomía de zona — el patrón "Control Center"

Toda zona sigue la misma secuencia, de arriba abajo:

1. **Bisel superior** (línea clara de 2px).
2. **Cinta negra:** un marcador `■` (rojo sólo si es la marca) + título en minúsculas o frase, `text-sm`, peso normal. A la derecha, metadatos o controles pequeños.
3. **Cabecera de bloque** (opcional): título `text-base` en `text-ink` y una línea de apoyo `text-sm text-ink-muted`.
4. **Columnas de retícula:** cada columna abre con una **micro-etiqueta** (`text-label uppercase tracking-widest text-ink-muted`) y sigue con sus ítems en minúsculas, `text-sm`.
5. **Celdas de estado:** `■ ESTADO` (marcador + micro-etiqueta) a la izquierda y un **enlace de acción** (`abrir →`) a la derecha.
6. **Tira de datos** al pie, separada por una línea: pares breves en `text-sm text-ink-muted`, con el enlace secundario de la zona alineado a la derecha.
7. **Bisel inferior** (línea oscura de 6px).

---

## 3. Tipografía y Jerarquía

**La jerarquía se construye con tamaño y tono, no con peso.** Peso normal (400) en todo, salvo el *titular de columna* (700). Las mayúsculas se reservan para micro-etiquetas, chips y celdas de idioma. Los títulos, la navegación y los botones se escriben en minúsculas o en frase.

| Nivel | Clase canónica |
| :--- | :--- |
| Display (sólo páginas, no HUD) | `text-display text-ink` |
| Título de vista (`h1`) | `text-h1 text-ink` |
| Título de sección (`h2`) | `text-h2 text-ink` |
| Título de entidad en la cinta | `text-sm text-ink` |
| Titular de columna | `text-base font-bold text-ink` |
| Título de tarjeta o ítem | `text-base text-ink` |
| Cuerpo | `text-base leading-body text-ink-muted max-w-[60ch]` |
| Texto de tarea | `text-base text-ink` |
| Apoyo de tarea, metadato | `text-sm text-ink-muted` |
| Navegación | `text-sm text-ink-muted` (activo: `text-ink`) |
| Micro-etiqueta | `text-label uppercase tracking-widest text-ink-muted` |
| Valor principal | `text-2xl leading-none text-ink` |
| Valor de progreso | `text-4xl leading-none text-ink` |
| Valor compacto en navbar | `text-base leading-none text-ink` |
| Chip | `border border-ink-muted px-2 py-0.5 text-label uppercase tracking-widest text-ink-muted` |
| Enlace de acción | `inline-block border-b border-ink pb-1.5 text-sm text-ink` (+ `→`) |
| Enlace en línea | `underline underline-offset-4` |

**Reglas:**

1. **Una sola familia: monoespaciada.** Todo dato numérico, además, nunca baja de `tabular-nums`.
2. **Ningún valor principal baja de `text-2xl` en su tarjeta.** Excepción única: el valor compacto de la navbar.
3. **Piso de legibilidad: `text-label` (0.75rem, 12px).** Ningún texto va por debajo.
4. **`tracking-widest` sólo en micro-etiquetas.** El resto de los textos no lleva tracking.
5. **Medida de lectura: 60 caracteres** como máximo en párrafos. Interlineado generoso en cuerpo (`leading-body`, 1.7).
6. Todos los tamaños en `rem` para respetar la preferencia de tamaño de texto del usuario.

---

## 4. Interacción y Efectos

### 4.1. Hover, foco y transiciones

- **Sin sombras difusas.** El hover **invierte el bloque** (secundario), **subraya** (primario, enlaces), o aplica el **velo del 5%** (`hover:bg-black/5`) en filas sobre perla. Sobre negro, una fila pasa de `text-ink-muted` a `text-ink`.
- **Transiciones secas.** `transition-colors` es la única transición de clases admitida. Prohibidos `transition-all`, `duration-*` y `ease-*`. Las demás viven en `index.css` y usan `steps()` (§4.3).
- **Foco visible en todo elemento interactivo** (botón, fila, celda, pestaña, input, enlace):
  `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink`. Dentro de filas a todo lo ancho, el outline va **hacia adentro** (`-outline-offset-2`). Prohibido `outline-none` sin reemplazo.

### 4.2. Seleccionado ≠ Accionable

| | Seleccionado | Accionable |
| :--- | :--- | :--- |
| Forma | Fila a todo el ancho, o **celda de un grupo de celdas iguales** | Bloque de ancho intrínseco con `■` o `→` |
| Aspecto | Inversión de contexto | `bg-fill` (primario) o contorno (secundario) |
| Marcador | Filas: prefijo `>` y `ACTIVO`. Celdas de grupo: sólo inversión | `■` inicial o `→` final |
| Semántica | `aria-current="true"`, `aria-selected="true"` o `aria-pressed="true"` | `<button>` |

Una celda activa dentro de un grupo (idiomas, filtros, pestañas) lleva el rol de grupo (`role="group"` o `tablist`) y su atributo ARIA: la semántica la da el grupo, no el color. **Un botón nunca se usa para mostrar selección.**

### 4.3. Movimiento y recompensa

Completar una tarea, ganar XP y subir de nivel son los momentos de mayor valor del producto. El lenguaje de movimiento es **discreto, no continuo**: sólo `steps()`, nunca curvas.

| Evento | Movimiento | Tope |
| :--- | :--- | :--- |
| Completar tarea | La fila parpadea invertida dos veces (`animate-flash`) y el marcador pasa a `■ HECHA` | 600 ms |
| Ganar XP / créditos | El contador sube en pasos enteros | 8 pasos, 400 ms |
| Medidor de progreso | El relleno avanza por bloques (`meter-fill`, `steps(8)`) | 300 ms |
| Subir de nivel | La etiqueta `NV.N` parpadea invertida y aparece un toast `NV.N ALCANZADO` | 600 ms |
| Carga | Guion bajo parpadeante tras `cargando` (`animate-blink`) | Sólo si dura más de 300 ms |

**Reglas:**

1. Toda animación va con `motion-safe:`. Con `prefers-reduced-motion: reduce`, el estado final aparece al instante.
2. **Ninguna información viaja sólo por movimiento.** El logro siempre se anuncia además en texto (toast o `aria-live="polite"`).
3. Se anima a lo sumo **un evento a la vez**; si llegan varios, se encolan.
4. Toda animación ambiental (fondo, demo, lienzo en reposo) lleva un control visible **`Pausar animación`** (`text-sm text-ink-muted`, esquina inferior derecha de su contenedor), y arranca pausada si el usuario prefiere movimiento reducido.
5. Prohibido el rebote, el desvanecido suave y cualquier efecto que sobreviva a su evento.

### 4.4. Teclado

- `BACKLOG.md` fija la combinación de cada atajo, pero **debe cumplir**:
  1. Nunca una tecla simple (letra, número, `[`) sin modificador. Viola WCAG 2.1.4 y choca con la escritura. **Excepción registrada:** ver abajo.
  2. Nunca una combinación que el navegador o el sistema ya usan (`Ctrl+D`, `Ctrl+Shift+B`, etc.). Se valida en Chrome, Firefox y Safari antes de adoptarla. **Excepción registrada:** ver abajo.
  3. Inactivo mientras el foco esté en `input`, `textarea`, `select` o `contenteditable`.
  4. Todo atajo existe **también** como control visible.
  5. El atajo se declara con `aria-keyshortcuts` y se muestra en el texto del control (`ESC · cerrar`).
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
// Zona (<Zone>): la única mancha perla permanente, con su bisel
'data-surface="light" rounded-none bg-surface text-ink border-t-2 border-t-edge-hi border-b-6 border-b-edge-lo'

// Cinta de zona (PanelTitle) — contexto oscuro propio
'data-surface="dark" flex flex-wrap items-center justify-between gap-3 bg-surface px-4 py-3 text-ink'
// ...título
'flex items-center gap-3 text-sm text-ink'

// Marcador cuadrado (<Marker>) — el "■"
'inline-block h-2 w-2 shrink-0 rounded-none'
// ...tonos: 'bg-ink' (activo/hecho) · 'bg-ink-muted' (neutro/en curso) · 'bg-accent' (atención/marca)
// ...hueco (pendiente): 'border border-ink-muted'

// Micro-etiqueta de columna / sección
'text-label uppercase tracking-widest text-ink-muted'

// Divisor inset entre secciones (Rule)
'mx-5 h-px bg-line'

// Retícula de celdas (contenedor y celda)
'grid grid-cols-1 border-t border-line sm:grid-cols-3'
'border-b border-line p-5 sm:border-r sm:[&:nth-child(3n)]:border-r-0'

// Fila de lista con divisor inset
'relative after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-line last:after:hidden'

// Fila seleccionada (Selected): inversión + marcador
'data-surface="dark" bg-surface text-ink' // + <span aria-hidden>&gt;</span> y aria-current="true"

// Celda de grupo (idiomas, filtros) — la activa se invierte
'inline-flex h-11 min-w-11 items-center justify-center rounded-none border border-ink-muted px-3 text-label uppercase tracking-widest text-ink'

// Celda de métrica (sin caja: la alineación es la tabla)
'rounded-none'
// ...etiqueta
'text-label uppercase tracking-widest text-ink-muted'
// ...valor
'mt-1 text-2xl leading-none text-ink tabular-nums'
// ...tira de métricas
'grid grid-cols-2 gap-x-6 gap-y-4 px-5 pb-5 sm:grid-cols-4'

// Medidor de progreso (role="progressbar" con aria-valuenow/min/max)
'h-2 w-full border border-ink'
'h-full bg-ink motion-safe:meter-fill'

// Fila de despliegue (disclosure) — aria-expanded, "+" / "−" a la derecha
'flex w-full items-center justify-between gap-4 border-b border-line py-5 text-left text-base text-ink'

// Bloque de aviso (sobre negro)
'rounded-none border border-ink-muted p-5'

// Chip
'inline-block rounded-none border border-ink-muted px-2 py-0.5 text-label uppercase tracking-widest text-ink-muted'

// Enlace de acción ("abrir →")
'inline-block border-b border-ink pb-1.5 text-sm text-ink hover:underline hover:underline-offset-4'

// Foco (compartido por todos los controles)
'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

// BUTTON_PRIMARY (con <Marker> al inicio; la CTA lo lleva en bg-accent)
'inline-flex items-center gap-3 rounded-none border border-fill bg-fill px-5 py-2.5 text-sm text-on-fill transition-colors hover:underline hover:underline-offset-4 pointer-coarse:min-h-11 disabled:cursor-not-allowed disabled:border-dashed disabled:border-ink-muted disabled:bg-transparent disabled:text-ink-muted disabled:no-underline'

// BUTTON_OUTLINE
'inline-flex items-center gap-3 rounded-none border border-ink px-5 py-2.5 text-sm text-ink transition-colors hover:bg-fill hover:text-on-fill pointer-coarse:min-h-11 disabled:cursor-not-allowed disabled:border-dashed disabled:border-ink-muted disabled:text-ink-muted disabled:hover:bg-transparent disabled:hover:text-ink-muted'

// Mensaje de error (ErrorNote) — contorno, nunca relleno
'rounded-none border border-accent-ink px-3 py-2 text-label uppercase tracking-widest text-accent-ink' // role="alert", prefijo "ERR"
```

### 5.1. Distribución

- **Aire interno: `p-4` mínimo.** Los cuerpos de zona respiran con `p-4`/`p-5`. `p-2`/`p-3` sólo para controles compactos.
- **Nunca dos bordes adyacentes.** Un solo lado por junta.
- **Dos superficies, no tres.** Perla (las zonas) o negro (el lienzo y el chrome).
- **Listas y retículas planas antes que cajas.** Una lista de items vive dentro del bloque y se separa con líneas, no con una pila de tarjetas.
- **Una mancha por zona.** Antes de pintar un `data-surface="light"` nuevo, preguntate si es una zona. Si no lo es, es una línea.
- **Contenedor:** `mx-auto max-w-[68rem] px-6`.
- **Techo de ancho: 65%.** En desktop, el grupo de bloques (sidebar + inspector) no supera el 65% del ancho de `main` (`lg:max-w-[65%]`). La sidebar conserva sus `17rem` fijos y la navbar sigue a todo lo ancho. El techo se justifica por densidad: pasado ~1100px, las filas del inspector pierden agrupación. El resto del ancho pertenece al lienzo isométrico (§0.1) cuando esté montado; hasta entonces es negro de respiro.

---

## 6. Presupuesto del Acento

El acento aparece en **exactamente cinco** lugares. Si se agrega el sexto, se elimina uno.

1. **La marca:** el cuadrado `■` (`bg-accent`) junto a cada wordmark de chrome — navbar y cinta del Drawer. Un solo puesto semántico.
2. **Marcador de atención:** el `■` rojo de un estado que requiere atención —hoy: la ciudad en pausa (`MANUAL_PAUSE`) o un hábito en pausa (`PAUSED`)—, siempre acompañado de su texto.
3. El badge `ACTIVE` de la ciudad y la etiqueta `ACTIVO` en la fila del distrito seleccionado (`border-accent-ink` / `text-accent-ink`, sin relleno).
4. **El `■` de la CTA** `Completar` — la acción crítica del loop.
5. Los mensajes de error (`ErrorNote`: contorno `border-accent-ink`, texto `text-accent-ink`, prefijo `ERR`).

**El rojo no rellena superficies ni énfasis textual.** Vive en cuadrados de 8px, en contornos y en las etiquetas del puesto 3. No se colorean palabras ni enlaces de rojo. La pestaña activa del Drawer **no** usa rojo: se marca por inversión (§4.2).

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

- **Una sola a la vez, nunca anidada.** Es la única mancha perla adicional al presupuesto de §2.1: `<Overlay>` envuelve un `<Zone>` con cinta negra, título y botón `ESC · cerrar`.
- **Scrim:** `bg-black/80` a pantalla completa.
- Semántica de diálogo modal (`<dialog>` o `role="dialog" aria-modal="true"`), foco atrapado, `Esc` cierra, el foco vuelve al disparador.
- **Confirmación destructiva:** vive en un overlay. El foco inicial va a `Cancelar`. La acción destructiva usa `BUTTON_PRIMARY` con un verbo explícito (`Eliminar distrito`), sin `■` rojo: el acento está reservado a `Completar`. El texto del overlay enuncia la consecuencia.

### 7.3. Popover, menú y tooltip

Son **chrome**, no zona: `data-surface="dark" bg-surface text-ink border border-ink-muted`, `text-sm`, sin sombra. Un tooltip nunca contiene información imprescindible ni controles: lo imprescindible es texto visible.

### 7.4. Toast

- `data-surface="dark" bg-surface text-ink border border-ink-muted`, anclado abajo a la izquierda (`fixed bottom-4 left-4`), uno visible a la vez, con cola.
- Prefijo en micro-etiqueta: `OK`, `NV.N`, `INFO`. Éxito e información: `role="status"`, se descartan solos tras 6 s y se pausan con hover o foco. Errores: `role="alert"`, **no se descartan solos**.

---

## 8. Estados de Interfaz

Todo bloque que carga, falla o queda vacío usa el mismo vocabulario. Ningún estado depende sólo del color.

| Estado | Resolución |
| :--- | :--- |
| **Vacío** | Dentro de la zona: micro-etiqueta (`SIN TAREAS`) + una frase de causa en `text-sm text-ink-muted` + una acción `BUTTON_OUTLINE` |
| **Carga** | `cargando` + guion bajo `animate-blink`; sólo si supera 300 ms; la región lleva `aria-busy="true"`. Con progreso conocido, medidor determinado |
| **Error** | `ErrorNote` (`ERR` + causa) con `role="alert"` + `BUTTON_OUTLINE` `Reintentar` |
| **Éxito** | Toast `OK` + el cambio visible en la fila |
| **Destructivo** | Overlay de confirmación (§7.2) |

### 8.1. Estado de tarea

El estado se lee por **marcador cuadrado y micro-etiqueta de texto**; el color nunca va solo.

**La lista es cerrada y es exactamente la unión de `OneOffTask.boardStatus`** (`src/core/types`). Este documento **no** puede agregar estados: si el dominio no lo declara, no existe en el HUD.

| `boardStatus` | Marcador | Etiqueta | Texto de la tarea |
| :--- | :--- | :--- | :--- |
| `MASTER_PLAN` | `□` hueco (`border-ink-muted`) | `PLANO MAESTRO` | `text-ink` |
| `IN_CONSTRUCTION` | `■` `bg-ink-muted` | `EN OBRA` | `text-ink` |
| `COMPLETED` | `■` `bg-ink` | `HECHA` | `text-ink-muted`, sin tachado |

**Sin fechas, sin vencimiento.** `OneOffTask` no declara `dueDate` ni ningún estado derivado del tiempo: el producto no castiga la acumulación (`DOMAIN_DESIGN.md` §1), así que "vencida" es una categoría inexistente. Un badge de urgencia exige **primero** un campo en el dominio y un `DEC`; nunca se inventa en la capa visual.

Un estado nuevo se agrega **primero** al tipo, **después** a esta tabla, en ese orden. `COMPLETED` es inmutable salvo la ventana de Undo (US-12).

Los marcadores son elementos CSS (`<Marker>`), no caracteres ni emojis.

---

## 9. Accesibilidad

El cumplimiento mínimo es **WCAG 2.2 AA**.

- **Contraste:** los roles de §2.5 son el único origen de color de texto. Todo texto debe cumplir 4.5:1; los marcadores y bordes que portan significado, 3:1.
- **Landmarks:** `<header>` navbar, `<nav aria-label="Distritos">` sidebar, `<main>` inspector, `<aside aria-label="Pizarra diaria">` Drawer.
- **Patrones ARIA:**
  - Lista de distritos: botones con `aria-current="true"` en el activo.
  - Pestañas del Drawer: `role="tablist"`, `role="tab"` con `aria-selected`, `role="tabpanel"`, navegación con flechas.
  - Grupos de celdas (filtros, idiomas): `role="group"` con nombre y `aria-pressed` en cada celda.
  - Medidor: `role="progressbar"` con `aria-valuenow`, `aria-valuemin`, `aria-valuemax` y `aria-label`.
  - Disclosure: `aria-expanded` y `aria-controls`.
  - Lanzador del Drawer: `aria-expanded` y `aria-controls`.
- **Anuncios:** los cambios de `CR`, `XP`, `NV` y el resultado de completar una tarea se anuncian en una región `aria-live="polite"`.
- **Estado nunca sólo visual:** selección, estado de tarea, error y logro llevan texto y el atributo ARIA correspondiente.
- **Reflow y zoom:** el HUD funciona a 320 px de ancho y a 400% de zoom sin scroll horizontal; el texto escala con `rem`.
- **Idioma:** `<html lang="es">`.
- **Foco, teclado, táctil y movimiento:** §4.1–§4.5.

---

## 10. Responsive

Un solo breakpoint de layout (`lg`, 1024px) y una política clara por debajo.

| Ancho | Layout |
| :--- | :--- |
| `< sm` (640px) | Una columna. Las zonas se apilan: sidebar → inspector. La retícula de celdas pasa a una columna con líneas horizontales. El Drawer ocupa todo el ancho y el alto disponible |
| `sm` – `< lg` | Una columna. La retícula vuelve a tres columnas y la tira de métricas a `sm:grid-cols-4`. El Drawer se limita a `sm:max-w-md` |
| `≥ lg` | Sidebar de `17rem` + inspector, grupo limitado al 65% de `main` (§5.1) |

- **Sidebar bajo `lg`:** se colapsa a un disclosure en su cinta (`distritos`, `aria-expanded`) que muestra el distrito activo; al elegir uno, se cierra.
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

# 3. Colores con nombre: los componentes sólo usan roles
grep -rnE "(neutral|gray|slate|zinc|stone|red|rose|indigo|blue|sky|cyan|emerald|green|teal|violet|purple|fuchsia|pink|lime|amber|yellow|orange)-[0-9]" src/ui src/App.tsx

# 3b. La clase `pearl` ya no existe: el rol es `surface`
grep -rnE "(bg|text|border|outline)-pearl" src/ui src/App.tsx

# 4. Blanco puro, literales de color, tamaños y estilos arbitrarios
grep -rnE "bg-white|text-white|border-white|#[fF]{3}|\[#|text-\[[0-9.]+(px|rem)\]|style=\{\{" src/ui src/App.tsx

# 5. Alfa: sólo /5 y /80
grep -rnE "(bg|border|text|outline)-(black|white)/[0-9]+" src/ui src/App.tsx | grep -vE "/(5|80)\b"

# 6. Transiciones y easing no secos
grep -rnE "transition-all|duration-[0-9]|ease-" src/ui src/App.tsx

# 7. Glifos a color (emojis y símbolos pictográficos)
grep -rnP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" src/ui src/App.tsx

# 8. Foco suprimido sin reemplazo
grep -rnE "outline-none|focus:outline-none" src/ui src/App.tsx

# 9. Tipografía: una sola familia; mayúsculas sólo en micro-etiquetas
grep -rnE "font-sans|font-serif" src/ui src/App.tsx
grep -rn "uppercase" src/ui src/App.tsx | grep -v "text-label"

# 10. Bisel y zonificación
grep -rnE "border-t-2|border-b-6|border-b-2" src/ui src/App.tsx | grep -v primitives.tsx   # vacío
grep -rn 'data-surface="light"' src/ui src/App.tsx | grep -v primitives.tsx               # vacío
grep -rn "<Zone\b" src/ui src/App.tsx | wc -l                                             # 4: 3 permanentes + <Overlay>
```

**El conteo de #10 es 3 + 1, no 3.** `<Overlay>` (§7.2) envuelve un `<Zone>`, así que el total esperado es **cuatro** en cuanto exista el overlay: sidebar, inspector, Drawer y la zona transitoria. Hasta que `MIG-02` lo implemente son tres. Un `<Zone>` fuera de esas cuatro es una zona inventada, no un bloque.

Además, `grep -rnE "font-(bold|semibold|medium)" src/ui src/App.tsx` debe listar **sólo** titulares de columna (§3): revisión manual.

**Límites del grep:** no ve template strings, clases compuestas dinámicamente ni estilos calculados. Se complementa con (a) una regla de ESLint que prohíba literales de color y tamaño en `className`, (b) `eslint-plugin-jsx-a11y`, y (c) un test que recorra el CSS generado y verifique que sólo existen los tokens de §2.4. Los contrastes de §2.5 se recalculan cada vez que cambia un valor de §2.4.

---

## 12. Checklist para un componente nuevo

- [ ] Todo contenedor tiene `rounded-none` explícito.
- [ ] Cero `shadow-*`, cero `bg-gradient-*`.
- [ ] Sólo roles de color (`surface`, `ink`, `ink-muted`, `line`, `fill`, `on-fill`, `accent`, `accent-ink`); ningún `neutral-*`, `red-*`, `pearl` ni literal.
- [ ] Sólo monoespaciada; sin `font-sans`.
- [ ] Jerarquía por tamaño y tono; peso normal, salvo titular de columna.
- [ ] Mayúsculas sólo en micro-etiquetas, chips y celdas; botones, nav y títulos en minúsculas o frase.
- [ ] ¿Es una **zona**? Usa `<Zone>` (con bisel) y **una sola** cinta negra arriba.
- [ ] ¿Es una sección dentro de una zona? Micro-etiqueta de columna y línea inset, nunca otra cinta.
- [ ] ¿Es una tabla de datos? Retícula de celdas con líneas de 1px, sin cajas.
- [ ] ¿Es una opción seleccionable? Inversión + `aria-current`/`aria-selected`/`aria-pressed`.
- [ ] ¿Es un overlay, popover o toast? Respeta §7: capa correcta, uno a la vez, foco gestionado.
- [ ] Texto en `text-label` (12px) como mínimo, todo en `rem`; párrafos a 60ch.
- [ ] Valor principal a `text-2xl` (o `text-4xl` si es progreso).
- [ ] Botón desde `BUTTON_PRIMARY` o `BUTTON_OUTLINE`, nunca redefinido localmente; etiqueta en frase.
- [ ] Estado deshabilitado visible (contorno discontinuo) con su causa en texto.
- [ ] Foco visible en todo interactivo (`focus-visible:outline-2`).
- [ ] Objetivo táctil ≥ 24px y `pointer-coarse:min-h-11`.
- [ ] Todo estado (selección, estado de tarea de §8.1, error, logro) tiene marcador y texto, y atributo ARIA, no sólo color o inversión.
- [ ] Todo movimiento con `motion-safe:`, `steps()`, anuncio en texto y, si es ambiental, `Pausar animación`.
- [ ] Atajos sin tecla simple, sin choque con el navegador, con control visible equivalente (excepción del Drawer en §4.4).
- [ ] Estados vacío, carga y error resueltos según §8.
- [ ] Cero emojis o glifos a color; moneda como `300 CR`.
- [ ] Si agregaste rojo, ¿justifica uno de los cinco puestos de §6?

---

## 13. Modificación

Igual que `GOVERNANCE.md` §5: este documento cambia por decisión explícita del humano dueño del proyecto. Un agente no puede relajar una regla por conveniencia ni "consistencia" con otro documento. Ante ambigüedad, se pregunta; no se inventa.

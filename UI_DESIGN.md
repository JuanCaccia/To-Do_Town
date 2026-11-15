# UI_DESIGN.md — Sistema de Diseño "Odyssey OS"

**To-Do Town · v2.2 · VIGENTE**

> Contrato ejecutable de la interfaz DOM. Toda clase de Tailwind que se escriba en `src/ui/` o `src/App.tsx` sale de este documento o no existe.

---

## 0. Dominio de Autoridad

`UI_DESIGN.md` legisla **cómo se ve el HUD construido en DOM**: geometría, paleta, tipografía, interacción y tokens de clase.

**No legisla:**

| Materia | Autoridad |
| :--- | :--- |
| Inventario de zonas del HUD (qué paneles existen) | `DOMAIN_DESIGN.md` §7 y `ROADMAP.md` §3 |
| Atajos de teclado y comportamiento de cada control | `BACKLOG.md` (Criterios de Aceptación ejecutables) |
| Arte isométrico del lienzo de la ciudad | `DOMAIN_DESIGN.md` §6 |
| Valores, costos y fórmulas mostrados | `ECONOMY.md` |

### 0.1. Frontera HUD ↔ Lienzo

Son **dos superficies estéticas distintas y deliberadas**:

- **Lienzo isométrico** (`src/ui/canvas/`, Hito 1.2): pixel-art cálida, paleta 80/20, tres tonos planos por superficie (`DOMAIN_DESIGN.md` §6). No se toca.
- **HUD / chrome DOM** (`src/ui/hud/`): Odyssey OS, frío, neutro, cero radio. Este documento.

La convivencia es intencional: el HUD debe leerse como el sistema operativo que *contiene* la ciudad, no como parte de ella.

### 0.2. Divergencias registradas con `DOMAIN_DESIGN.md` §7

`DOMAIN_DESIGN.md` §7 describe el HUD en prosa de 2024: *"píldora compacta"*, *"paneles flotantes"*, *"botón flotante"*, atajo `Tab`. Odyssey OS las reemplaza:

- **"Píldora" → bloque rectangular.** Radio cero (§1). No hay excepciones.
- **"Paneles flotantes" → ventanas adosadas.** Sin sombras difusas (§4).
- **`Tab` → `Ctrl+B` / `[`.** `Tab` es la tecla de navegación por foco del navegador; secuestrarla rompe accesibilidad. El atajo vigente lo fija `BACKLOG.md` US-04.

---

## 1. Geometría — Cero Curvas

| Regla | Prohibido | Obligatorio |
| :--- | :--- | :--- |
| Radio de borde | `rounded`, `rounded-sm/md/lg/xl/full` | `rounded-none` en **todo** contenedor, botón, badge, input y tarjeta |
| Sombras | `shadow-sm/md/lg/xl`, `drop-shadow-*` | Nada. El relieve se logra con superficie y borde |
| Gradientes | `bg-gradient-*`, `from-*`, `to-*` | Fondos planos |
| Separación | Márgenes que dejan huecos sin estructura | Retícula ortogonal: divisores **inset** de 2px y bloques alineados |

**Cajas modulares:** cada zona se lee como la ventana de un tiling WM (Hyprland/i3). Bordes rectos, esquinas vivas, jerarquía por **superficie** (perla contra negro) y por **chrome** (la cinta negra).

---

## 2. La Metáfora de Ventana — Zonificación

**Regla madre:** *lienzo negro, zonas perla, chrome negro.*

La pantalla se divide en **zonas funcionales grandes**, no en elementos sueltos. Cada zona es **un único bloque perla** sobre el lienzo negro:

```
lienzo: bg-black
┌──────────────────────────────────────────────┐
│ ███ navbar (negra)                           │
├──────────────────────────────────────────────┤
│ ┌────────────┐   ┌─────────────────────────┐ │
│ │ ███ cinta  │   │ ███ cinta               │ │
│ │   perla    │   │   perla                 │ │
│ │  ─────     │   │  ─────  (divisores      │ │
│ │   perla    │   │  ─────   internos)      │ │
│ └────────────┘   └─────────────────────────┘ │
└──────────────────────────────────────────────┘
```

Las tres zonas de hoy: **sidebar de distritos**, **inspector del distrito activo** y **Drawer de la pizarra**.

### 2.1. Las tres reglas de zonificación

1. **El perla aparece tres veces, no quince.** Una mancha por zona. Si un bloque perla nuevo no es una zona, no se pinta: se resuelve con una línea.
2. **La cinta negra va arriba de la zona, una sola vez.** Es el chrome de la ventana. Las secciones internas (`INFRAESTRUCTURA`, `DECORACIONES`, `CUADRAS`) **no** llevan cinta propia: una segunda barra negra trocea el bloque y produce el efecto a rayas.
3. **Lo seleccionado se invierte al color contrario.** El distrito activo y la pestaña activa pasan a `bg-black text-pearl` dentro del bloque perla. La selección se lee por inversión, nunca por un tercer gris.

**Prohibido:** alternar bloques negros y perlas en cascada. **Prohibido:** una caja perla dentro de una caja perla. **Prohibido:** cualquier tercera superficie de gris. Hay exactamente dos: **perla** (las zonas) y **negro** (el lienzo y el chrome).

### 2.2. Superficies

| Rol | Clase |
| :--- | :--- |
| Lienzo de la app (raíz, `main`, navbar, fondo tras las zonas) | `bg-black` |
| Zona (sidebar, inspector, Drawer) | `bg-pearl text-black` |
| Chrome dentro de la zona: cinta de título | `bg-black` |
| Opción seleccionada dentro de la zona | `bg-black text-pearl` |
| Divisor inset sobre perla | `bg-black/15` (2px) |
| Hairline sobre negro | `border-neutral-800` (1px) |
| Borde de bloque interno (cuadra) | `border border-black/15` (1px) |

Las zonas **no llevan borde exterior**: el perla contra el negro ya es el borde. Un `border-black` sobre lienzo negro sería invisible.

### 2.3. Grosor de Línea

| Elemento | Grosor |
| :--- | :--- |
| Divisor entre secciones de una zona | `h-0.5 bg-black/15` (**inset**) |
| Divisor entre filas de una lista | `after:h-px after:bg-black/15` (inset, `last:after:hidden`) |
| Borde de bloque interno (cuadra) | `border` (1px) |
| Borde de input, select, badge, botón | `border` (1px) |
| Divisor dentro de la navbar negra | `border` (1px) |
| Muestra de paleta | `border-2` (única excepción: su relleno es el dato y el borde es el único indicador de selección) |

**El divisor nunca llega al borde del bloque.** Una línea de lado a lado corta la mancha en dos y la zona deja de leerse como una superficie. Por eso todos los divisores son **inset**: `Rule` usa `mx-5`, las filas de lista usan `after:left-4 after:right-4`.

Los **controles** conservan 1px: engrosarlos los vuelve torpes. La retícula que se lee es la de los divisores.

### 2.4. El token `pearl`

`#ececec` está registrado como token de Tailwind v4 en `src/index.css`:

```css
@theme {
  --color-pearl: #ececec;
}
```

Se usa **siempre** como `bg-pearl`, `text-pearl` o `border-pearl`. **Prohibido** el literal `bg-[#ececec]` y prohibido el blanco puro `#ffffff`: sobre negro, el blanco puro deslumbra y rompe la sobriedad técnica.

### 2.5. Texto — Piso de Contraste por Superficie

El piso depende de la superficie, no del tono.

**Sobre negro:**

| Rol | Clase |
| :--- | :--- |
| Valor principal | `text-pearl` |
| Texto de control | `text-neutral-300` |
| Etiqueta / metadato | `text-neutral-400` |
| Deshabilitado / placeholder | `text-neutral-500` |

**Sobre perla:**

| Rol | Clase |
| :--- | :--- |
| Valor principal | `text-black` |
| Texto de cuerpo | `text-black` |
| Etiqueta / metadato / piso | `text-neutral-600` |
| Deshabilitado / placeholder | `text-neutral-500` |

> **Regla dura:** `text-neutral-600` y `text-neutral-700` sobre `bg-black` son invisibles en pantallas de bajo brillo y quedan prohibidos. Sobre `bg-pearl`, `neutral-600` es el piso (~6.9:1) y `neutral-500` sólo se admite en placeholders. Si un texto no llega al piso de su superficie, no se renderiza: se elimina.

### 2.6. Acento Único

Un solo acento: **crimson técnico desaturado**, `red-600`.

**Prohibidos:** `indigo`, `blue`, `sky`, `cyan`, `emerald`, `green`, `teal`, `violet`, `purple`, `fuchsia`, `pink`, `lime`, `amber`, `yellow`, `orange`.

Ver §6 para el presupuesto exacto de apariciones.

### 2.7. Botones — Contraste Máximo Contra Su Superficie

La regla no es "botones perla", es **el máximo contraste disponible en la superficie donde vive el botón**:

| Contexto | Primario | Secundario |
| :--- | :--- | :--- |
| Sobre perla (casi todos los controles) | `bg-black text-pearl` → `BUTTON_PRIMARY_ON_LIGHT` | `border-black text-black` → `BUTTON_OUTLINE_ON_LIGHT` |
| Sobre negro (el lanzador del Drawer) | `bg-pearl text-black` → `BUTTON_PRIMARY_ON_DARK` | `border-pearl text-pearl` |

Hoy existen **tres**: `BUTTON_PRIMARY_ON_LIGHT`, `BUTTON_OUTLINE_ON_LIGHT` y `BUTTON_PRIMARY_ON_DARK` (el botón flotante *Pizarra Diaria*, el único control que vive sobre el lienzo). El secundario sobre negro se agrega cuando aparezca su primer consumidor; no se declara por adelantado.

**Estado deshabilitado:** el bloque se conserva siempre; se atenúa el texto. `disabled:bg-transparent` está **prohibido**: un CTA transparente se lee como una función inexistente.

### 2.8. Unidad Monetaria

La moneda se escribe como **`CR`** en monoespaciada, junto al número (`300 CR`). Prohibido el emoji 🪙 y cualquier otro glifo a color.

Unidades del sistema: **`CR`** (créditos), **`L`** (litros), **`XP`** (experiencia), **`%`** (progreso). Todas en `font-mono`.

---

## 3. Tipografía y Jerarquía

| Nivel | Clase canónica |
| :--- | :--- |
| Cinta de zona (chrome) | `font-mono text-[10px] font-bold uppercase tracking-widest text-pearl` |
| Título de entidad en la cinta | `font-mono text-sm font-bold uppercase tracking-wider text-pearl` |
| Etiqueta de sección dentro de la zona | `font-mono text-[10px] font-bold uppercase tracking-widest text-black` |
| Etiqueta sobre perla | `font-mono text-[10px] uppercase tracking-widest text-neutral-600` |
| Valor principal sobre perla | `font-mono text-2xl font-bold leading-none text-black` |
| Valor de progreso | `font-mono text-4xl font-bold leading-none text-black` |
| Valor sobre negro | `font-mono text-base font-bold leading-none text-pearl` |
| Texto de tarea | `text-sm font-bold text-black` |
| Badge sobre negro | `border-neutral-600 text-neutral-300` |
| Badge sobre perla | `border-black/40 text-neutral-600` |

**Reglas:**

1. **Todo dato numérico va en `font-mono`.** Contadores, niveles (`NV.2`), recursos (`300 CR`), porcentajes, coordenadas, XP.
2. **Ningún valor principal baja de `text-2xl`** en su tarjeta. Si no entra, se acorta el texto o se ensancha la tarjeta.
3. **Las etiquetas nunca suben de `text-[10px]`.** Su trabajo es ubicar, no competir.
4. `tracking-widest` en etiquetas y badges; `tracking-wider` en títulos de cinta.

---

## 4. Interacción y Efectos

- **Sin sombras difusas.** El hover **invierte el bloque** (`hover:bg-pearl hover:text-black`), cambia el **color de borde** (`hover:border-pearl`) o aplica un **velo del 5%** (`hover:bg-black/5`) en filas de lista. El velo no es una superficie: es un estado.
- **Transiciones secas.** `transition-colors` es la única transición admitida. Prohibidos `transition-all`, `duration-500`, `ease-in-out`.
- **Foco visible.** `focus:border-pearl` sobre negro; `focus:border-black` sobre perla. No se elimina el foco sin reemplazarlo.
- **Estado deshabilitado legible.** Ver §2.7.

---

## 5. Tokens Canónicos

Todos viven en `src/ui/hud/primitives.tsx`. **No se duplican en componentes.**

```ts
// Cinta de zona (PanelTitle)
'flex flex-wrap items-center justify-between gap-3 bg-black px-4 py-2.5'
// ...título
'font-mono text-[10px] font-bold uppercase tracking-widest text-pearl'

// Etiqueta de sección dentro de la zona (SectionLabel)
'font-mono text-[10px] font-bold uppercase tracking-widest text-black'

// Divisor inset entre secciones (Rule) — el margen es lo que evita el corte
'h-0.5 bg-black/15' + 'mx-5'

// Fila de lista con divisor inset
'relative after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-black/15 last:after:hidden'

// Celda de métrica (sin caja: la alineación es la tabla)
'rounded-none'
// ...etiqueta
'font-mono text-[10px] uppercase tracking-widest text-neutral-600'
// ...valor
'mt-1 font-mono text-2xl font-bold leading-none text-black'
// ...tira de métricas
'grid grid-cols-2 gap-x-6 gap-y-4 px-5 pb-5 sm:grid-cols-4'

// Medidor de progreso
'h-2 w-full border border-black/30 bg-black/10'
'h-full bg-black'

// Badge sobre negro / sobre perla
'inline-block rounded-none border border-neutral-600 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-neutral-300'
'inline-block rounded-none border border-black/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-neutral-600'

// Primario sobre perla
'rounded-none border border-black bg-black px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-pearl transition-colors hover:bg-pearl hover:text-black disabled:cursor-not-allowed disabled:border-neutral-400 disabled:bg-neutral-400 disabled:text-neutral-600'

// Secundario sobre perla
'rounded-none border border-black px-4 py-2 font-mono text-[10px] font-medium uppercase tracking-widest text-black transition-colors hover:bg-black hover:text-pearl disabled:cursor-not-allowed disabled:border-neutral-400 disabled:text-neutral-600 disabled:hover:bg-transparent disabled:hover:text-neutral-600'

// Primario sobre el lienzo negro (botón flotante del Drawer)
'rounded-none border border-pearl bg-pearl px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-black hover:text-pearl'
```

### 5.1. Distribución

- **Aire interno: `p-4` mínimo.** Los cuerpos de zona respiran con `p-4`/`p-5`. `p-2`/`p-3` sólo para controles compactos.
- **Nunca dos bordes adyacentes.** Un solo lado por junta.
- **Dos superficies, no tres.** Perla (las zonas) o negro (el lienzo y el chrome). Nunca una tercera variante de gris.
- **Listas planas antes que cajas.** Una lista de items vive dentro del bloque y se separa con divisores **inset** (`after:h-px`), no con una pila de tarjetas.
- **Una mancha por zona.** Antes de pintar un `bg-pearl` nuevo, preguntate si es una zona. Si no lo es, es una línea.
- **Techo de ancho: 65%.** En desktop, el grupo de bloques (sidebar + inspector) no supera el 65% del ancho de `main` (`lg:max-w-[65%]`). La sidebar conserva sus `17rem` fijos y la navbar sigue a todo lo ancho. El 35% restante es **negro de respiro a la derecha**, no un panel vacío: es lo que impide que el inspector se estire a 1200px y pierda densidad.

---

## 6. Presupuesto del Acento

`red-600` aparece en **exactamente cinco** lugares. Si se agrega el sexto, se elimina uno.

1. **La marca:** el cuadrado de 8px junto a cada wordmark de chrome (`h-2 w-2 bg-red-600`) — navbar y cinta del Drawer. Un solo puesto semántico.
2. El badge `ACTIVE` de la ciudad (`border-red-800 bg-red-950/40 text-red-400`).
3. La etiqueta `ACTIVO` en la fila del distrito seleccionado (`text-red-500`).
4. El botón `Completar` — la CTA crítica del loop (`bg-red-600`).
5. El borde y texto de los mensajes de rechazo (`border-red-800 text-red-900` sobre perla).

**El acento nunca rellena superficies grandes.** Vive en el chrome negro y en la CTA, jamás en un cuerpo perla. La pestaña activa del Drawer **no** usa rojo: se marca por inversión (§2.1, regla 3).

---

## 7. Auditoría

Ejecutar antes de cerrar cualquier cambio que toque `src/ui/`:

```bash
# 1. Radio: no debe haber nada salvo rounded-none
grep -rnE "rounded(-[a-z0-9]+)?" src/ui src/App.tsx | grep -v "rounded-none"

# 2. Sombras y gradientes: sin resultados
grep -rnE "shadow-|drop-shadow|gradient" src/ui src/App.tsx

# 3. Colores fuera de la paleta: sin resultados
grep -rnE "(indigo|blue|sky|cyan|emerald|green|teal|violet|purple|fuchsia|pink|lime|amber|yellow|orange)-[0-9]" src/ui src/App.tsx

# 4. Blanco puro y literal de perla: sin resultados
grep -rn "bg-white\|text-white\|border-white\|#ffffff\|\[#ececec\]" src/ui src/App.tsx

# 5. Piso de contraste: sólo deshabilitados, placeholders y neutral-600 sobre perla
grep -rn "text-neutral-700" src/ui src/App.tsx

# 6. Glifos a color y transiciones no secas: sin resultados
grep -rn "🪙\|💰\|⭐\|🔥\|transition-all\|duration-[0-9]" src/ui src/App.tsx

# 7. Superficie única: sólo perla y negro, sin grises intermedios de fondo
grep -rn "bg-neutral-9\|bg-neutral-8" src/ui src/App.tsx

# 8. Zonificación: bg-pearl debe aparecer EXACTAMENTE 3 veces fuera de primitives.tsx
grep -rn "bg-pearl" src/ui src/App.tsx | grep -v primitives.tsx

# 9. Divisor inset: ningún border-t-2/border-b-2 debe cortar una zona
grep -rn "border-t-2\|border-b-2" src/ui src/App.tsx
```

Los puntos 1–4, 6, 7 y 9 deben salir vacíos. El 5 sólo admite `text-neutral-500` en controles deshabilitados y placeholders. El 8 debe dar exactamente **tres** líneas.

---

## 8. Checklist para un componente nuevo

- [ ] Todo contenedor tiene `rounded-none` explícito.
- [ ] Cero `shadow-*`, cero `bg-gradient-*`.
- [ ] ¿Es una **zona**? Tiene `bg-pearl` y **una sola** cinta negra arriba.
- [ ] ¿Es una sección dentro de una zona? Usa `SectionLabel` (sin fondo) y un `Rule` inset, nunca otra cinta.
- [ ] ¿Es una celda de métrica? No lleva caja: la alineación hace la tabla.
- [ ] ¿Es una opción seleccionable? Se invierte a `bg-black text-pearl`.
- [ ] Cero `#ffffff`: perla vía `bg-pearl` / `text-pearl` / `border-pearl`.
- [ ] Cero `[#ececec]` literal: se usa el token.
- [ ] Cero fondos `neutral-*`: hay dos superficies y ninguna es gris.
- [ ] Divisores **inset** (`Rule`, `after:left-4 after:right-4`); ninguno de lado a lado.
- [ ] Controles en **1px**; bloques internos en **1px**; sólo la muestra de paleta va en 2px.
- [ ] Etiqueta a `text-[10px] font-mono tracking-widest` en el tono de su superficie.
- [ ] Valor principal a `text-2xl` (o `text-4xl` si es progreso) `font-mono font-bold`.
- [ ] Ningún texto legible por debajo del piso de su superficie (§2.5).
- [ ] Botón desde `BUTTON_PRIMARY_ON_LIGHT`, `BUTTON_OUTLINE_ON_LIGHT` o `BUTTON_PRIMARY_ON_DARK`, nunca redefinido localmente.
- [ ] Estado deshabilitado visible (bloque presente, texto atenuado).
- [ ] Hover resuelto por inversión, borde o velo del 5%, nunca por elevación.
- [ ] Sólo `transition-colors`.
- [ ] Cero emojis o glifos a color; moneda como `300 CR` en mono.
- [ ] Si agregaste rojo, ¿justifica uno de los cinco puestos de §6?

---

## 9. Modificación

Igual que `GOVERNANCE.md` §5: este documento cambia por decisión explícita del humano dueño del proyecto. Un agente no puede relajar una regla por conveniencia ni "consistencia" con otro documento. Ante ambigüedad, se pregunta; no se inventa.

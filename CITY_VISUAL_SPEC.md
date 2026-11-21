# CITY_VISUAL_SPEC.md — Composición Espacial y Arquetipos del Lienzo Isométrico

**To-Do Town · v1.0 · Hito 1.2**

> Documento normativo del **lienzo** (`src/ui/city-canvas`). Regula **dónde va cada cosa** y **de qué partes se compone cada silueta**. No regula arte, ni dominio, ni economía: para eso hay dueños, y están listados abajo.

---

## 1. Propósito y Autoridad

### 1.1. Qué legisla (y nada más)

1. La **disposición espacial** del mapa: slots de distrito, corredor fluvial, banda cívica y borde.
2. El **inventario de arquetipos** y sus partes: qué piezas componen cada silueta.
3. Las **reglas de derivación** de props que no tienen estado de dominio (bombas, borde, vegetación, puentes).
4. Los **límites de la escena** y el clamp de cámara.

### 1.2. Qué tiene prohibido legislar

| Materia | Dueño |
| :--- | :--- |
| Proyección 2:1, `TILE_W/H`, `FLOOR_H`, painter's algorithm, `ThemeRegistry` | `ARCHITECTURE.md` §4 |
| Principios de arte: 2:1 estricto, outline/highlight de 1px, 3 tonos planos, regla 80/20, encendido de ventanas, paleta del agua | `DOMAIN_DESIGN.md` §6 |
| Estética del HUD en DOM (Odyssey OS, tokens, bisel, retícula) | `UI_DESIGN.md` |
| Valores, tasas, umbrales y niveles | `ECONOMY.md` |
| Tipos y campos del dominio | `src/core` (sellado — `GOVERNANCE.md` DEC-025) |
| CAs ejecutables, User Stories y orden de trabajo | `BACKLOG.md` |
| Orden de hitos y gates | `ROADMAP.md` |

**Ante conflicto, gana el otro documento.** Este spec no es un oráculo de arte: es el capítulo que faltaba sobre **dónde** y **con qué partes**.

---

## 2. Frontera Estética

Ver `DOMAIN_DESIGN.md` §6. No se repite acá.

---

## 3. Nomenclatura (desambiguación obligatoria)

| Término | Qué es | De dónde sale |
| :--- | :--- | :--- |
| **Distrito** | Un `Neighborhood` en el mapa | `state.neighborhoods` |
| **Cuadra** | Un `CityBlock`: bandeja de 2×3 lotes | `neighborhood.blocks` |
| **Lote de hábitos** | Uno de los 4 lotes productivos donde vive un `HabitBuilding` | `src/core/entities/habit.ts` (`PRODUCTIVE_LOTS`) |
| **Lote residencial** | Uno de los 6 lotes de una cuadra | `House.lotIndex` |
| **Plaza / Parque / Monumento** | **Decoración comprada**, no elemento base | `neighborhood.decorations` (`DecorationKind`) |
| **Fábrica** | Silueta visual de un `HabitBuilding`. **No es una entidad** | derivada |
| **Estación de bombeo** | Silueta visual derivada del Acueducto. **No es una entidad** | derivada |

> **Prohibido** llamar "plaza" a los 4 lotes productivos. La plaza es una decoración y puede no existir.

---

## 4. Disposición Espacial (contrato)

### 4.1. Unidades

- La escena trabaja en **tiles**.
- Una cuadra ocupa una celda de **2×3 tiles** (`BLOCK_CELL = { w: 2, h: 3 }`), exactamente sus 6 lotes.
- `tile = (slotOrigin + block.gridPosition) * BLOCK_CELL`
- `BLOCK_STRIDE = { x: 2, y: 3 }`

Esto convierte el `gridPosition` **local al barrio** (US-03 CA-04) en una coordenada de ciudad sin tocar el dominio.

### 4.2. Corredor fluvial

- Eje vertical en `x ∈ [-1, 1]` (3 tiles de ancho), de `y = -40` a `y = 30`.
- Ribera transitable de 3 tiles por lado: `x ∈ [-4, -2]` y `x ∈ [2, 4]`.
- Ninguna cuadra puede entrar al corredor ni a la ribera.

### 4.3. Banda cívica

- `x ∈ [-8, 8]`, `y ∈ [-40, -24]`, al norte, sobre el eje del río.
- Alberga Ayuntamiento, Biblioteca y cabecera del Acueducto.
- **Siempre visible, desde el Día Cero.**

### 4.4. Slots de distrito (tabla normativa)

| Slot | Origen (bloques) | Huella | Banco |
| :---: | :--- | :--- | :--- |
| 0 | `(-8, -7)` | 6×6 bloques | Izquierda norte |
| 1 | `(2, -7)` | 6×6 bloques | Derecha norte |
| 2 | `(-8, 0)` | 6×6 bloques | Izquierda centro |
| 3 | `(2, 0)` | 6×6 bloques | Derecha centro |
| 4 | `(-8, 7)` | 6×6 bloques | Izquierda sur |
| 5 | `(2, 7)` | 6×6 bloques | Derecha sur |

- **Orden de ocupación:** `[2, 3, 0, 1, 4, 5]` — centro primero, para que el mapa nazca equilibrado con un solo distrito.
- **Estabilidad:** un distrito **nunca cambia de slot** cuando se agrega otro.
- **Asignación:** los distritos ocupan slots en **orden de creación** (`Object.keys(state.neighborhoods)`), recorriendo el orden de ocupación. Un distrito nuevo toma el primer slot libre **al final** del recorrido, así que agregar nunca reacomoda a los existentes. **No agrega campo al dominio** (DEC-025).
- **Borrado:** hoy no existe borrado de distritos (el único es la purga del tutorial, que es el primero). Si alguna vez se agrega, la política de reacomodo exige un DEC nuevo — no se resuelve por conveniencia.
- **Desborde:** si las cuadras de un distrito exceden su huella de 6×6, `layoutCity` **lanza**. No reubica en silencio.
- **Slots 6+:** anillo de expansión, mismo patrón desplazado `y += 14` bloques por anillo.

---

## 5. Arquetipos (inventario de partes)

Regla de la sección: **un arquetipo no es una caja**. Es una lista ordenada de partes. Las partes se dibujan con las primitivas de `ARCHITECTURE.md` §4; **la composición es lo que da carácter**.

### 5.1. Casa (3 variantes por `designVariant`)

| Parte | Cantidad | Nota |
| :--- | :---: | :--- |
| Zócalo | 1 | 2px, piedra neutra |
| Cuerpo | 1 | 1 piso (v1), 2 pisos (v2), 2 pisos + buhardilla (v3) |
| Techo a dos aguas | 1 | Alero de 2px por lado |
| Chimenea | 1 | Sobre la cumbrera, desplazada por variante |
| Puerta | 1 | 12px de alto |
| Ventanas | 2 por piso | **Estáticas**: no responden a eficiencia |

> **Prohibido** encender ventanas de casas por eficiencia. `DOMAIN_DESIGN.md` §6.3 ata la iluminación a los edificios de hábitos.

### 5.2. Fábrica (edificio de hábito, Nv.1-5)

| Parte | Cantidad |
| :--- | :--- |
| Cuerpo | 1 — pisos = `checkpointLevel` |
| Techo diente de sierra | 1, desde Nv.3 |
| Chimeneas | `ceil(level / 2)` → 1, 1, 2, 2, 3 |
| Ventanas matriciales | 2 columnas × pisos, **encendidas por eficiencia** |

### 5.3. Núcleo cívico

| Edificio | Silueta |
| :--- | :--- |
| Ayuntamiento | Pórtico + columnas + `level + 1` pisos. El más alto del núcleo |
| Biblioteca | Ventanal continuo + `level` pisos. Se distingue por **forma**, no por color |
| Acueducto | 5 siluetas distintas: tanque, torre, canal, río con puentes, lago con costanera |
| Museo | Cúpula + 1 placa por hábito retirado |

### 5.4. Decoraciones

| `DecorationKind` | Huella | Partes |
| :--- | :--- | :--- |
| `SMALL_PLAZA` | 1 tile | Solado + fuente |
| `FOUNTAIN_PARK` | 2 tiles | Solado + fuente + 4 árboles |
| `CIVIC_MONUMENT` | 1 tile | Solado + obelisco |

Las decoraciones **no son base**: un distrito sin compras no tiene plaza ni fuente.

---

## 6. Props Derivados (sin estado de dominio)

| Prop | Derivación | Interactivo |
| :--- | :--- | :---: |
| Estaciones de bombeo | `max(0, aqueduct.level - 1)`, sobre 4 anclas fijas de ribera | No |
| Borde de nube | Banda de 2 tiles alrededor de `getSceneBounds` | No |
| Vegetación | Paleta por `dailyLiters`: 0 L ocre, 1 L verde hoja, 2 L+ esmeralda con flores del barrio | No |
| Puentes | 1 cada 2 niveles de Acueducto, desde Nv.4 | No |

Ninguno se persiste, ninguno se clickea, ninguno agrega campos al dominio (DEC-025).

---

## 7. Ciudad Mínima (Día Cero) — el piso, no el techo

Estado real al abrir la aplicación: **1 distrito, 1 cuadra rústica, 3 casas, 1 hábito, 2 tareas, Acueducto Nv.1, 0 decoraciones.**

Debe verse **completa, no vacía**:

- El distrito entra en el **slot 2** (izquierda centro).
- La **banda cívica está siempre**: Ayuntamiento Nv.1, Biblioteca Nv.1 y tanque del Acueducto en la cabecera del río.
- El **río corre de punta a punta** aunque no haya estaciones de bombeo (Nv.1 = 0 bombas).
- El **borde de nube** cierra contra `getSceneBounds`, nunca contra un tamaño fijo.
- **Cero plazas, cero fuentes, cero fábricas** si no hay decoraciones ni hábitos. Eso es correcto, no un bug.
- La cámara arranca centrada en el distrito, con el núcleo cívico visible arriba.

**Criterio de aceptación visual del piso:** un Día Cero que se vea **terminado**.

---

## 8. Límites y Cámara (funciones puras)

```ts
getSceneBounds(drawables: readonly Drawable[]): SceneBounds
clampCamera(camera: IsoCamera, bounds: SceneBounds, viewport: Viewport): IsoCamera
```

- `getSceneBounds` devuelve el AABB en **tiles** de todos los drawables, expandido por `BORDER_MARGIN_TILES = 2`.
- `clampCamera` impide que el viewport muestre algo fuera de `bounds`. Es puro y **no conoce el arte**.
- **El borde de nube se pinta en `bounds`; la cámara se clampea a `bounds`.** Una sola fuente de verdad: el arte no legisla la navegación.
- Si `bounds` es menor que el viewport (ciudad chica en `1x`), la cámara se centra y el pan se deshabilita.

---

## 9. Validación

### 9.1. Testeable (Vitest)

- **Slots:** no solapamiento, estabilidad ante alta de un tercer distrito, desborde lanza.
- **Arquetipos:** cantidad de partes por nivel y variante.
- **Props derivados:** cantidad de bombas por nivel de Acueducto, paleta por litros.
- **Bounds y clamp.**

### 9.2. Visual (fixture DEV — US-20)

Checklist contra el croquis de referencia:

1. Día Cero completo: 1 distrito, 3 casas, tanque, nube cerrando.
2. Mapa lleno: 6 distritos, fábricas en Nv.1-5, plazas compradas.
3. Siluetas reconocibles a `1x`: casa ≠ fábrica ≠ biblioteca ≠ ayuntamiento.
4. La nube cierra el perímetro y **frena el pan**.
5. Sin parpadeo ni aliasing en bordes de 1px.

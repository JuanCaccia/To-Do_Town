/**
 * Provisional HUD palette catalogue.
 *
 * `ARCHITECTURE.md` assigns the real palette registry (light/base/shadow trios)
 * to `src/ui/city-canvas/palettes.ts` in Hito 1.2. Until that exists the HUD
 * only needs an id plus a visible swatch, so this stays flat presentation data
 * and never leaks into `src/core`.
 *
 * Swatches are deliberately desaturated to sit inside the Odyssey OS palette.
 */
export interface HudPalette {
  id: string;
  label: string;
  swatch: string;
}

export const HUD_PALETTES: HudPalette[] = [
  { id: 'WORK_SLATE', label: 'Slate', swatch: '#475569' },
  { id: 'STUDY_AMBER', label: 'Ámbar', swatch: '#a16207' },
  { id: 'HOME_TEAL', label: 'Teal', swatch: '#115e59' },
];

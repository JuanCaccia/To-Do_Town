import type { ReactNode } from 'react';

/**
 * Odyssey OS primitives (UI_DESIGN.md §5).
 *
 * Components never name a colour: they name a role and the surface context —
 * `dark` on the canvas, `light` inside a pearl zone — resolves it. Every class
 * string in this file is a canonical token; no component redefines one.
 */

/** Focus ring shared by every interactive control (§4.1). */
export const FOCUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

interface ZoneProps {
  children: ReactNode;
  className?: string;
  id?: string;
  /** Semantic element the zone is drawn on. */
  as?: 'section' | 'aside' | 'div';
  /**
   * The light top edge. A docked zone that starts at the viewport top (the
   * Drawer) drops it so its black ribbon joins the navbar as one bar.
   */
  bevelTop?: boolean;
}

/**
 * The only recurring pearl block on the black canvas (§2). It owns the bevel —
 * the one exception to "no relief": a 2px light top edge and a 6px dark bottom
 * edge, both flat lines, never a shadow.
 */
export function Zone({
  as: Tag = 'section',
  className = '',
  id,
  bevelTop = true,
  children,
}: ZoneProps) {
  return (
    <Tag
      id={id}
      data-surface="light"
      className={`rounded-none ${bevelTop ? 'border-t-2 border-t-edge-hi' : ''} border-b-6 border-b-edge-lo bg-surface text-ink ${className}`}
    >
      {children}
    </Tag>
  );
}

interface PanelTitleProps {
  children: ReactNode;
  /** Right-aligned slot for a badge, a counter or a control. */
  meta?: ReactNode;
  className?: string;
}

/**
 * The black ribbon that crowns a zone. It is the window's chrome and appears
 * once per zone: sections inside never get a second ribbon (§2.1).
 */
export function PanelTitle({ children, meta, className = '' }: PanelTitleProps) {
  return (
    <div
      data-surface="dark"
      className={`flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 text-ink ${className}`}
    >
      <h2 className="flex items-center gap-3 text-sm text-ink">{children}</h2>
      {meta !== undefined && <div className="flex items-center gap-2">{meta}</div>}
    </div>
  );
}

type MarkerTone = 'ink' | 'muted' | 'accent';

interface MarkerProps {
  tone?: MarkerTone;
  /** Pending state: a hollow square that only keeps its outline. */
  hollow?: boolean;
  className?: string;
}

/**
 * The square marker (§8.1). It is a CSS element, never a glyph or an emoji, so
 * state never travels through a character the font can render differently.
 */
export function Marker({ tone = 'ink', hollow = false, className = '' }: MarkerProps) {
  if (hollow) {
    return (
      <span
        aria-hidden
        className={`inline-block h-2 w-2 shrink-0 rounded-none border border-ink-muted ${className}`}
      />
    );
  }

  const toneClass = tone === 'accent' ? 'bg-accent' : tone === 'muted' ? 'bg-ink-muted' : 'bg-ink';

  return (
    <span aria-hidden className={`inline-block h-2 w-2 shrink-0 rounded-none ${toneClass} ${className}`} />
  );
}

/** Micro-label of a column or a section (§3). */
export function SectionLabel({ children }: { children: string }) {
  return <h3 className="text-label uppercase tracking-widest text-ink-muted">{children}</h3>;
}

/**
 * Inset hairline between two sections of the same block. It never reaches the
 * zone's edge: an edge-to-edge line would cut the pearl block in two (§2.3).
 */
export function Rule({ className = 'mx-5' }: { className?: string }) {
  return <div aria-hidden className={`h-px bg-line ${className}`} />;
}

interface StatCellProps {
  label: string;
  value: string;
  detail?: string;
}

/**
 * Borderless metric cell. The strip is a grid with generous gutters, so the
 * alignment carries the table reading and no cell owns a box of its own.
 */
export function StatCell({ label, value, detail }: StatCellProps) {
  return (
    <div className="rounded-none">
      <div className="text-label uppercase tracking-widest text-ink-muted">{label}</div>
      <div className="mt-1 text-2xl leading-none text-ink tabular-nums">{value}</div>
      {detail !== undefined && (
        <div className="mt-1 text-label uppercase tracking-widest text-ink-muted">{detail}</div>
      )}
    </div>
  );
}

interface MeterProps {
  /** Percentage in the 0–100 range. */
  value: number;
  /** Accessible name; the meter is a real progressbar (§9). */
  label: string;
}

export function Meter({ value, label }: MeterProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full border border-ink"
    >
      <div className="h-full bg-ink motion-safe:meter-fill" style={{ width: `${clamped}%` }} />
    </div>
  );
}

/** Uppercase chip: metadata or a state that is not a surface (§3). */
export const Chip =
  'inline-block rounded-none border border-ink-muted px-2 py-0.5 text-label uppercase tracking-widest text-ink-muted';

/** Inline notice inside a zone: a 1px block, never a third surface. */
export const NOTICE =
  'rounded-none border border-ink-muted px-3 py-2 text-sm text-ink-muted';

interface ErrorNoteProps {
  children: ReactNode;
  className?: string;
}

/** Error message: an accent outline, never a filled block (§8). */
export function ErrorNote({ children, className = '' }: ErrorNoteProps) {
  return (
    <p
      role="alert"
      className={`rounded-none border border-accent-ink px-3 py-2 text-label uppercase tracking-widest text-accent-ink ${className}`}
    >
      ERR · {children}
    </p>
  );
}

/** Primary action of a zone: a filled block carrying a leading square. */
export const BUTTON_PRIMARY =
  'inline-flex items-center gap-3 rounded-none border border-fill bg-fill px-5 py-2.5 text-sm text-on-fill transition-colors hover:underline hover:underline-offset-4 pointer-coarse:min-h-11 disabled:cursor-not-allowed disabled:border-dashed disabled:border-ink-muted disabled:bg-transparent disabled:text-ink-muted disabled:no-underline';

/** Secondary or navigation action: an outline that inverts on hover. */
export const BUTTON_OUTLINE =
  'inline-flex items-center gap-3 rounded-none border border-ink px-5 py-2.5 text-sm text-ink transition-colors hover:bg-fill hover:text-on-fill pointer-coarse:min-h-11 disabled:cursor-not-allowed disabled:border-dashed disabled:border-ink-muted disabled:text-ink-muted disabled:hover:bg-transparent disabled:hover:text-ink-muted';

/** Compact dismiss control (`×`) on the black chrome. */
export const BUTTON_DISMISS =
  'inline-flex items-center justify-center rounded-none border border-line px-2 py-1 text-label uppercase tracking-widest text-ink-muted transition-colors hover:border-ink hover:text-ink pointer-coarse:min-h-11 pointer-coarse:min-w-11';

/** Text and numeric input. Focus is never removed, only recoloured (§4.1). */
export const INPUT =
  'rounded-none border border-ink-muted bg-transparent px-2.5 py-2 text-base leading-none text-ink placeholder:text-ink-muted focus:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

/** Closed box of a combo. The list itself is drawn by `Combo`. */
export const SELECT =
  'rounded-none border border-ink-muted bg-transparent px-2 py-2 text-label uppercase tracking-widest text-ink transition-colors hover:border-ink focus:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

/** Item of a popover menu: it inverts on hover, like every dark control. */
export const MENU_ITEM =
  'rounded-none border-b border-line px-3 py-2 text-left text-sm text-ink transition-colors last:border-b-0 hover:bg-fill hover:text-on-fill';

/** Transient chrome notice (§7.4). */
export const TOAST =
  'border border-ink-muted bg-surface px-3 py-2 text-label uppercase tracking-widest text-ink';

/** Cell of a selectable group. The active one inverts to the opposite context. */
export const CELL =
  'inline-flex h-11 min-w-11 items-center justify-center rounded-none border border-ink-muted px-3 text-label uppercase tracking-widest text-ink transition-colors hover:border-ink';
export const CELL_ACTIVE = 'border-ink bg-surface text-ink';

/** Toggle chip on the black chrome. Selection is carried by inversion. */
export const CHIP_IDLE =
  'inline-flex items-center rounded-none border border-ink-muted px-3 py-2 text-label uppercase tracking-widest text-ink-muted transition-colors hover:border-ink hover:text-ink';

/**
 * Option inside a zone's tab strip. The selected one is inverted to the
 * opposite context; selection is never carried by a third grey (§4.2).
 */
export const TAB_ITEM =
  'rounded-none px-3 py-2 text-label uppercase tracking-widest transition-colors';
export const TAB_ITEM_ACTIVE = 'bg-surface text-ink';
export const TAB_ITEM_IDLE = 'text-ink-muted hover:text-ink';

/**
 * Dropdown combo of the Odyssey system: the closed box matches a native select,
 * but the list is ours so it keeps the geometry (zero radius, no shadow) and can
 * open upwards when the control sits at the foot of a panel.
 */
export const COMBO_TRIGGER = 'flex w-full items-center justify-between gap-2';
export const COMBO_CARET = 'text-label leading-none';
export const COMBO_LIST = 'absolute left-0 z-40 w-full min-w-max border border-ink-muted';
export const COMBO_LIST_DARK = 'bg-surface';
export const COMBO_LIST_LIGHT = 'bg-surface';
export const COMBO_OPTION =
  'block w-full px-3 py-2 text-left text-sm uppercase transition-colors';
export const COMBO_OPTION_DARK_ACTIVE = 'bg-surface text-ink';
export const COMBO_OPTION_DARK_IDLE = 'text-ink-muted hover:bg-fill hover:text-on-fill';
export const COMBO_OPTION_LIGHT_ACTIVE = 'bg-surface text-ink';
// Light dropdowns invert the whole row on hover, exactly like the selected
// option: `bg-fill` is black and `text-on-fill` is the light ink in this
// context, so hovering and selecting share the same block.
export const COMBO_OPTION_LIGHT_IDLE = 'text-ink hover:bg-fill hover:text-on-fill';

/**
 * The disabled combo reads like a disabled input of the same panel. It is a
 * complete class, not an addition over `SELECT`: stacking two Tailwind borders
 * leaves the result to CSS order.
 */
export const COMBO_TRIGGER_DISABLED =
  'rounded-none border border-dashed border-ink-muted bg-transparent px-2 py-2 text-label uppercase tracking-widest text-ink-muted cursor-not-allowed';

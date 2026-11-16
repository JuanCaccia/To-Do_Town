import type { ReactNode } from 'react';

interface PanelTitleProps {
  children: ReactNode;
  /** Right-aligned slot for a badge, a counter or a control. */
  meta?: ReactNode;
  /** Window heading of a whole zone. `emphasis` bumps it one step in size. */
  emphasis?: boolean;
}

/**
 * The black ribbon that crowns a zone. A zone is one pearl block on the black
 * canvas, and this ribbon is the only chrome it owns: the sections inside the
 * zone never get a second one, or the block would read as a stack of stripes.
 */
export function PanelTitle({ children, meta, emphasis = false }: PanelTitleProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-black px-4 py-2.5">
      <h2
        className={
          emphasis
            ? 'flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-wider text-pearl'
            : 'flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-pearl'
        }
      >
        {children}
      </h2>
      {meta !== undefined && <div className="flex items-center gap-2">{meta}</div>}
    </div>
  );
}

interface SectionLabelProps {
  children: string;
}

/**
 * Heading of a section *inside* a zone. It carries no background: a second
 * black ribbon would chop the pearl block, which is exactly the striped look
 * the zoning rule forbids.
 */
export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-black">
      {children}
    </h3>
  );
}

/**
 * Inset hairline between two sections of the same pearl block. It never
 * reaches the block's edge: an edge-to-edge line would cut the block in two
 * and the zone would stop reading as one surface.
 */
export function Rule({ className = 'mx-5' }: { className?: string }) {
  return <div aria-hidden className={`h-0.5 bg-black/15 ${className}`} />;
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
      <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-600">{label}</div>
      <div className="mt-1 font-mono text-2xl font-bold leading-none text-black">{value}</div>
      {detail !== undefined && (
        <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-neutral-600">
          {detail}
        </div>
      )}
    </div>
  );
}

interface MeterProps {
  value: number;
}

export function Meter({ value }: MeterProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className="h-2 w-full border border-black/30 bg-black/10">
      <div className="h-full bg-black" style={{ width: `${clamped}%` }} />
    </div>
  );
}

/** Badge for a black surface. */
export const BADGE =
  'inline-block rounded-none border border-neutral-600 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-neutral-300';

/** Badge for a pearl surface. */
export const BADGE_ON_LIGHT =
  'inline-block rounded-none border border-black/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-neutral-600';

/** Primary action on the black canvas (the drawer launcher). */
export const BUTTON_PRIMARY_ON_DARK =
  'rounded-none border border-pearl bg-pearl px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-black hover:text-pearl';

/**
 * Secondary action on the black chrome. Its first consumer is the top-bar
 * hydration pair, which is why it exists now and not before.
 */
export const BUTTON_OUTLINE_ON_DARK =
  'rounded-none border border-pearl px-4 py-2 font-mono text-[10px] font-medium uppercase tracking-widest text-pearl transition-colors hover:bg-pearl hover:text-black disabled:cursor-not-allowed disabled:border-neutral-600 disabled:text-neutral-500 disabled:hover:bg-transparent disabled:hover:text-neutral-500';

/** Numeric input on the black chrome. Focus is never removed, only recoloured. */
export const INPUT_ON_DARK =
  'rounded-none border border-neutral-400 bg-transparent px-2 py-2 font-mono text-base font-bold leading-none text-pearl placeholder:text-neutral-500 focus:border-pearl focus:outline-none';

/** Primary action on a pearl surface: a solid black block, the maximum contrast available there. */export const BUTTON_PRIMARY_ON_LIGHT =
  'rounded-none border border-black bg-black px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-pearl transition-colors hover:bg-pearl hover:text-black disabled:cursor-not-allowed disabled:border-neutral-400 disabled:bg-neutral-400 disabled:text-neutral-600';

/**
 * Option inside a zone's tab strip. The selected one is inverted to the
 * opposite colour; selection is never carried by a third grey.
 */
export const TAB_ITEM =
  'rounded-none px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors';
export const TAB_ITEM_ACTIVE = 'bg-black text-pearl';
export const TAB_ITEM_IDLE = 'text-neutral-600 hover:text-black';

/** Secondary action on a pearl surface. */
export const BUTTON_OUTLINE_ON_LIGHT =
  'rounded-none border border-black px-4 py-2 font-mono text-[10px] font-medium uppercase tracking-widest text-black transition-colors hover:bg-black hover:text-pearl disabled:cursor-not-allowed disabled:border-neutral-400 disabled:text-neutral-600 disabled:hover:bg-transparent disabled:hover:text-neutral-600';

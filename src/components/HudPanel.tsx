import type { ReactNode } from "react";

/**
 * Framed HUD panel: 1px border, L-shaped corner ticks,
 * square dots at edge midpoints — the core Musicyber motif.
 */
export default function HudPanel({
  children,
  className = "",
  active = false,
}: {
  children: ReactNode;
  className?: string;
  /** brighten ticks/border for the selected state */
  active?: boolean;
}) {
  const tick = active ? "border-glow" : "border-ice/60";
  const dot = active ? "bg-glow" : "bg-linehi";
  return (
    <div
      className={`relative border bg-panel transition-colors duration-200 ${
        active ? "border-linehi" : "border-line"
      } ${className}`}
    >
      {/* corner ticks */}
      <span aria-hidden className={`pointer-events-none absolute -top-px -left-px h-2.5 w-2.5 border-t-2 border-l-2 ${tick}`} />
      <span aria-hidden className={`pointer-events-none absolute -top-px -right-px h-2.5 w-2.5 border-t-2 border-r-2 ${tick}`} />
      <span aria-hidden className={`pointer-events-none absolute -bottom-px -left-px h-2.5 w-2.5 border-b-2 border-l-2 ${tick}`} />
      <span aria-hidden className={`pointer-events-none absolute -right-px -bottom-px h-2.5 w-2.5 border-r-2 border-b-2 ${tick}`} />
      {/* edge midpoint dots */}
      <span aria-hidden className={`pointer-events-none absolute top-1/2 -left-[2.5px] h-[5px] w-[5px] -translate-y-1/2 ${dot}`} />
      <span aria-hidden className={`pointer-events-none absolute top-1/2 -right-[2.5px] h-[5px] w-[5px] -translate-y-1/2 ${dot}`} />
      <span aria-hidden className={`pointer-events-none absolute -top-[2.5px] left-1/2 h-[5px] w-[5px] -translate-x-1/2 ${dot}`} />
      <span aria-hidden className={`pointer-events-none absolute -bottom-[2.5px] left-1/2 h-[5px] w-[5px] -translate-x-1/2 ${dot}`} />
      {children}
    </div>
  );
}

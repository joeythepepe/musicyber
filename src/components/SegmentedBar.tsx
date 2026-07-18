"use client";

import { useCallback, useRef } from "react";

/**
 * Blocky segmented bar (progress / volume) — a row of small blocks
 * like the reference's temperature scale. Click / drag to set value.
 */
export default function SegmentedBar({
  ratio,
  segments = 48,
  height = 16,
  onChange,
  label,
}: {
  /** 0..1 */
  ratio: number;
  segments?: number;
  height?: number;
  onChange?: (ratio: number) => void;
  label?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el || !onChange) return;
      const rect = el.getBoundingClientRect();
      const r = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      onChange(r);
    },
    [onChange],
  );

  const filled = Math.round(ratio * segments);

  return (
    <div
      ref={trackRef}
      role={onChange ? "slider" : undefined}
      aria-label={label}
      aria-valuenow={onChange ? Math.round(ratio * 100) : undefined}
      className={`flex w-full items-stretch gap-[3px] ${onChange ? "cursor-pointer touch-none" : ""}`}
      style={{ height }}
      onPointerDown={(e) => {
        if (!onChange) return;
        dragging.current = true;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        setFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (dragging.current) setFromClientX(e.clientX);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
    >
      {Array.from({ length: segments }, (_, i) => {
        const isFilled = i < filled;
        const isHead = i === filled - 1;
        return (
          <span
            key={i}
            className={
              isFilled
                ? isHead
                  ? "bg-glow shadow-[0_0_6px_rgba(103,232,249,0.7)]"
                  : "bg-ice/80"
                : "bg-line/50"
            }
            style={{ width: 3 }}
          />
        );
      })}
    </div>
  );
}

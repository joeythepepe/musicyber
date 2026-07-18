"use client";

/** Tiny blocky equalizer — bars bounce while playing (CSS only).
 *  Uses currentColor → inherits the active theme's glow color. */
export default function Equalizer({
  playing,
  bars = 5,
}: {
  playing: boolean;
  bars?: number;
}) {
  return (
    <span
      className={`flex h-3.5 items-end gap-[2px] text-glow ${playing ? "eq-on" : ""}`}
      aria-hidden
    >
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className="eq-bar w-[3px]"
          style={{
            background: "currentColor",
            height: "100%",
            animationDelay: `${i * 0.13}s`,
            animationDuration: `${0.7 + (i % 3) * 0.17}s`,
            transform: playing ? undefined : "scaleY(0.2)",
          }}
        />
      ))}
    </span>
  );
}

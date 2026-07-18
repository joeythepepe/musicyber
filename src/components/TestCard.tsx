"use client";

/**
 * Retro "NO SIGNAL" test card — shown when FOCUS MUSIC has no real
 * audio file (simulated mode). Honest about the missing tape.
 */
export default function TestCard() {
  const bars = [
    "#c8c8c8",
    "#c8c832",
    "#32c8c8",
    "#32c832",
    "#c832c8",
    "#c83232",
    "#3232c8",
  ];
  return (
    <div className="flex h-full w-full flex-col bg-[#0a0a0f] p-2">
      {/* color bars */}
      <div className="flex flex-[3] overflow-hidden border border-[#2a2a35]">
        {bars.map((c) => (
          <div key={c} className="h-full flex-1" style={{ background: c }} />
        ))}
      </div>
      {/* sub-bars */}
      <div className="mt-1 flex flex-1 overflow-hidden border border-[#2a2a35]">
        {["#3232c8", "#111", "#c832c8", "#111", "#32c8c8", "#111", "#c8c8c8"].map(
          (c, i) => (
            <div key={i} className="h-full flex-1" style={{ background: c }} />
          ),
        )}
      </div>
      {/* caption */}
      <div className="mt-2 border border-[#2a2a35] bg-black px-2 py-2 text-center">
        <p
          className="font-pixel text-[10px] tracking-[0.25em] sm:text-xs"
          style={{ color: "var(--color-ice)" }}
        >
          NO SIGNAL
        </p>
        <p
          className="font-pixel mt-1 text-[8px] tracking-[0.2em]"
          style={{ color: "var(--color-dim)" }}
        >
          ▪ PLEASE INSERT TAPE ▪ <span className="animate-blink">▮</span>
        </p>
      </div>
    </div>
  );
}

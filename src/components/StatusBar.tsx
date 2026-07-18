"use client";

import { useEffect, useState } from "react";

/** Thin top status strip: signal bars, callsign, live clock, fake battery. */
export default function StatusBar({
  callsign,
  tags = [],
}: {
  callsign?: string | null;
  tags?: string[];
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const clock = now
    ? now.toLocaleTimeString("en-GB", { hour12: false })
    : "--:--:--";
  const date = now
    ? now
        .toLocaleDateString("en-US", { weekday: "short", day: "2-digit" })
        .toUpperCase()
    : "--- --";

  return (
    <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <span className="hud-label shrink-0 text-ice">▪ CHILL//OS</span>
        {callsign && (
          <span className="hud-label truncate">
            OP:<span className="text-fg">{callsign}</span>
          </span>
        )}
        {tags.map((t) => (
          <span
            key={t}
            className="hud-label hidden shrink-0 border border-line px-1.5 py-0.5 text-ice/80 sm:inline"
          >
            {t}
          </span>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="hud-label hidden md:inline">{date}</span>
        <span className="font-pixel text-[11px] tracking-widest text-ice">
          {clock}
        </span>
        <span className="text-[9px] tracking-tighter text-fg" aria-hidden>
          ▂▄▆█
        </span>
        <span className="hud-label">87% ▮</span>
      </div>
    </header>
  );
}

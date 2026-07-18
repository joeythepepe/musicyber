"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTv } from "@/lib/tv";

/** Chunky white-noise static burst (~340ms) */
function StaticOverlay({ skey }: { skey: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (skey === 0) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 96;
    const H = 54;
    canvas.width = W;
    canvas.height = H;
    setVisible(true);

    let raf = 0;
    const start = performance.now();
    const draw = (t: number) => {
      const img = ctx.createImageData(W, H);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = Math.min(255, v + 18);
        d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      if (t - start < 340) {
        raf = requestAnimationFrame(draw);
      } else {
        setVisible(false);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [skey]);

  if (!visible) return null;
  return (
    <canvas
      ref={ref}
      className="crt-layer pixelated z-20 h-full w-full opacity-90"
      aria-hidden
    />
  );
}

/** CRT power-on / power-off overlay animations */
function PowerFx({ power }: { power: "idle" | "on" | "off" }) {
  if (power === "idle") return null;
  return (
    <div className="crt-layer z-30 overflow-hidden rounded-[inherit]" aria-hidden>
      {power === "on" ? (
        <>
          <div className="pw-on-top absolute top-0 left-0 w-full bg-black" style={{ height: "50%" }} />
          <div className="pw-on-top absolute bottom-0 left-0 w-full bg-black" style={{ height: "50%" }} />
          <div
            className="pw-on-line absolute top-1/2 left-0 h-[3px] w-full -translate-y-1/2 bg-white"
            style={{ boxShadow: "0 0 18px rgba(190,235,255,0.9)" }}
          />
        </>
      ) : (
        <>
          <div className="pw-off-bar absolute top-0 left-0 w-full bg-black" />
          <div className="pw-off-bar absolute bottom-0 left-0 w-full bg-black" />
          <div
            className="pw-off-dot absolute top-1/2 left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 bg-white"
            style={{ boxShadow: "0 0 20px rgba(190,235,255,1)" }}
          />
          <div className="pw-off-black absolute inset-0 bg-black" />
        </>
      )}
    </div>
  );
}

/**
 * CrtScreen — the whole site is the CRT screen.
 * Strict 4:3 box on deep black; content scrolls inside; all CRT
 * overlays, static bursts and power animations live here.
 */
export default function CrtScreen({ children }: { children: ReactNode }) {
  const { _staticKey, _power, theme } = useTv();
  const contentRef = useRef<HTMLDivElement>(null);

  // rare horizontal sync wobble (every 8–20 s)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let alive = true;
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t1 = setTimeout(() => {
        if (!alive) return;
        const el = contentRef.current;
        if (el) {
          el.classList.add("sync-wobble");
          t2 = setTimeout(() => el.classList.remove("sync-wobble"), 300);
        }
        schedule();
      }, 8000 + Math.random() * 12000);
    };
    schedule();
    return () => {
      alive = false;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="crt-stage" data-theme={theme}>
      {/* seamless room-wide ambient tint (no visible boundary) */}
      <div className="stage-glow" aria-hidden />
      <div className="crt-box">
        {/* scrolling picture */}
        <div ref={contentRef} className="crt-content">
          {children}
        </div>

        {/* CRT overlay stack */}
        <div className="crt-layer ovl-glass z-10" aria-hidden />
        <div className="crt-layer ovl-grille z-10" aria-hidden />
        <div className="crt-layer ovl-bulge-hi z-10" aria-hidden />
        <div className="crt-layer ovl-arc z-10" aria-hidden />
        <div className="crt-layer ovl-scanlines z-10" aria-hidden />
        <div className="crt-layer crt-band-wrap z-10" aria-hidden>
          <div className="crt-band" />
        </div>
        <div className="crt-layer crt-flicker z-10" aria-hidden />
        <div className="crt-layer ovl-bulge-dark z-10" aria-hidden />
        <div className="crt-layer ovl-vignette z-10" aria-hidden />
        <StaticOverlay skey={_staticKey} />
        <PowerFx power={_power} />
      </div>
    </div>
  );
}

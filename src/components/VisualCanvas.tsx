"use client";

import { useEffect, useRef } from "react";
import type { VisualKind } from "@/lib/tracks";

/**
 * Low-res animated canvas upscaled with image-rendering: pixelated.
 * Kinds: pixel rain | starfield drift | slow waveform | drive speed-lines.
 * Colors follow the active [data-theme] palette (re-read on theme change).
 */
export default function VisualCanvas({
  kind,
  playing,
  themeKey = "ice",
}: {
  kind: VisualKind;
  playing: boolean;
  themeKey?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const kindRef = useRef(kind);
  const playingRef = useRef(playing);
  const colorsRef = useRef({ glow: "#67e8f9", ice: "#a5e8ff", line: "#16233a" });
  kindRef.current = kind;
  playingRef.current = playing;

  // re-read theme palette whenever the theme flips
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const get = (name: string, fb: string) =>
      cs.getPropertyValue(name).trim() || fb;
    colorsRef.current = {
      glow: get("--color-glow", colorsRef.current.glow),
      ice: get("--color-ice", colorsRef.current.ice),
      line: get("--color-linehi", colorsRef.current.line),
    };
  }, [themeKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 112;
    const H = 112; // square source for the square visual panel
    canvas.width = W;
    canvas.height = H;

    const rgba = (hex: string, a: number) => {
      const h = hex.replace("#", "");
      const v =
        h.length === 3
          ? h
              .split("")
              .map((c) => c + c)
              .join("")
          : h;
      const n = parseInt(v, 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    };

    // rain state
    const drops = Array.from({ length: 90 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      v: 0.6 + Math.random() * 1.6,
      len: 2 + Math.random() * 4,
    }));
    // starfield state
    const stars = Array.from({ length: 110 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      p: Math.random() * Math.PI * 2,
      s: 0.2 + Math.random() * 0.8,
    }));
    // drive state — horizontal speed lines
    const lines = Array.from({ length: 26 }, () => ({
      y: Math.random() * H,
      x: Math.random() * W,
      len: 8 + Math.random() * 22,
      v: 2.5 + Math.random() * 4,
    }));

    let raf = 0;
    let t = 0;
    let last = performance.now();

    const draw = (nowMs: number) => {
      const dt = Math.min(50, nowMs - last);
      last = nowMs;
      t += dt * (playingRef.current ? 1 : 0.25); // slow drift when paused

      const C = colorsRef.current;
      ctx.fillStyle = "#060a11";
      ctx.fillRect(0, 0, W, H);

      // faint pixel backdrop grid — the frame never reads as dead black
      ctx.fillStyle = rgba(C.glow, 0.05);
      for (let gx = 4; gx < W; gx += 8) {
        for (let gy = 4; gy < H; gy += 8) {
          ctx.fillRect(gx, gy, 1, 1);
        }
      }

      const k = kindRef.current;

      if (k === "rain") {
        ctx.strokeStyle = rgba(C.glow, 0.55);
        ctx.lineWidth = 1;
        for (const d of drops) {
          d.y += d.v * (dt / 16.7);
          d.x += d.v * 0.12 * (dt / 16.7);
          if (d.y > H + d.len) {
            d.y = -d.len;
            d.x = Math.random() * W;
          }
          ctx.globalAlpha = 0.25 + 0.35 * (d.v / 2.2);
          ctx.beginPath();
          ctx.moveTo(Math.floor(d.x), Math.floor(d.y));
          ctx.lineTo(Math.floor(d.x - d.len * 0.15), Math.floor(d.y - d.len));
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = rgba(C.line, 0.35);
        ctx.fillRect(0, H - 8, W, 1);
      } else if (k === "stars") {
        for (const s of stars) {
          const tw = 0.35 + 0.65 * Math.abs(Math.sin(t / 900 + s.p));
          const x = (s.x - t / 6000) % W;
          ctx.fillStyle = rgba(C.ice, tw * s.s);
          ctx.fillRect(Math.floor(x < 0 ? x + W : x), Math.floor(s.y), 1, 1);
        }
        ctx.fillStyle = rgba(C.line, 0.6);
        ctx.fillRect(0, H - 10, W, 10);
      } else if (k === "drive") {
        // fast horizontal speed lines, denser toward the bottom (road feel)
        for (const l of lines) {
          l.x -= l.v * (dt / 16.7);
          if (l.x + l.len < 0) {
            l.x = W + Math.random() * 20;
            l.y = Math.random() * H;
            l.len = 8 + Math.random() * 22;
          }
          const depth = 0.25 + 0.75 * (l.y / H); // lower = brighter/faster feel
          ctx.fillStyle = rgba(C.glow, 0.55 * depth);
          ctx.fillRect(Math.floor(l.x), Math.floor(l.y), Math.floor(l.len * depth), 1);
        }
        // vanishing horizon
        ctx.fillStyle = rgba(C.ice, 0.5);
        ctx.fillRect(0, Math.floor(H * 0.42), W, 1);
      } else {
        // wave: five slow sine layers spread across the full frame height
        const layers = [
          { amp: 10, len: 0.045, speed: 0.0013, y: H * 0.2, a: 0.3 },
          { amp: 14, len: 0.05, speed: 0.0011, y: H * 0.38, a: 0.75 },
          { amp: 17, len: 0.032, speed: 0.0008, y: H * 0.55, a: 0.45 },
          { amp: 13, len: 0.024, speed: 0.0006, y: H * 0.72, a: 0.3 },
          { amp: 9, len: 0.04, speed: 0.0005, y: H * 0.86, a: 0.2 },
        ];
        for (const L of layers) {
          ctx.fillStyle = rgba(C.glow, L.a);
          for (let x = 0; x < W; x += 1) {
            const y =
              L.y +
              Math.sin(x * L.len + t * L.speed * 16) * L.amp +
              Math.sin(x * L.len * 0.4 + t * L.speed * 7) * L.amp * 0.5;
            ctx.fillRect(x, Math.floor(y), 1, 1);
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="pixelated h-full w-full" aria-hidden />;
}

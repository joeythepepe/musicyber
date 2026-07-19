"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const AUTHOR = "Joey G. CHOU";
const HOMEPAGE = "https://www.joeyzhou.me/";
const EMAIL = "zhouyicuhk@link.cuhk.edu.hk";

/**
 * Top-left pixel “!” badge → floating HUD about popover.
 * Portaled + position:fixed so it never expands/pushes the CRT layout.
 */
export default function AboutMenu() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const placePanel = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const gap = 8;
    const width = Math.min(18 * 16, window.innerWidth - 16); // ~18rem, clamp to viewport
    let left = r.left;
    // keep panel inside viewport horizontally
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - 8 - width);
    }
    if (left < 8) left = 8;
    setPos({ top: r.bottom + gap, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    placePanel();
  }, [open, placePanel]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onReposition = () => placePanel();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, placePanel]);

  const panel =
    open &&
    pos &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-label="About CHILL//OS"
        className="about-pop border border-linehi bg-void/95 p-3 shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_12px_32px_rgba(0,0,0,0.65)] backdrop-blur-sm"
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          zIndex: 300,
          width: "min(18rem, calc(100vw - 1rem))",
        }}
      >
        <span className="about-tick about-tick-tl" aria-hidden />
        <span className="about-tick about-tick-tr" aria-hidden />
        <span className="about-tick about-tick-bl" aria-hidden />
        <span className="about-tick about-tick-br" aria-hidden />

        <p className="hud-label mb-2 text-[8px] text-glow">▮ OPERATOR FILE</p>
        <p className="font-pixel text-sm font-bold tracking-wider text-ice">{AUTHOR}</p>
        <p className="mt-0.5 font-plex text-[10px] tracking-widest text-dim uppercase">
          CHILL//OS · author
        </p>

        <div className="my-3 h-px bg-line" aria-hidden />

        <ul className="flex flex-col gap-2">
          <li>
            <p className="hud-label mb-1 text-[8px]">▪ HOME</p>
            <a
              href={HOMEPAGE}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-hud block w-full truncate border-linehi bg-panel2 px-2 py-1.5 text-left text-[10px] text-ice normal-case tracking-wide"
            >
              www.joeyzhou.me ↗
            </a>
          </li>
          <li>
            <p className="hud-label mb-1 text-[8px]">▪ LINK</p>
            <a
              href={`mailto:${EMAIL}`}
              className="btn-hud block w-full truncate border-linehi bg-panel2 px-2 py-1.5 text-left text-[10px] text-ice normal-case tracking-wide"
            >
              {EMAIL}
            </a>
          </li>
        </ul>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-hud mt-3 w-full border-linehi bg-panel2 py-1.5 text-[9px] text-ice"
        >
          ✕ CLOSE
        </button>
      </div>,
      document.body,
    );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`about-badge font-pixel shrink-0 ${open ? "about-badge-on" : ""}`}
        aria-label="About the author"
        aria-expanded={open}
        aria-controls={panelId}
        title="About"
      >
        !
      </button>
      {panel}
    </>
  );
}

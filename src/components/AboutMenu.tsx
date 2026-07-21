"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTv } from "@/lib/tv";

const AUTHOR = "Joey G. CHOU";
const HOMEPAGE = "https://www.joeyzhou.me/";
const EMAIL = "zhouyicuhk@link.cuhk.edu.hk";

/** Dual-role credits shown in the about popover */
const CREDITS = [
  {
    key: "design",
    label: "DESIGN",
    detail: "Site · UI · CRT terminal",
    mark: "◆",
  },
  {
    key: "music",
    label: "MUSIC",
    detail: "Focus tapes · score",
    mark: "♫",
  },
] as const;

/**
 * Top-right pixel “!” badge → floating HUD credits / about popover.
 * Portaled + position:fixed so it never expands/pushes the CRT layout.
 * data-theme follows active mood (portal escapes .crt-stage otherwise).
 */
export default function AboutMenu() {
  const { theme } = useTv();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
    } catch {
      // Fallback for older / restricted contexts
      const ta = document.createElement("textarea");
      ta.value = EMAIL;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(ta);
      }
    }
    setEmailCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setEmailCopied(false), 1800);
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const placePanel = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const gap = 8;
    const width = Math.min(19 * 16, window.innerWidth - 16); // ~19rem, clamp to viewport
    // Anchor under the badge, prefer right-align (badge is top-right)
    let left = r.right - width;
    if (left < 8) left = 8;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - 8 - width);
    }
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
        aria-label="Musicyber credits — design and music by Joey G. CHOU"
        data-theme={theme}
        className="about-pop border border-linehi bg-void/95 p-3 shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_12px_32px_rgba(0,0,0,0.65)] backdrop-blur-sm"
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          zIndex: 300,
          width: "min(19rem, calc(100vw - 1rem))",
          // Force themed tokens on the floating panel (not under .crt-stage)
          color: "var(--color-fg)",
        }}
      >
        <span className="about-tick about-tick-tl" aria-hidden />
        <span className="about-tick about-tick-tr" aria-hidden />
        <span className="about-tick about-tick-bl" aria-hidden />
        <span className="about-tick about-tick-br" aria-hidden />

        {/* ── identity ── */}
        <p className="hud-label mb-2 text-[8px] text-glow">▮ CREDITS // MUSICYBER</p>
        <p className="font-pixel text-sm font-bold tracking-wider text-ice">{AUTHOR}</p>
        <p className="mt-0.5 font-plex text-[10px] tracking-widest text-dim uppercase">
          Solo build · design + music
        </p>

        {/* ── dual credits ── */}
        <ul className="about-credit-list mt-3 flex flex-col gap-1.5" aria-label="Authorship">
          {CREDITS.map((c) => (
            <li key={c.key} className="about-credit">
              <span className="about-credit-mark" aria-hidden>
                {c.mark}
              </span>
              <span className="min-w-0 flex-1">
                <span className="about-credit-label">{c.label}</span>
                <span className="about-credit-detail">{c.detail}</span>
              </span>
              <span className="about-credit-by">BY ME</span>
            </li>
          ))}
        </ul>

        <div className="my-3 h-px bg-line" aria-hidden />

        {/* ── contact ── */}
        <ul className="flex flex-col gap-2">
          <li>
            <p className="hud-label mb-1 text-[8px]">▪ HOME</p>
            <a
              href={HOMEPAGE}
              target="_blank"
              rel="noopener noreferrer"
              className="about-link block w-full truncate border border-linehi bg-panel2 px-2 py-1.5 text-left font-plex text-[11px] tracking-wide text-ice"
            >
              www.joeyzhou.me ↗
            </a>
          </li>
          <li>
            <p className="hud-label mb-1 text-[8px]">▪ EMAIL</p>
            {/*
              Copy instead of mailto: — system mailto handlers (e.g. ChatGPT Atlas)
              intercept mailto links and show an unrelated open-app dialog.
            */}
            <button
              type="button"
              onClick={() => void copyEmail()}
              className="about-link block w-full border border-linehi bg-panel2 px-2 py-1.5 text-left font-plex text-[11px] tracking-wide text-ice"
              title="Copy email address"
              aria-label={`Copy email ${EMAIL}`}
            >
              <span className="block truncate lowercase">{EMAIL}</span>
              <span className="mt-0.5 block font-pixel text-[8px] tracking-widest text-dim">
                {emailCopied ? "✓ COPIED" : "CLICK TO COPY"}
              </span>
            </button>
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
        aria-label="Musicyber credits — design and music by the author"
        aria-expanded={open}
        aria-controls={panelId}
        title="Musicyber · Credits"
      >
        !
      </button>
      {panel}
    </>
  );
}

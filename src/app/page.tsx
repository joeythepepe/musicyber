"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HudPanel from "@/components/HudPanel";
import StatusBar from "@/components/StatusBar";
import SegmentedBar from "@/components/SegmentedBar";
import VisualCanvas from "@/components/VisualCanvas";
import Equalizer from "@/components/Equalizer";
import TestCard from "@/components/TestCard";
import MoodIcon from "@/components/MoodIcon";
import {
  MOODS,
  MOOD_COVERS,
  filterTracks,
  formatTime,
  moodTheme,
  moodVisual,
  type Track,
} from "@/lib/tracks";
import { CALLSIGN, getState, saveState } from "@/lib/session";
import { useNoiseEngine } from "@/lib/noiseEngine";
import { useTv } from "@/lib/tv";

const SLEEP_OPTIONS = [15, 30, 60];

/**
 * Visual priority:
 *   mood cover video → track.art / mood cover image →
 *   NO SIGNAL test card (music track, missing file) → generated animation
 */
function VisualFeed({
  track,
  mood,
  playing,
  noSignal,
  themeKey,
}: {
  track: Track;
  mood: string;
  playing: boolean;
  noSignal: boolean;
  themeKey: string;
}) {
  const cover = MOOD_COVERS[mood];
  const [imgOk, setImgOk] = useState(true);
  useEffect(() => setImgOk(true), [track.id, mood]);

  if (cover?.video) {
    return (
      <video
        src={cover.video}
        autoPlay
        muted
        loop
        playsInline
        className="pixelated h-full w-full object-cover"
      />
    );
  }

  const img = track.art ?? cover?.img;
  if (img && imgOk) {
    return (
      <div className="relative h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={track.title}
          onError={() => setImgOk(false)}
          className="pixelated h-full w-full object-cover"
          style={{ filter: "grayscale(0.45) contrast(1.15) brightness(0.85)" }}
        />
        {/* phosphor duotone wash — follows the active theme */}
        <div
          className="absolute inset-0"
          style={{ background: "var(--color-glow)", mixBlendMode: "color", opacity: 0.35 }}
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{ background: "var(--color-glow)", mixBlendMode: "overlay", opacity: 0.25 }}
          aria-hidden
        />
      </div>
    );
  }

  if (noSignal) return <TestCard />;

  return (
    <VisualCanvas kind={moodVisual(mood)} playing={playing} themeKey={themeKey} />
  );
}

export default function MainScreen() {
  const {
    volume,
    setVolume,
    staticBurst,
    theme,
    setTheme,
  } = useTv();

  const [ready, setReady] = useState(false);
  const [mood, setMood] = useState("ALL");
  const [trackId, setTrackId] = useState<string | null>(null);

  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [simulated, setSimulated] = useState(true);

  const [sleepMin, setSleepMin] = useState<number | null>(null);
  const [sleepLeft, setSleepLeft] = useState(0);
  const [theater, setTheater] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sleepEndRef = useRef<number | null>(null);

  // ── restore persisted state (mood migrated to ALL if unknown) ──
  useEffect(() => {
    const s = getState();
    const validMood =
      s.mood === "ALL" || MOODS.includes(s.mood) ? s.mood : "ALL";
    setMood(validMood);
    setTheme(moodTheme(validMood));
    const q = filterTracks(validMood);
    const found = q.find((t) => t.id === s.trackId);
    setTrackId(found?.id ?? q[0]?.id ?? null);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const queue = useMemo(() => filterTracks(mood), [mood]);
  const trackIndex = Math.max(
    0,
    queue.findIndex((t) => t.id === trackId),
  );
  const track: Track | undefined = queue[trackIndex];
  // playback behavior is derived from the ACTIVE TRACK
  const isNoise = track?.category === "noise";

  // ── reset clock on every track jump (covers synth ⇄ tape hops) ──
  useEffect(() => {
    if (!track) return;
    setElapsed(0);
    setDuration(track.duration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId]);

  // ── noise tracks: Web Audio synth engine ──
  useNoiseEngine(isNoise ? (track?.engine ?? null) : null, playing && isNoise, volume);

  // ── music tracks: real <audio> with NO SIGNAL fallback ──
  useEffect(() => {
    if (!ready || !track || track.category !== "music") return;

    setSimulated(true);

    const a = new Audio(track.src);
    a.preload = "auto";
    a.volume = volume;
    audioRef.current = a;

    const onMeta = () => {
      if (Number.isFinite(a.duration)) setDuration(a.duration);
      setSimulated(false);
      if (playing) a.play().catch(() => setSimulated(true));
    };
    const onError = () => setSimulated(true);
    const onTime = () => {
      if (!Number.isNaN(a.currentTime)) setElapsed(a.currentTime);
    };
    const onEnded = () => selectTrack((trackIndex + 1) % queue.length, true);

    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("error", onError);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnded);

    if (playing) a.play().catch(() => setSimulated(true));

    return () => {
      a.pause();
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("error", onError);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnded);
      a.src = "";
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, trackId]);

  // play/pause the element — audioRef existing implies a music track is loaded
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.play().catch(() => setSimulated(true));
    } else {
      a.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, trackId]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // ── simulated progress ticker (noise always; music when tape missing) ──
  useEffect(() => {
    const isSim = isNoise || simulated;
    if (!playing || !isSim || !track) return;
    const t = setInterval(() => {
      setElapsed((e) => {
        const next = e + 0.5;
        if (next >= duration) {
          if (isNoise) return 0; // endless ambience loops
          setTimeout(() => selectTrack((trackIndex + 1) % queue.length, true), 0);
          return 0;
        }
        return next;
      });
    }, 500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, simulated, isNoise, trackId, duration]);

  // ── sleep timer ──
  useEffect(() => {
    if (sleepMin == null) return;
    const t = setInterval(() => {
      const left = Math.max(
        0,
        Math.round(((sleepEndRef.current ?? 0) - Date.now()) / 1000),
      );
      setSleepLeft(left);
      if (left <= 0) {
        setPlaying(false);
        setSleepMin(null);
        sleepEndRef.current = null;
      }
    }, 1000);
    return () => clearInterval(t);
  }, [sleepMin]);

  const selectTrack = useCallback(
    (idx: number, autoplay = false) => {
      const t = queue[idx];
      if (!t) return;
      setTrackId(t.id);
      setElapsed(0);
      if (autoplay) setPlaying(true);
      saveState({ trackId: t.id });
    },
    [queue],
  );

  const stepTrack = useCallback(
    (d: 1 | -1) => {
      if (queue.length === 0) return;
      staticBurst();
      selectTrack((trackIndex + d + queue.length) % queue.length, true);
    },
    [queue.length, trackIndex, selectTrack, staticBurst],
  );

  const togglePlay = useCallback(() => {
    if (track) setPlaying((p) => !p);
  }, [track]);

  // Space = play/pause · Esc = exit theater
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "Escape") {
        setTheater(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay]);

  // ── mood filter: retheme the whole site + channel-change static ──
  const pickMood = useCallback(
    (m: string) => {
      if (m === mood) return;
      staticBurst();
      setMood(m);
      setTheme(moodTheme(m));
      const q = filterTracks(m);
      setTrackId(q[0]?.id ?? null);
      setElapsed(0);
      saveState({ mood: m, trackId: q[0]?.id ?? null });
    },
    [mood, staticBurst, setTheme],
  );

  // ── theater mode (overlay + best-effort native fullscreen) ──
  const openTheater = () => {
    setTheater(true);
    try {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } catch {
      /* overlay still works */
    }
  };
  const closeTheater = useCallback(() => {
    setTheater(false);
    try {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    } catch {
      /* ignore */
    }
  }, []);

  const seek = (ratio: number) => {
    const sec = ratio * duration;
    setElapsed(sec);
    const a = audioRef.current;
    if (a && !simulated) a.currentTime = sec; // element ⇒ music track
  };

  const pickSleep = (min: number | null) => {
    setSleepMin(min);
    if (min == null) {
      sleepEndRef.current = null;
      setSleepLeft(0);
    } else {
      sleepEndRef.current = Date.now() + min * 60_000;
      setSleepLeft(min * 60);
    }
  };

  if (!ready) {
    return (
      <main className="flex min-h-full flex-col">
        <StatusBar callsign={CALLSIGN} />
        <div className="flex flex-1 items-center justify-center">
          <p className="hud-label">
            TUNING <span className="animate-blink text-glow">▮</span>
          </p>
        </div>
      </main>
    );
  }

  const noSignal = track?.category === "music" && simulated;
  const sourceTag = isNoise ? "SYNTH ENGINE" : noSignal ? "NO SIGNAL" : "LIVE TAPE";

  const moodChips = (compact = false) => (
    <div className={`grid grid-cols-4 gap-1.5 ${compact ? "sm:grid-cols-7" : ""}`}>
      {["ALL", ...MOODS].map((m) => (
        <button
          key={m}
          onClick={() => pickMood(m)}
          className={`flex items-center justify-center gap-1.5 border px-1 py-2 font-pixel text-[11px] tracking-widest transition-colors duration-150 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-glow ${
            mood === m
              ? "border-glow bg-glow text-void"
              : "border-line text-ice hover:border-linehi hover:bg-panel2"
          }`}
        >
          <MoodIcon mood={m} />
          <span>{m}</span>
        </button>
      ))}
    </div>
  );

  return (
    <main className="relative flex min-h-full flex-col pt-5 sm:h-full sm:pt-6">
      <StatusBar
        callsign={CALLSIGN}
        tags={[isNoise ? "SCENE NOISE" : "FOCUS MUSIC", mood]}
      />

      {/* below the status bar: stacked on phones, two columns on ≥sm,
          row vertically centered (slack = clean overscan margin) */}
      <div className="term-in flex flex-1 flex-col px-4 py-4 sm:min-h-0 sm:justify-center sm:px-5">
      <div className="flex flex-col gap-4 sm:relative sm:flex-row sm:gap-5">
        {/* ── LEFT: TV area (square ≈54% of interior width, defines row height) ── */}
        {track && (
          <div className="sm:w-[54%] sm:shrink-0">
            <HudPanel active className="w-full overflow-hidden">
              <div className="relative aspect-square w-full bg-panel2">
                <VisualFeed
                  track={track}
                  mood={mood}
                  playing={playing}
                  noSignal={noSignal}
                  themeKey={theme}
                />
                <span className="font-pixel glow-text absolute bottom-2 left-3 text-xs tracking-widest text-ice/90">
                  {formatTime(elapsed)}
                </span>
                <span className="font-pixel glow-text absolute right-3 bottom-2 text-xs tracking-widest text-ice/90">
                  {isNoise ? "∞ LOOP" : formatTime(Math.max(0, duration - elapsed))}
                </span>
                <span className="hud-label absolute top-2 left-3 text-[8px]">
                  ▪ {noSignal ? "CH.-- NO SIGNAL" : `VIS.FEED // ${mood}`}
                </span>
                <span className="absolute top-2 right-3">
                  <Equalizer playing={playing} />
                </span>
                <button
                  onClick={openTheater}
                  className="btn-hud absolute right-2 bottom-2 bg-void/60 px-2 py-1 text-[9px]"
                  aria-label="fullscreen theater mode"
                >
                  ⛶ FULL
                </button>
              </div>
            </HudPanel>
          </div>
        )}

        {/* ── RIGHT: control area — taken OUT of the row's height computation
               (absolute, inset-y-0) so its definite height = the square side.
               Playlist flex-1 min-h-0 scrolls internally; top/bottom flush. ── */}
        <div className="thin-scroll flex flex-col gap-4 sm:absolute sm:inset-y-0 sm:right-0 sm:w-[calc(46%-1.25rem)] sm:min-h-0 sm:overflow-y-auto sm:pr-1">
        {/* ── MOOD SELECT ── */}
        <section>
          <p className="hud-label mb-2 text-[9px]">
            ▪ MOOD SELECT {mood !== "ALL" && <span className="animate-blink text-glow">▮</span>}
          </p>
          {moodChips()}
        </section>

        {/* ── PLAYLIST ── */}
        <section className="min-h-0 sm:flex sm:flex-1 sm:flex-col">
          <p className="hud-label mb-2 text-[9px]">
            ▪ PLAYLIST // {queue.length} CH ·{" "}
            <span className="text-ice/70">SPACE = PLAY/PAUSE</span>
          </p>
          {queue.length === 0 ? (
            <div className="border border-line bg-panel/60 px-3 py-6 text-center">
              <p className="font-pixel text-[10px] tracking-widest text-dim">
                NO BROADCAST ON THIS CHANNEL <span className="animate-blink">▮</span>
              </p>
            </div>
          ) : (
            <ul className="queue-scroll max-h-44 overflow-y-auto border border-line bg-panel/60 sm:max-h-none sm:flex-1">
              {queue.map((t, i) => {
                const activeTrack = t.id === trackId;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => {
                        staticBurst();
                        selectTrack(i, true);
                      }}
                      className={`flex w-full items-center gap-3 border-b border-line/50 px-3 py-2.5 text-left transition-colors last:border-b-0 ${
                        activeTrack ? "bg-panel2" : "hover:bg-panel2/60"
                      }`}
                    >
                      <span
                        className={`font-pixel w-7 shrink-0 text-[10px] tracking-widest ${
                          activeTrack ? "text-glow" : "text-dim"
                        }`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-[11px] tracking-widest ${
                            activeTrack ? "text-ice" : "text-fg/80"
                          }`}
                        >
                          {activeTrack && playing ? "▮ " : ""}
                          {t.title}
                        </span>
                        <span className="hud-label block truncate text-[8px]">
                          {t.artist} · {t.category === "noise" ? "SYNTH" : "TAPE"}
                        </span>
                      </span>
                      {activeTrack && <Equalizer playing={playing} bars={4} />}
                      <span className="font-pixel shrink-0 text-[9px] tracking-widest text-dim">
                        {t.category === "noise" ? "LOOP" : formatTime(t.duration)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── PLAY CONTROLS ── */}
        {track && (
          <section className="flex flex-col gap-3">
            {/* track info */}
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="hud-label text-[9px]">
                  ▮ NOW PLAYING <span className="text-ice/70">// {sourceTag}</span>
                </p>
                <h1 className="font-pixel glow-text mt-1 truncate text-base font-bold tracking-wider text-ice">
                  {track.title}
                </h1>
                <p className="hud-label mt-0.5 truncate">{track.artist}</p>
              </div>
              <span className="hud-label shrink-0 border border-line px-2 py-1 text-ice/80">
                {track.mood}
              </span>
            </div>

            {/* segmented seek */}
            <div>
              <SegmentedBar
                ratio={duration > 0 ? elapsed / duration : 0}
                segments={56}
                height={14}
                onChange={seek}
                label="seek"
              />
              <div className="mt-1 flex justify-between">
                <span className="font-pixel text-[10px] tracking-widest text-dim">
                  {formatTime(elapsed)}
                </span>
                <span className="font-pixel text-[10px] tracking-widest text-dim">
                  -{isNoise ? "--:--" : formatTime(Math.max(0, duration - elapsed))}
                </span>
              </div>
            </div>

            {/* transport */}
            <div className="grid grid-cols-[1fr_1.6fr_1fr] items-stretch gap-2">
              <button
                onClick={() => stepTrack(-1)}
                className="btn-hud py-2.5 text-xs"
                aria-label="previous track"
              >
                ◂◂ PREV
              </button>
              <button
                onClick={togglePlay}
                className={`btn-hud py-2.5 text-sm ${playing ? "bg-glow text-void border-glow" : ""}`}
                aria-label={playing ? "pause" : "play"}
              >
                {playing ? "▮▮ PAUSE" : "◂ PLAY ▸"}
              </button>
              <button
                onClick={() => stepTrack(1)}
                className="btn-hud py-2.5 text-xs"
                aria-label="next track"
              >
                NEXT ▸▸
              </button>
            </div>

            {/* volume + sleep */}
            <div className="grid grid-cols-2 gap-4 pb-1">
              <div>
                <p className="hud-label mb-2 text-[9px]">
                  ▪ VOL <span className="text-ice">{Math.round(volume * 100)}%</span>
                </p>
                <SegmentedBar
                  ratio={volume}
                  segments={20}
                  height={10}
                  onChange={(r) => setVolume(r)}
                  label="volume"
                />
              </div>
              <div>
                <p className="hud-label mb-2 text-[9px]">
                  ▪ SLEEP{" "}
                  <span className="text-ice">
                    {sleepMin != null ? formatTime(sleepLeft) : "OFF"}
                  </span>
                </p>
                <div className="flex gap-1.5">
                  {SLEEP_OPTIONS.map((m) => (
                    <button
                      key={m}
                      onClick={() => pickSleep(sleepMin === m ? null : m)}
                      className={`flex-1 border px-1 py-1 font-pixel text-[9px] tracking-widest transition-colors ${
                        sleepMin === m
                          ? "border-glow bg-glow text-void"
                          : "border-line text-dim hover:border-linehi hover:text-ice"
                      }`}
                    >
                      {m}M
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
        </div>
      </div>
      </div>

      {/* ── THEATER MODE ── */}
      {theater && track && (
        <div
          className="fixed inset-0 z-50 bg-black"
          data-theme={theme}
          role="dialog"
          aria-label="fullscreen theater"
        >
          {/* full-bleed mood visual */}
          <div className="absolute inset-0">
            <VisualFeed
              track={track}
              mood={mood}
              playing={playing}
              noSignal={noSignal}
              themeKey={theme}
            />
          </div>
          {/* CRT texture on the theater too */}
          <div className="crt-layer ovl-scanlines opacity-40" aria-hidden />
          <div className="crt-layer ovl-vignette" aria-hidden />
          {/* bottom darkening for the panel */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5"
            style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.82))" }}
            aria-hidden
          />

          {/* stretched control panel, lower-center */}
          <div className="absolute inset-x-0 bottom-0 flex justify-center px-3 pb-4 sm:pb-6">
            <div className="flex w-full max-w-3xl flex-col gap-3 border border-line bg-void/70 p-4 backdrop-blur-sm">
              {/* info + exit */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="hud-label text-[8px]">
                    ▮ {sourceTag} · {mood}
                  </p>
                  <p className="font-pixel glow-text truncate text-sm font-bold tracking-wider text-ice">
                    {track.title}
                  </p>
                  <p className="hud-label truncate text-[9px]">{track.artist}</p>
                </div>
                <button
                  onClick={closeTheater}
                  className="btn-hud shrink-0 px-3 py-2 text-[10px]"
                  aria-label="exit theater"
                >
                  ✕ EXIT
                </button>
              </div>

              {/* seek */}
              <div>
                <SegmentedBar
                  ratio={duration > 0 ? elapsed / duration : 0}
                  segments={72}
                  height={12}
                  onChange={seek}
                  label="seek"
                />
                <div className="mt-1 flex justify-between">
                  <span className="font-pixel text-[10px] tracking-widest text-dim">
                    {formatTime(elapsed)}
                  </span>
                  <span className="font-pixel text-[10px] tracking-widest text-dim">
                    -{isNoise ? "--:--" : formatTime(Math.max(0, duration - elapsed))}
                  </span>
                </div>
              </div>

              {/* transport + volume + sleep, one stretched row */}
              <div className="grid grid-cols-[auto_auto_auto_1fr_auto] items-center gap-3">
                <button onClick={() => stepTrack(-1)} className="btn-hud px-3 py-2 text-xs" aria-label="previous track">
                  ◂◂
                </button>
                <button
                  onClick={togglePlay}
                  className={`btn-hud px-5 py-2 text-xs ${playing ? "bg-glow text-void border-glow" : ""}`}
                  aria-label={playing ? "pause" : "play"}
                >
                  {playing ? "▮▮" : "▶"}
                </button>
                <button onClick={() => stepTrack(1)} className="btn-hud px-3 py-2 text-xs" aria-label="next track">
                  ▸▸
                </button>
                <SegmentedBar
                  ratio={volume}
                  segments={24}
                  height={8}
                  onChange={(r) => setVolume(r)}
                  label="volume"
                />
                <div className="flex gap-1">
                  {SLEEP_OPTIONS.map((m) => (
                    <button
                      key={m}
                      onClick={() => pickSleep(sleepMin === m ? null : m)}
                      className={`border px-1.5 py-1 font-pixel text-[8px] tracking-widest transition-colors ${
                        sleepMin === m
                          ? "border-glow bg-glow text-void"
                          : "border-line text-dim hover:border-linehi hover:text-ice"
                      }`}
                    >
                      {m}M
                    </button>
                  ))}
                </div>
              </div>

              {/* mood chips — switch without leaving the theater */}
              {moodChips(true)}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

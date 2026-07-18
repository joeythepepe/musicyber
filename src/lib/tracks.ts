// ─────────────────────────────────────────────────────────────
// CHILL//OS — track library (mood-only)
//
// Moods are the ONLY filter — every track carries a `mood` tag,
// and the mood chips ("ALL" or one of MOODS) filter the whole
// library into one mixed playlist. The per-track `category` tag
// ("noise" | "music") selects playback behavior: "noise" tracks
// play through the live Web Audio synth engine (no files needed),
// "music" tracks play through the tape deck (<audio> element with
// simulated NO SIGNAL fallback).
//
// TO ADD YOUR MUSIC:
//   1. Drop audio files into  public/audio/focus/   (focus music)
//      or                       public/audio/scene/  (recorded ambiences)
//   2. Update the `src` paths below to match your filenames.
//   3. Adjust `duration` (seconds) so the progress bar is accurate
//      even before the file loads.
//
// TO ADD SCENE ART (pictures shown inside the CRT screen):
//   1. Drop images into  public/art/   (square-ish works best)
//   2. Set `art: "/art/<name>.png"` on the tracks below.
//   Until an image exists/loads, the player falls back to the
//   generated pixel animation.
// ─────────────────────────────────────────────────────────────

/** playback behavior of a track: synth engine vs tape deck */
export type Category = "noise" | "music";

export type NoiseVariant =
  | "rain"
  | "storm"
  | "cafe"
  | "forest"
  | "ocean"
  | "deepspace";

export type VisualKind = "rain" | "stars" | "wave" | "drive";

/** global mood list — chips on the main screen ("ALL" = no filter) */
export const MOODS = ["CALM", "NIGHT", "RAIN", "DEEP", "DREAM", "DRIVE"];

/** mood → site-wide theme key (matches [data-theme] in globals.css) */
export function moodTheme(mood: string): string {
  switch (mood) {
    case "RAIN":
    case "CALM":
    case "DEEP":
    case "DREAM":
    case "DRIVE":
      return mood.toLowerCase();
    default:
      return "ice"; // ALL · NIGHT
  }
}

/** mood → generated pixel animation for the visual panel */
export function moodVisual(mood: string): VisualKind {
  switch (mood) {
    case "RAIN":
      return "rain";
    case "NIGHT":
    case "DEEP":
      return "stars";
    case "DRIVE":
      return "drive";
    default:
      return "wave"; // ALL · CALM · DREAM
  }
}

// ─────────────────────────────────────────────────────────────
// MOOD COVERS — pixel loop art for the visual panel + theater.
// Drop files into public/covers/ and register them here.
// Priority per mood: video loop → image (gif/png) → generated
// pixel animation. Example:
//   RAIN: { video: "/covers/rain-loop.mp4" },
//   CALM: { img: "/covers/calm-forest.gif" },
// ─────────────────────────────────────────────────────────────
export const MOOD_COVERS: Record<string, { img?: string; video?: string }> = {
  // CALM: { img: "/covers/calm.gif" },
  // NIGHT: { video: "/covers/night-loop.mp4" },
  // RAIN: { video: "/covers/rain-loop.mp4" },
  // DEEP: { img: "/covers/deep.png" },
  // DREAM: { video: "/covers/dream-loop.mp4" },
  // DRIVE: { video: "/covers/drive-loop.mp4" },
};

export interface Track {
  id: string;
  title: string;
  artist: string;
  /** global mood tag (one of MOODS) */
  mood: string;
  category: Category;
  /** path under public/ — placeholder until you upload real files */
  src: string;
  /** seconds — drives the simulated fallback when src is missing */
  duration: number;
  visual: VisualKind;
  /** noise category only: which synth patch to use */
  engine?: NoiseVariant;
  /** optional scene art, e.g. "/art/rain-window.png" (public/art/) */
  art?: string;
}

// ─── builders ────────────────────────────────────────────────
const music = (
  mood: string,
  visual: VisualKind,
  rows: Array<[string, string, string, string, number, string?]>,
): Track[] =>
  rows.map(([id, title, artist, file, duration, art]) => ({
    id,
    title,
    artist,
    mood,
    category: "music",
    src: `/audio/focus/${file}`,
    duration,
    visual,
    art,
  }));

const scene = (
  mood: string,
  variant: NoiseVariant,
  visual: VisualKind,
  rows: Array<[string, string]>,
): Track[] =>
  rows.map(([id, title], i) => ({
    id,
    title,
    artist: "CHILL//OS ENGINE",
    mood,
    category: "noise",
    src: `/audio/scene/${variant}-0${i + 1}.mp3`, // optional recorded override
    duration: 3600, // endless ambience — 60 min virtual loop
    visual,
    engine: variant,
  }));

// ─── the library ─────────────────────────────────────────────
export const TRACKS: Track[] = [
  // ── noise scenes (synthesized) ──
  ...scene("RAIN", "rain", "rain", [
    ["rain-soft", "RAIN // SOFT WINDOW"],
    ["rain-roof", "RAIN // ROOFTOP"],
    ["rain-street", "RAIN // EMPTY STREET"],
  ]),
  ...scene("DEEP", "storm", "rain", [
    ["storm-far", "STORM // DISTANT THUNDER"],
    ["storm-front", "STORM // FRONT PASSING"],
  ]),
  ...scene("NIGHT", "cafe", "wave", [["cafe-night", "CAFE // LATE SHIFT"]]),
  ...scene("RAIN", "cafe", "wave", [["cafe-rainy", "CAFE // RAINY TUESDAY"]]),
  ...scene("CALM", "forest", "wave", [
    ["forest-wind", "FOREST // CANOPY WIND"],
    ["forest-night", "FOREST // NIGHT FLOOR"],
  ]),
  ...scene("DREAM", "ocean", "wave", [
    ["ocean-swell", "OCEAN // SLOW SWELL"],
    ["ocean-shore", "OCEAN // NIGHT SHORE"],
  ]),
  ...scene("DEEP", "deepspace", "stars", [
    ["space-drift", "DEEP SPACE // DRIFT"],
    ["space-hull", "DEEP SPACE // HULL HUM"],
  ]),

  // ── focus music (needs files in public/audio/focus/) ──
  ...music("CALM", "wave", [
    ["calm-01", "LOW TIDE", "FIELD MEMORY", "ambient-calm-01.mp3", 214],
    ["calm-02", "PAPER GARDEN", "KUROI", "piano-calm-01.mp3", 187],
    ["calm-03", "SLOW CIRCUIT", "AERIAL STATIC", "ambient-calm-02.mp3", 243],
    ["calm-04", "MORNING SIGNAL", "VANTA HALL", "lofi-calm-01.mp3", 176],
  ]),
  ...music("NIGHT", "stars", [
    ["night-01", "MIDNIGHT PROTOCOL", "NEON DRIFT", "lofi-night-01.mp3", 201, "/art/midnight-protocol.png"],
    ["night-02", "SODIUM LIGHTS", "GHOST FREQUENCY", "synthwave-night-01.mp3", 232],
    ["night-03", "03:47 AM", "KUROI", "piano-night-01.mp3", 168],
    ["night-04", "SLEEPWALKER", "LOW ORBIT", "lofi-night-02.mp3", 219],
  ]),
  ...music("RAIN", "rain", [
    ["mrain-01", "WET PAVEMENT", "AERIAL STATIC", "lofi-rain-01.mp3", 195],
    ["mrain-02", "UMBRELLA DISTRICT", "NEON DRIFT", "lofi-rain-02.mp3", 208],
    ["mrain-03", "DRIP FEED", "FIELD MEMORY", "ambient-rain-01.mp3", 254],
    ["mrain-04", "WINDOW SEAT", "VANTA HALL", "piano-rain-01.mp3", 183],
  ]),
  ...music("DEEP", "stars", [
    ["deep-01", "PRESSURE SUIT", "LOW ORBIT", "drone-deep-01.mp3", 301],
    ["deep-02", "ABYSSAL PLAIN", "GHOST FREQUENCY", "drone-deep-02.mp3", 342],
    ["deep-03", "SIGNAL DECAY", "AERIAL STATIC", "ambient-deep-01.mp3", 276],
  ]),
  ...music("DREAM", "wave", [
    ["dream-01", "LUCID TERMINAL", "VANTA HALL", "ambient-dream-01.mp3", 227],
    ["dream-02", "SOFT FOCUS", "KUROI", "piano-dream-01.mp3", 194],
    ["dream-03", "HYPNOGAZER", "FIELD MEMORY", "drone-dream-01.mp3", 288],
    ["dream-04", "MILK GLASS", "LOW ORBIT", "lofi-dream-01.mp3", 172],
  ]),
  ...music("DRIVE", "stars", [
    ["drive-01", "NIGHT EXPRESSWAY", "NEON DRIFT", "synthwave-drive-01.mp3", 213],
    ["drive-02", "CHROME VEINS", "GHOST FREQUENCY", "synthwave-drive-02.mp3", 236],
    ["drive-03", "OVERDRIVE CITY", "NEON DRIFT", "synthwave-drive-03.mp3", 198],
    ["drive-04", "LAST EXIT", "LOW ORBIT", "synthwave-drive-04.mp3", 221],
  ]),
];

/** playlist for a mood chip — noise scenes and music tracks mixed */
export function filterTracks(mood: string): Track[] {
  return TRACKS.filter((t) => mood === "ALL" || t.mood === mood);
}

export function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

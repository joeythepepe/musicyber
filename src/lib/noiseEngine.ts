"use client";

// ─────────────────────────────────────────────────────────────
// CHILL//OS — Web Audio noise engine (no audio files needed)
//
// Synthesizes environment ambience from filtered noise:
//   rain  → white noise through a bandpass "patter" filter + gain flutter
//   storm → brown noise through a deep lowpass, slow heavy swell
//   cafe  → pink noise through a warm lowpass (muffled crowd murmur)
//   forest→ pink noise through a gentle bandpass, slow wind LFO
//   ocean → brown noise through a lowpass whose cutoff swells slowly
//   deepspace → brown noise through a very deep lowpass, near-static hum
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import type { NoiseVariant } from "./tracks";

interface Patch {
  noise: "white" | "pink" | "brown";
  filterType: BiquadFilterType;
  freq: number;
  q: number;
  gain: number; // base output level (before user volume)
  lfoRate: number; // Hz — slow modulation speed
  lfoToFreq: number; // Hz of cutoff wobble
  lfoToGain: number; // amplitude wobble (fraction of patch gain)
}

const PATCHES: Record<NoiseVariant, Patch> = {
  rain: {
    noise: "white",
    filterType: "bandpass",
    freq: 2400,
    q: 0.6,
    gain: 0.5,
    lfoRate: 0.9,
    lfoToFreq: 500,
    lfoToGain: 0.25,
  },
  storm: {
    noise: "brown",
    filterType: "lowpass",
    freq: 320,
    q: 0.4,
    gain: 0.9,
    lfoRate: 0.08,
    lfoToFreq: 160,
    lfoToGain: 0.45,
  },
  cafe: {
    noise: "pink",
    filterType: "lowpass",
    freq: 950,
    q: 0.3,
    gain: 0.55,
    lfoRate: 0.3,
    lfoToFreq: 180,
    lfoToGain: 0.18,
  },
  forest: {
    noise: "pink",
    filterType: "bandpass",
    freq: 620,
    q: 0.5,
    gain: 0.5,
    lfoRate: 0.13,
    lfoToFreq: 320,
    lfoToGain: 0.4,
  },
  ocean: {
    noise: "brown",
    filterType: "lowpass",
    freq: 460,
    q: 0.4,
    gain: 0.8,
    lfoRate: 0.1,
    lfoToFreq: 300,
    lfoToGain: 0.5,
  },
  deepspace: {
    noise: "brown",
    filterType: "lowpass",
    freq: 170,
    q: 0.2,
    gain: 0.85,
    lfoRate: 0.05,
    lfoToFreq: 60,
    lfoToGain: 0.15,
  },
};

function makeNoiseBuffer(
  ctx: AudioContext,
  type: "white" | "pink" | "brown",
): AudioBuffer {
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);

  if (type === "white") {
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  } else if (type === "pink") {
    // Paul Kellet's economical pink filter
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else {
    // brown (red) noise — integrated white noise with leakage
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return buf;
}

// ─── one-shot channel-change static click ────────────────────
let clickCtx: AudioContext | null = null;

/** ~150ms white-noise burst + tiny pop. Fire-and-forget. */
export function playStaticClick(volume = 0.5) {
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    clickCtx ??= new AC();
    const ctx = clickCtx;
    if (ctx.state === "suspended") void ctx.resume();

    const dur = 0.15;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.6);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = Math.max(0.05, volume) * 0.5;
    src.connect(g).connect(ctx.destination);
    src.start();

    // tiny "pop" at the tail
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.05);
    const og = ctx.createGain();
    og.gain.setValueAtTime(volume * 0.18, ctx.currentTime);
    og.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
    o.connect(og).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.07);
  } catch {
    /* audio blocked or unavailable — stay silent */
  }
}

interface Graph {
  src: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  patchGain: GainNode;
  lfo: OscillatorNode;
  lfoFreqGain: GainNode;
  lfoGainGain: GainNode;
}

/**
 * Plays a synthesized ambience patch while `playing` is true.
 * `volume` is 0..1 and always affects output.
 */
export function useNoiseEngine(
  variant: NoiseVariant | null,
  playing: boolean,
  volume: number,
) {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const graphRef = useRef<Graph | null>(null);

  const teardownGraph = () => {
    const g = graphRef.current;
    if (!g) return;
    try {
      g.lfo.stop();
      g.src.stop();
    } catch {
      /* already stopped */
    }
    g.src.disconnect();
    g.filter.disconnect();
    g.patchGain.disconnect();
    g.lfo.disconnect();
    g.lfoFreqGain.disconnect();
    g.lfoGainGain.disconnect();
    graphRef.current = null;
  };

  const buildGraph = (ctx: AudioContext, master: GainNode, v: NoiseVariant) => {
    const p = PATCHES[v];
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx, p.noise);
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = p.filterType;
    filter.frequency.value = p.freq;
    filter.Q.value = p.q;

    const patchGain = ctx.createGain();
    patchGain.gain.value = p.gain;

    // slow LFO → filter cutoff + amplitude swell
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = p.lfoRate;
    const lfoFreqGain = ctx.createGain();
    lfoFreqGain.gain.value = p.lfoToFreq;
    const lfoGainGain = ctx.createGain();
    lfoGainGain.gain.value = p.gain * p.lfoToGain;

    lfo.connect(lfoFreqGain).connect(filter.frequency);
    lfo.connect(lfoGainGain).connect(patchGain.gain);
    src.connect(filter).connect(patchGain).connect(master);

    src.start();
    lfo.start();
    graphRef.current = { src, filter, patchGain, lfo, lfoFreqGain, lfoGainGain };
  };

  // start / stop with `playing` + rebuild when the scene changes
  useEffect(() => {
    if (!playing || !variant) {
      teardownGraph();
      if (ctxRef.current && ctxRef.current.state === "running") {
        void ctxRef.current.suspend();
      }
      return;
    }

    if (!ctxRef.current) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctxRef.current = new AC();
      const master = ctxRef.current.createGain();
      master.connect(ctxRef.current.destination);
      masterRef.current = master;
    }

    const ctx = ctxRef.current;
    void ctx.resume();
    teardownGraph();
    buildGraph(ctx, masterRef.current!, variant);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, variant]);

  // live volume
  useEffect(() => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    master.gain.setTargetAtTime(Math.pow(volume, 1.6) * 0.9, ctx.currentTime, 0.05);
  }, [volume, playing]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      teardownGraph();
      if (ctxRef.current) void ctxRef.current.close();
      ctxRef.current = null;
      masterRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

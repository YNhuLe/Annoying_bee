"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

type BuzzParams = {
  /** 0..1 */
  proximity: number;
  /** when user actually tries to click Decline */
  explode?: boolean;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function useBeeBuzz(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);
  const lfoGainRef = useRef<GainNode | null>(null);

  const ensure = useCallback(() => {
    if (ctxRef.current) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 180;

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 28;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 14;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    osc.connect(master);
    osc.start();
    lfo.start();

    ctxRef.current = ctx;
    masterRef.current = master;
    oscRef.current = osc;
    lfoRef.current = lfo;
    lfoGainRef.current = lfoGain;
  }, []);

  useEffect(() => {
    if (!enabled) {
      const ctx = ctxRef.current;
      const master = masterRef.current;
      if (ctx && master) {
        const now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setTargetAtTime(0, now, 0.06);
      }
    }
  }, [enabled]);

  const update = useCallback(
    ({ proximity, explode }: BuzzParams) => {
      if (!enabled) return;
      ensure();
      const ctx = ctxRef.current!;
      const master = masterRef.current!;
      const osc = oscRef.current!;
      const lfo = lfoRef.current!;
      const lfoGain = lfoGainRef.current!;

      if (ctx.state === "suspended") {
        // must be called from user gesture; pointer events qualify in most browsers
        void ctx.resume();
      }

      const p = clamp01(proximity);
      const now = ctx.currentTime;

      const baseFreq = 180 + p * 200; // 180 -> 380
      const baseGain = 0.05 + p * 0.75; // 0.05 -> 0.8

      const lfoHz = 22 + p * 26; // more aggressive buzz
      const lfoDepth = 10 + p * 40;

      osc.frequency.cancelScheduledValues(now);
      osc.frequency.setTargetAtTime(baseFreq, now, 0.03);

      lfo.frequency.cancelScheduledValues(now);
      lfo.frequency.setTargetAtTime(lfoHz, now, 0.05);

      lfoGain.gain.cancelScheduledValues(now);
      lfoGain.gain.setTargetAtTime(lfoDepth, now, 0.05);

      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(baseGain, now, 0.05);

      if (explode) {
        // short, nasty spike
        master.gain.setTargetAtTime(1.0, now, 0.005);
        osc.frequency.setTargetAtTime(520, now, 0.005);
        lfo.frequency.setTargetAtTime(55, now, 0.01);
        lfoGain.gain.setTargetAtTime(90, now, 0.01);

        master.gain.setTargetAtTime(baseGain, now + 0.12, 0.06);
        osc.frequency.setTargetAtTime(baseFreq, now + 0.12, 0.06);
      }
    },
    [enabled, ensure],
  );

  const api = useMemo(() => ({ update }), [update]);
  return api;
}


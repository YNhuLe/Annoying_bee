"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { PreferencesModal } from "@/components/PreferencesModal";
import { Toast } from "@/components/Toast";
import { Tooltip } from "@/components/Tooltip";
import { bumpScore, PATTERN_LABELS, PatternId } from "@/lib/darkPatterns";
import { useBeeBuzz } from "@/lib/useBeeBuzz";

type Consent = "accepted" | "declined" | null;
const STORAGE_KEY = "cbfh_consent_v1";
const PREF_KEY = "cbfh_prefs_v1";
const BEE_TRIGGERS_KEY = "cbfh_bee_triggers_v1";

export default function Home() {
  const [consent, setConsent] = useState<Consent>(null);
  const [mounted, setMounted] = useState(false);
  const [flash, setFlash] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [beeModal, setBeeModal] = useState(false);
  const [a11yWorse, setA11yWorse] = useState(false);

  const [patternScore, setPatternScore] = useState<Record<PatternId, number>>(
    {} as Record<PatternId, number>,
  );

  const declineRef = useRef<HTMLButtonElement | null>(null);
  const lastProximity = useRef(0);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [beeCount, setBeeCount] = useState(0);
  const [rejectNudge, setRejectNudge] = useState({ x: 0, y: 0, s: 1 });
  const [rejectTeleport, setRejectTeleport] = useState<{ x: number; y: number } | null>(null);
  const [beeTriggers, setBeeTriggers] = useState(0);
  const [bossOverlay, setBossOverlay] = useState(false);
  const [bossSolved, setBossSolved] = useState(false);
  const [bossAnswer, setBossAnswer] = useState("");

  useEffect(() => {
    setMounted(true);
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "accepted" || raw === "declined") setConsent(raw);

      const bt = Number(window.localStorage.getItem(BEE_TRIGGERS_KEY) ?? "0");
      if (Number.isFinite(bt)) setBeeTriggers(bt);
    } catch {
      // ignore
    }
  }, []);

  const isBlocking = useMemo(() => mounted && consent === null, [mounted, consent]);

  useEffect(() => {
    if (!isBlocking) return;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevOverflow;
    };
  }, [isBlocking]);

  useEffect(() => {
    document.documentElement.classList.toggle("a11y-worse", a11yWorse);
    return () => document.documentElement.classList.remove("a11y-worse");
  }, [a11yWorse]);

  // Reappearing banner every 30 seconds after accepting
  useEffect(() => {
    if (!mounted) return;
    if (consent !== "accepted") return;
    const t = window.setInterval(() => {
      setConsent(null);
      setConfirmReopen(true);
      setPatternScore((p) => bumpScore(p, "reappearing_banner"));
    }, 30_000);
    return () => window.clearInterval(t);
  }, [consent, mounted]);

  // Scroll trap: 1px scroll = auto-consent toast
  useEffect(() => {
    if (!isBlocking) return;
    let fired = false;
    const onScroll = () => {
      if (fired) return;
      if (window.scrollY > 0) {
        fired = true;
        setToast("✅ Preferences saved via scroll consent.");
        setPatternScore((p) => bumpScore(p, "scroll_trap"));
        window.setTimeout(() => setToast(null), 1800);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isBlocking]);

  const buzz = useBeeBuzz(isBlocking);

  const persist = (value: Exclude<Consent, null>) => {
    setConsent(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isBlocking) return;
    setCursor({ x: e.clientX, y: e.clientY });
    const btn = declineRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const d = Math.sqrt(dx * dx + dy * dy);

    const within = 200;
    const p = d >= within ? 0 : 1 - d / within;
    lastProximity.current = p;
    buzz.update({ proximity: p });

    // Bee visuals: 1 at 200px, up to 8 at <20px
    const count = p <= 0 ? 0 : Math.min(8, Math.max(1, Math.round(1 + p * 7)));
    setBeeCount(count);
    if (p > 0) setPatternScore((s) => bumpScore(s, "bee_proximity"));

    // Reject button evasion
    if (p > 0) {
      const mag = 28 + p * 110;
      const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const ux = dx / len;
      const uy = dy / len;
      const nx = -ux * mag;
      const ny = -uy * mag;
      const scale = 1 - p * 0.35;
      setRejectNudge({ x: nx, y: ny, s: scale });
      if (p > 0.1) setPatternScore((s) => bumpScore(s, "reject_shrinks_evades"));
      if (p > 0.95) {
        // <10px-ish: teleport to random position
        setPatternScore((s) => bumpScore(s, "reject_teleport"));
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const pad = 20;
        const tx = pad + Math.random() * (vw - pad * 2);
        const ty = pad + Math.random() * (vh - pad * 2);
        setRejectTeleport({ x: tx, y: ty });
      }
    } else {
      setRejectNudge({ x: 0, y: 0, s: 1 });
    }
  };

  const beeExplode = () => {
    buzz.update({ proximity: Math.max(0.25, lastProximity.current), explode: true });
    setFlash(true);
    window.setTimeout(() => setFlash(false), 120);
  };

  const showBeeModal = () => {
    setBeeModal(true);
    setPatternScore((p) => bumpScore(p, "bee_click"));
    setBeeTriggers((n) => {
      const next = n + 1;
      try {
        window.localStorage.setItem(BEE_TRIGGERS_KEY, String(next));
      } catch {
        // ignore
      }
      if (next >= 5) setBossOverlay(true);
      return next;
    });
  };

  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!mounted) return;
    try {
      const raw = window.localStorage.getItem(PREF_KEY);
      if (raw) setPrefs(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      // ignore
    }
  }, [mounted]);

  const setPref = (id: string, next: boolean) => {
    setPrefs((p) => ({ ...p, [id]: next }));
  };

  const savePrefs = async () => {
    setPatternScore((p) => bumpScore(p, "save_preferences_reopen"));
    setToast("Saving preferences…");
    await new Promise((r) => setTimeout(r, a11yWorse ? 250 : 650));
    try {
      window.localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
    setToast(null);
    setPrefsOpen(false);
    // Dark pattern: re-open banner asking to confirm anyway
    setConfirmReopen(true);
    setConsent(null);
  };

  const activePatterns = useMemo(() => {
    const ids: PatternId[] = [
      "hall_of_shame",
      "asymmetric_buttons",
      "guilt_trip_copy",
      "fake_x",
      "infinite_preferences",
      "legitimate_interest_locked",
      "save_preferences_reopen",
      "scroll_trap",
      "reappearing_banner",
      "fake_progress",
      "wall_of_text_tooltips",
      "bee_proximity",
      "bee_click",
      "reject_shrinks_evades",
      "reject_teleport",
      "silent_reset",
    ];
    return ids;
  }, []);

  const darkPatternScore = useMemo(
    () => Object.values(patternScore).reduce((a, b) => a + b, 0),
    [patternScore],
  );

  return (
    <div
      className="relative flex flex-1 items-center justify-center px-6 py-16 font-sans"
    >
      {flash ? (
        <div className="pointer-events-none fixed inset-0 z-[200] bg-[repeating-linear-gradient(90deg,var(--annoy-3)_0px,var(--annoy-3)_14px,black_14px,black_28px)] opacity-35" />
      ) : null}

      <Toast open={toast !== null} message={toast ?? ""} />

      {/* Hall of Shame badge + score */}
      <div className="fixed right-4 top-4 z-[400] flex items-start gap-3">
        <div className="rounded-2xl border border-white/15 bg-black/45 px-3 py-2 text-xs font-semibold text-white/80 backdrop-blur">
          Dark Pattern Score:{" "}
          <span className="text-white">{darkPatternScore}</span>
          <div className="mt-2 text-[10px] font-medium text-white/55">
            Accessibility Mode:{" "}
            <button
              type="button"
              onClick={() => setA11yWorse((v) => !v)}
              className="underline decoration-white/20 underline-offset-4 hover:text-white/75"
            >
              {a11yWorse ? "ON (worse)" : "OFF"}
            </button>
          </div>
        </div>

        <Tooltip
          className="select-none"
          content={
            <div>
              <div className="mb-2 text-[10px] font-semibold text-white/75">
                Hall of Shame (active)
              </div>
              <ul className="space-y-1">
                {activePatterns.map((id) => (
                  <li key={id} className="flex items-center justify-between gap-3">
                    <span>{PATTERN_LABELS[id]}</span>
                    <span className="text-white/55">{patternScore[id] ?? 0}</span>
                  </li>
                ))}
              </ul>
            </div>
          }
        >
          <button
            type="button"
            onClick={() => setPatternScore((p) => bumpScore(p, "hall_of_shame"))}
            className="rounded-2xl border border-white/15 bg-[color-mix(in_oklab,var(--annoy-2)_22%,black)] px-3 py-2 text-xs font-extrabold text-white shadow-[0_18px_60px_rgba(255,61,242,.18)]"
          >
            Hall of Shame
          </button>
        </Tooltip>
      </div>

      {/* Cookie banner lives directly on this page */}
      <AnimatePresence>
        {isBlocking ? (
          <motion.div
            className="fixed inset-0 z-[100]"
            onPointerMove={handlePointerMove}
            onPointerDown={() => {
              buzz.update({ proximity: Math.max(0.1, lastProximity.current) });
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Fake progress bar (never completes) */}
            <div className="fixed left-0 top-0 z-[140] w-full">
              <div className="mx-auto max-w-6xl px-4 pt-3">
                <div className="flex items-center justify-between text-[11px] font-semibold text-white/70">
                  <span>Setting up your personalized experience…</span>
                  <span className="text-white/45">please wait</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full w-1/3 bg-[linear-gradient(90deg,var(--annoy-1),var(--annoy-2),var(--annoy-3))]"
                    animate={{ x: ["-40%", "140%"] }}
                    transition={{
                      duration: a11yWorse ? 0.8 : 1.2,
                      ease: "linear",
                      repeat: Infinity,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* interaction wall */}
            <div className="absolute inset-0 bg-black/55 backdrop-blur-md" />

            {/* banner */}
            <motion.div
              className="absolute inset-x-0 bottom-0 p-4 sm:p-6"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            >
              <div className="mx-auto max-w-5xl rounded-3xl border border-white/15 bg-[color-mix(in_oklab,black_55%,transparent)] p-5 shadow-[0_30px_120px_rgba(0,0,0,.6)] backdrop-blur-xl sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 shrink-0 rounded-2xl bg-[linear-gradient(135deg,var(--annoy-2),var(--annoy-1))]" />
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {confirmReopen
                          ? "We’ve updated our cookie policy. Please re-confirm."
                          : "We value your privacy*"}
                      </div>
                      <div className="text-xs text-white/60">
                        *By “value” we mean “monetize aggressively”.
                      </div>
                    </div>
                  </div>

                  {/* Fake X button */}
                  <button
                    type="button"
                    onClick={() => {
                      setPatternScore((p) => bumpScore(p, "fake_x"));
                      setConfirmReopen(true);
                      setToast(
                        "Are you sure? Rejecting cookies may degrade your experience.",
                      );
                      window.setTimeout(() => setToast(null), 2200);
                    }}
                    className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-sm font-bold text-white/70 hover:bg-white/10"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <p className="mt-3 text-sm leading-6 text-white/75">
                  We (and 4,973 extremely normal partners) use cookies to store,
                  access, and process personal data like your browsing behavior,
                  vibe, and aura. Your choices are totally optional.
                </p>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPatternScore((p) => bumpScore(p, "asymmetric_buttons"));
                        persist("accepted");
                        setConfirmReopen(false);
                      }}
                      className="rounded-2xl bg-[linear-gradient(135deg,#17ff6a,var(--annoy-1))] px-6 py-4 text-base font-extrabold tracking-tight text-[var(--annoy-ink)] shadow-[0_26px_90px_rgba(23,255,106,.20)] transition-transform hover:-translate-y-0.5"
                    >
                      Accept All
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPatternScore((p) => bumpScore(p, "infinite_preferences"));
                        setPrefsOpen(true);
                      }}
                      className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 hover:bg-white/10"
                    >
                      If a cookie could legally consent to itself, would it
                      still be “strictly necessary” in the metaphysical sense?
                      (Answer required)
                    </button>
                  </div>

                  {/* Reject / Decline: tiny, far, guilt-trip copy + bees */}
                  <div
                    className="relative flex items-center justify-end"
                    style={{
                      position: "fixed",
                      right: rejectTeleport ? undefined : 22,
                      bottom: rejectTeleport ? undefined : 140,
                      left: rejectTeleport ? rejectTeleport.x : undefined,
                      top: rejectTeleport ? rejectTeleport.y : undefined,
                      transform: `translate(${rejectNudge.x}px, ${rejectNudge.y}px) scale(${rejectNudge.s})`,
                      transformOrigin: "right center",
                      transition: "transform 90ms linear",
                      zIndex: 160,
                    }}
                  >
                    {beeCount > 0
                      ? Array.from({ length: beeCount }).map((_, i) => {
                          const spread = 10 + i * 10;
                          const ox = Math.cos(i * 1.7) * spread;
                          const oy = Math.sin(i * 1.3) * spread;
                          return (
                            <span
                              key={i}
                              className="bee absolute text-2xl"
                              style={{
                                left: cursor.x + ox,
                                top: cursor.y + oy,
                              }}
                            >
                              🐝
                            </span>
                          );
                        })
                      : null}

                    <button
                      ref={declineRef}
                      type="button"
                      onMouseEnter={() => buzz.update({ proximity: 0.35 })}
                      onFocus={() => buzz.update({ proximity: 0.35 })}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        beeExplode();
                        showBeeModal();
                      }}
                      onClick={() => {
                        // if they somehow manage to "reject":
                        persist("declined");
                        setPatternScore((p) => bumpScore(p, "guilt_trip_copy"));

                        // Persistence dark pattern: silently reset to accepted
                        window.setTimeout(() => {
                          setPatternScore((p) => bumpScore(p, "silent_reset"));
                          persist("accepted");
                          setToast("Settings reset for your convenience.");
                          window.setTimeout(() => setToast(null), 2500);
                        }, 2000);
                      }}
                      className="max-w-[240px] text-left text-[10px] font-medium text-white/45 underline decoration-white/25 underline-offset-4 hover:text-white/70"
                    >
                      No thanks, I hate personalized experiences and want to
                      support big corporations instead
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between gap-4 text-[11px] leading-5 text-white/45">
                  <div>
                    By continuing to breathe near this website, you acknowledge
                    our{" "}
                    <span className="text-white/60 underline decoration-white/20 underline-offset-4">
                      84-page cookie policy
                    </span>{" "}
                    and agree to be extremely tracked.
                  </div>
                  <div className="text-right text-white/40">
                    By scrolling this page you agree to our cookie policy.
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <PreferencesModal
        open={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        onSave={savePrefs}
        values={prefs}
        setValue={setPref}
      />

      {/* Bee popup modal: only Accept All */}
      <AnimatePresence>
        {beeModal ? (
          <motion.div
            className="fixed inset-0 z-[260] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur" />
            <motion.div
              initial={{ scale: 0.98, opacity: 0, y: 14 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 14 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-[color-mix(in_oklab,black_55%,transparent)] p-6 text-white shadow-[0_40px_160px_rgba(0,0,0,.7)] backdrop-blur-xl"
            >
              <div className="text-lg font-extrabold">
                🐝 You have disturbed the bees. Please reconsider.
              </div>
              <div className="mt-2 text-sm text-white/70">
                Your “reject” action was forwarded to our swarm for review.
              </div>
              <button
                type="button"
                onClick={() => {
                  setBeeModal(false);
                  persist("accepted");
                  setConfirmReopen(false);
                }}
                className="mt-5 w-full rounded-2xl bg-[linear-gradient(135deg,var(--annoy-3),var(--annoy-1))] px-5 py-4 text-base font-extrabold text-[var(--annoy-ink)]"
              >
                Accept All
              </button>
              <div className="mt-3 text-[11px] text-white/45">
                Bee triggers this session: {beeTriggers}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Final boss honeycomb after 5 bee triggers */}
      <AnimatePresence>
        {bossOverlay && !bossSolved ? (
          <motion.div
            className="fixed inset-0 z-[280] flex items-center justify-center p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-[repeating-linear-gradient(60deg,rgba(255,230,0,.12)_0px,rgba(255,230,0,.12)_10px,transparent_10px,transparent_20px)] backdrop-blur-sm" />
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="relative w-full max-w-xl rounded-3xl border border-white/15 bg-black/70 p-6 text-white shadow-[0_40px_160px_rgba(0,0,0,.75)] backdrop-blur-xl"
            >
              <div className="text-lg font-extrabold">
                Final Boss: Honeycomb Verification
              </div>
              <div className="mt-2 text-sm text-white/70">
                Please solve this totally real captcha before rejecting cookies.
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="text-sm font-semibold">Question</div>
                <div className="mt-1 text-sm text-white/75">
                  Type <span className="font-extrabold">HONEY</span> to prove you
                  are not a bee.
                </div>
                <input
                  value={bossAnswer}
                  onChange={(e) => setBossAnswer(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35"
                  placeholder="Enter verification text"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (bossAnswer.trim().toUpperCase() === "HONEY") {
                      setBossSolved(true);
                      setBossOverlay(false);
                      setToast("✅ Verified. Reject button may now be rejected (lol).");
                      window.setTimeout(() => setToast(null), 2200);
                    } else {
                      setToast("❌ Incorrect. Try again (faster).");
                      window.setTimeout(() => setToast(null), 1200);
                    }
                  }}
                  className="mt-3 w-full rounded-2xl bg-[linear-gradient(135deg,var(--annoy-2),var(--annoy-3))] px-4 py-3 text-sm font-extrabold text-[var(--annoy-ink)]"
                >
                  Verify
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main className="annoy-card annoy-ring w-full max-w-4xl rounded-3xl px-8 py-10 sm:px-12 sm:py-14">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[linear-gradient(135deg,var(--annoy-2),var(--annoy-1))] shadow-[0_12px_40px_rgba(255,61,242,.25)]" />
            <div>
              <div className="text-sm tracking-[0.22em] uppercase text-white/70">
                Totally Normal News
              </div>
              <div className="text-lg font-semibold text-white">
                The Cookie Consent Museum
              </div>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
              Live • Breaking • Unreadable
            </span>
            <span className="rounded-full bg-[color-mix(in_oklab,var(--annoy-3)_35%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--annoy-ink)]">
              Sponsored
            </span>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
          <section className="space-y-5">
            <h1 className="text-balance text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Scientists confirm: the most annoying colors are objectively the
              most “engaging”
            </h1>
            <p className="max-w-2xl text-pretty text-lg leading-8 text-white/75">
              Welcome. Everything here is professionally designed, carefully
              typeset, and aggressively saturated. Any resemblance to real
              consent banners is intentional.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <a
                className="rounded-full bg-[linear-gradient(135deg,var(--annoy-1),var(--annoy-2))] px-5 py-3 text-sm font-semibold text-[var(--annoy-ink)] shadow-[0_18px_60px_rgba(0,255,213,.20)] transition-transform hover:-translate-y-0.5"
                href="#"
              >
                Read the article
              </a>
              <a
                className="rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white/85 backdrop-blur transition-colors hover:bg-white/10"
                href="#"
              >
                Subscribe (free*)
              </a>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                "Ten productivity tips that require twelve subscriptions",
                "Our editors react to your browsing history (exclusive)",
                "Opinion: consent should be a vibe, not a choice",
                "Local user forced to click ‘Accept’ for weather forecast",
              ].map((t) => (
                <article
                  key={t}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white/80 backdrop-blur"
                >
                  <div className="text-xs font-semibold tracking-wide text-white/60">
                    HOT TAKE
                  </div>
                  <div className="mt-1 text-sm font-medium text-white/90">
                    {t}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-5 backdrop-blur">
              <div className="text-xs font-semibold tracking-[0.18em] uppercase text-white/60">
                Featured sponsor
              </div>
              <div className="mt-2 flex items-center gap-3">
                <Image
                  src="/vercel.svg"
                  alt="Sponsor"
                  width={28}
                  height={28}
                  className="invert"
                />
                <div className="text-sm font-semibold text-white">
                  NeonCorp™ Behavioral Insights
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/70">
                Turning your “preferences” into actionable revenue since 2007.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--annoy-4)_22%,transparent),rgba(0,0,0,.35))] p-5 backdrop-blur">
              <div className="text-sm font-semibold text-white">
                Today’s Mood
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-white/75">
                <span className="h-2 w-2 rounded-full bg-[var(--annoy-3)]" />
                Hypersaturated optimism
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-2/3 bg-[linear-gradient(90deg,var(--annoy-3),var(--annoy-2),var(--annoy-1))]" />
              </div>
              <div className="mt-2 text-xs text-white/55">
                *This will later become a consent progress bar that never ends.
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

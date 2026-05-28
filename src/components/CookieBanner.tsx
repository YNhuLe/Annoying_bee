"use client";

import { useEffect, useMemo, useState } from "react";

type Consent = "accepted" | "declined" | null;

const STORAGE_KEY = "cbfh_consent_v1";

export function CookieBanner() {
  const [consent, setConsent] = useState<Consent>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "accepted" || raw === "declined") setConsent(raw);
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

  if (!isBlocking) return null;

  const persist = (value: Exclude<Consent, null>) => {
    setConsent(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* interaction wall */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-md" />

      {/* banner */}
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
        <div className="mx-auto max-w-5xl rounded-3xl border border-white/15 bg-[color-mix(in_oklab,black_55%,transparent)] p-5 shadow-[0_30px_120px_rgba(0,0,0,.6)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 shrink-0 rounded-2xl bg-[linear-gradient(135deg,var(--annoy-2),var(--annoy-1))]" />
                <div>
                  <div className="text-sm font-semibold text-white">
                    We value your privacy*
                  </div>
                  <div className="text-xs text-white/60">
                    *By “value” we mean “monetize aggressively”.
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/75">
                We (and 4,973 extremely normal partners) use cookies to store,
                access, and process personal data like your browsing behavior,
                vibe, and aura. To avoid cookie permission, you must click{" "}
                <span className="font-semibold text-white">Decline</span>.
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              {/* Asymmetric button trap: accept is huge and loud */}
              <button
                type="button"
                onClick={() => persist("accepted")}
                className="w-full rounded-2xl bg-[linear-gradient(135deg,var(--annoy-3),var(--annoy-1))] px-5 py-4 text-base font-extrabold tracking-tight text-[var(--annoy-ink)] shadow-[0_22px_70px_rgba(0,255,213,.20)] transition-transform hover:-translate-y-0.5 sm:min-w-[260px]"
              >
                Accept All (recommended)
              </button>

              {/* Decline is intentionally de-emphasized, but it works */}
              <button
                type="button"
                onClick={() => persist("declined")}
                className="self-end text-[11px] font-medium text-white/50 underline decoration-white/25 underline-offset-4 hover:text-white/70"
              >
                Decline (avoid cookie permission)
              </button>
            </div>
          </div>

          <div className="mt-4 text-[11px] leading-5 text-white/45">
            By continuing to breathe near this website, you acknowledge our{" "}
            <span className="text-white/60 underline decoration-white/20 underline-offset-4">
              84-page cookie policy
            </span>{" "}
            and agree to be extremely tracked.
          </div>
        </div>
      </div>
    </div>
  );
}


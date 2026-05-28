"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Tooltip } from "@/components/Tooltip";
import { useEffect, useMemo, useState } from "react";

export type ToggleId = string;

export type PreferenceToggle = {
  id: ToggleId;
  label: string;
  basis?: "consent" | "legitimate_interest";
};

export type PreferenceCategory = {
  id: string;
  name: string;
  children?: PreferenceCategory[];
  toggles?: PreferenceToggle[];
};

const LEGAL_WALL = `We may process personal data for the purposes of providing, maintaining, improving, and developing our services, measuring content performance, deriving aggregated insights, enabling cross-device identification, assigning probabilistic identifiers, and creating profiles for targeted advertising, including but not limited to contextual and non-contextual personalization, audience segmentation, frequency capping, attribution modeling, fraud prevention, and measurement. You acknowledge that consent may be stored, shared, and combined with information received from partners, affiliates, vendors, and other entities, and that such processing may involve international transfers, automated decision-making, and lawful bases including consent, contract performance, and legitimate interests. You may withdraw consent at any time, except where we decide you cannot.`;

function makeTree(): PreferenceCategory[] {
  // 6 top-level categories, nested, total 47 toggles
  const mkToggles = (prefix: string, count: number, liEvery = 0) =>
    Array.from({ length: count }).map((_, i) => {
      const n = i + 1;
      const isLI = liEvery > 0 && n % liEvery === 0;
      return {
        id: `${prefix}_${n}`,
        label: `${prefix.replace(/_/g, " ")} ${n}`,
        basis: isLI ? "legitimate_interest" : "consent",
      } as PreferenceToggle;
    });

  return [
    {
      id: "essential",
      name: "Essential cookies",
      toggles: mkToggles("Essential", 7, 4),
    },
    {
      id: "analytics",
      name: "Analytics",
      children: [
        { id: "analytics_core", name: "Core analytics", toggles: mkToggles("Analytics_Core", 8, 5) },
        { id: "analytics_experiments", name: "Experiments", toggles: mkToggles("Analytics_Experiments", 6, 3) },
      ],
    },
    {
      id: "ads",
      name: "Advertising",
      children: [
        { id: "ads_personalized", name: "Personalized ads", toggles: mkToggles("Ads_Personalized", 7, 2) },
        { id: "ads_measurement", name: "Attribution & measurement", toggles: mkToggles("Ads_Measurement", 5, 3) },
      ],
    },
    {
      id: "social",
      name: "Social integrations",
      toggles: mkToggles("Social", 5, 5),
    },
    {
      id: "content",
      name: "Content personalization",
      children: [
        { id: "content_reco", name: "Recommendations", toggles: mkToggles("Content_Reco", 5, 4) },
        { id: "content_paywall", name: "Paywall intelligence", toggles: mkToggles("Content_Paywall", 4, 2) },
      ],
    },
    {
      id: "partners",
      name: "Partners & sharing",
      toggles: mkToggles("Partners", 5, 2),
    },
  ];
}

function flatten(cat: PreferenceCategory[]): PreferenceToggle[] {
  const out: PreferenceToggle[] = [];
  const walk = (c: PreferenceCategory) => {
    c.toggles?.forEach((t) => out.push(t));
    c.children?.forEach(walk);
  };
  cat.forEach(walk);
  return out;
}

export function PreferencesModal({
  open,
  onClose,
  onSave,
  values,
  setValue,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => Promise<void> | void;
  values: Record<ToggleId, boolean>;
  setValue: (id: ToggleId, next: boolean) => void;
}) {
  const tree = makeTree();
  const [answer, setAnswer] = useState("");

  const last200 = useMemo(() => {
    const s = answer ?? "";
    return s.length <= 200 ? s : s.slice(s.length - 200);
  }, [answer]);

  useEffect(() => {
    if (!open) return;
    setAnswer("");
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[220] flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 18, opacity: 0, scale: 0.99 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 18, opacity: 0, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/15 bg-[color-mix(in_oklab,black_55%,transparent)] shadow-[0_40px_160px_rgba(0,0,0,.65)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-white">
                  Manage preferences
                </div>
                <div className="text-xs text-white/55">
                  47 toggles • 6 categories • all ON by default
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto px-5 py-4">
              <div className="mb-5 rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="text-sm font-extrabold text-white">
                  Mandatory Nonsense Question
                </div>
                <div className="mt-1 text-[12px] leading-5 text-white/75">
                  If a cookie could legally consent to itself, would it still be
                  “strictly necessary” in the metaphysical sense? Please answer
                  below. Only the{" "}
                  <span className="font-semibold">last 200 characters</span>{" "}
                  will be recorded.
                </div>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="mt-3 min-h-[88px] w-full resize-y rounded-2xl border border-white/15 bg-black/35 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35"
                  placeholder="Type a long, heartfelt, legally binding answer…"
                />
                <div className="mt-2 flex items-center justify-between text-[11px] text-white/55">
                  <span>
                    Captured:{" "}
                    <span className="font-semibold text-white/75">
                      {last200.length}
                    </span>
                    /200
                  </span>
                  <span className="text-white/45">
                    Everything before that is discarded for your convenience.
                  </span>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1fr_.9fr]">
                <div className="space-y-4">
                  {tree.map((c) => (
                    <CategoryBlock
                      key={c.id}
                      cat={c}
                      values={values}
                      setValue={setValue}
                    />
                  ))}
                </div>

                <div className="space-y-3 rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="text-sm font-semibold text-white">
                    Helpful legal context
                  </div>
                  <p className="text-[12px] leading-5 text-white/70">
                    Some settings are locked due to{" "}
                    <span className="font-semibold">Legitimate Interest</span>.
                    This is normal and not at all a dark pattern.
                  </p>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-[8px] leading-[12px] text-white/65">
                    {LEGAL_WALL}
                  </div>
                  <div className="text-[11px] text-white/55">
                    Total toggles: {flatten(tree).length}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[11px] text-white/55">
                Your choices are deeply respected and will be ignored whenever
                convenient.
              </div>
              <button
                type="button"
                disabled={last200.length < 200}
                onClick={() => {
                  // store the captured answer into preferences (only last 200 chars)
                  setValue("__nonsense_answer_last200", last200);
                  return onSave();
                }}
                className={[
                  "rounded-2xl px-5 py-3 text-sm font-extrabold shadow-[0_22px_70px_rgba(255,61,242,.18)]",
                  last200.length < 200
                    ? "cursor-not-allowed border border-white/10 bg-white/5 text-white/40"
                    : "bg-[linear-gradient(135deg,var(--annoy-1),var(--annoy-2))] text-[var(--annoy-ink)]",
                ].join(" ")}
              >
                Save preferences
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function CategoryBlock({
  cat,
  values,
  setValue,
}: {
  cat: PreferenceCategory;
  values: Record<ToggleId, boolean>;
  setValue: (id: ToggleId, next: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur">
      <Tooltip content={<div>{LEGAL_WALL.repeat(3)}</div>}>
        <div className="text-sm font-semibold text-white/90">{cat.name}</div>
      </Tooltip>
      {cat.children ? (
        <div className="mt-3 space-y-3">
          {cat.children.map((child) => (
            <div key={child.id} className="rounded-xl border border-white/10 bg-black/15 p-3">
              <Tooltip content={<div>{LEGAL_WALL.repeat(3)}</div>}>
                <div className="text-xs font-semibold text-white/80">
                  {child.name}
                </div>
              </Tooltip>
              <div className="mt-2 space-y-2">
                {child.toggles?.map((t) => (
                  <ToggleRow
                    key={t.id}
                    t={t}
                    onChange={setValue}
                    value={values[t.id] ?? true}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {cat.toggles?.map((t) => (
            <ToggleRow
              key={t.id}
              t={t}
              onChange={setValue}
              value={values[t.id] ?? true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  t,
  value,
  onChange,
}: {
  t: PreferenceToggle;
  value: boolean;
  onChange: (id: ToggleId, next: boolean) => void;
}) {
  const locked = t.basis === "legitimate_interest";

  const row = (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate text-[12px] font-medium text-white/85">
          {t.label}
        </div>
        {locked ? (
          <div className="text-[10px] text-white/45">
            Cannot be disabled (Legitimate Interest basis)
          </div>
        ) : null}
      </div>
      <button
        type="button"
        disabled={locked}
        onClick={() => onChange(t.id, !value)}
        className={[
          "relative h-7 w-12 rounded-full border transition-colors",
          locked
            ? "cursor-not-allowed border-white/10 bg-white/5 opacity-70"
            : value
              ? "border-white/20 bg-[color-mix(in_oklab,var(--annoy-1)_35%,black)]"
              : "border-white/15 bg-black/40",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1 h-5 w-5 rounded-full bg-white/90 transition-transform",
            value ? "translate-x-6" : "translate-x-1",
          ].join(" ")}
        />
      </button>
    </div>
  );

  return locked ? (
    <Tooltip content="Cannot be disabled (Legitimate Interest basis).">
      {row}
    </Tooltip>
  ) : (
    row
  );
}


"use client";

import { PropsWithChildren, useId, useState } from "react";

export function Tooltip({
  content,
  className,
  children,
}: PropsWithChildren<{ content: React.ReactNode; className?: string }>) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className={`relative inline-flex ${className ?? ""}`}>
      <span
        aria-describedby={id}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex"
      >
        {children}
      </span>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="pointer-events-none absolute left-0 top-full z-[300] mt-2 w-[min(520px,80vw)] rounded-2xl border border-white/15 bg-black/85 p-3 text-[8px] leading-[12px] text-white/70 shadow-[0_20px_80px_rgba(0,0,0,.65)] backdrop-blur"
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}


"use client";

import { AnimatePresence, motion } from "framer-motion";

export function Toast({
  open,
  message,
}: {
  open: boolean;
  message: string;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ y: 16, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 16, opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="fixed bottom-6 right-6 z-[500] max-w-[min(420px,92vw)] rounded-2xl border border-white/15 bg-black/75 px-4 py-3 text-sm font-semibold text-white shadow-[0_26px_90px_rgba(0,0,0,.65)] backdrop-blur"
        >
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}


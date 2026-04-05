"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const loadingGifSrc = "/assets/gnome-book-flip-loading.webp";

export function ClassLoadingIndicator({
  message = "Loading matching items...",
  detail = "Scanning the archive for the next drop.",
  overlay = false,
  fullScreen = false
}: {
  message?: string;
  detail?: string;
  overlay?: boolean;
  fullScreen?: boolean;
}) {
  const [gifInstanceKey, setGifInstanceKey] = useState(0);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setGifInstanceKey(Date.now());
    setPortalRoot(document.body);
  }, []);

  const content = (
    <div className="px-6 py-8 text-center pointer-events-none">
      <div aria-busy="true" aria-live="polite" className="flex flex-col items-center gap-4">
        <div className="relative flex size-36 items-center justify-center sm:size-40">
          <div
            aria-hidden="true"
            className="absolute inset-2 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(246,198,114,0.24) 0%, rgba(246,198,114,0.1) 48%, rgba(15,23,42,0.02) 70%, transparent 76%)"
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-full border border-[#d7a45f]/22"
            style={{
              boxShadow: "0 0 30px rgba(215,164,95,0.18), inset 0 0 28px rgba(0,0,0,0.22)"
            }}
          />
          <img
            key={gifInstanceKey}
            src={`${loadingGifSrc}?v=${gifInstanceKey}`}
            alt="Animated gnome turning pages while content loads"
            className="relative z-10 h-28 w-auto object-contain drop-shadow-[0_0_18px_rgba(244,220,168,0.38)] sm:h-32"
          />
        </div>

        <div className="space-y-2">
          <p className="font-[var(--font-display)] text-xl font-semibold tracking-[-0.03em] text-[#f4ebdb] [text-shadow:0_4px_18px_rgba(0,0,0,0.6)]">
            {message}
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e6d8bb] animate-pulse [text-shadow:0_2px_12px_rgba(0,0,0,0.55)]">
            {detail}
          </p>
        </div>
      </div>
    </div>
  );

  const loader = fullScreen ? (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,216,150,0.14),transparent_28%),linear-gradient(180deg,rgba(9,11,16,0.76),rgba(9,11,16,0.9))] px-4 backdrop-blur-md">
      <div className="w-full max-w-md">{content}</div>
    </div>
  ) : overlay ? (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-[linear-gradient(180deg,rgba(10,12,16,0.18),rgba(10,12,16,0.26))] px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md">{content}</div>
    </div>
  ) : (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center px-4">
      <div className="w-full max-w-md">{content}</div>
    </div>
  );

  return portalRoot ? createPortal(loader, portalRoot) : loader;
}

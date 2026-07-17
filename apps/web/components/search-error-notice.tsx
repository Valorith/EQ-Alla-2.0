"use client";

import { TriangleAlert, RotateCcw } from "lucide-react";

export function SearchErrorNotice({
  message,
  onRetry,
  isRetrying = false
}: {
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-[#d7a45f]/35 bg-[linear-gradient(180deg,rgba(84,58,24,0.5),rgba(40,28,16,0.55))] px-4 py-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.28)] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-[#d7a45f]/40 bg-[#d7a45f]/12">
          <TriangleAlert aria-hidden="true" className="size-4 text-[#f0c36a]" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[#f5e3ba]">Search ran into a problem</p>
          <p className="mt-0.5 text-sm leading-5 text-[#dcc9a4]">{message}</p>
        </div>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-[#d7a45f]/45 bg-[#d7a45f]/12 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#f5dfb8] transition hover:border-[#f0c36a]/70 hover:bg-[#d7a45f]/20 disabled:cursor-not-allowed disabled:opacity-50 sm:self-center"
        >
          <RotateCcw aria-hidden="true" className={isRetrying ? "size-3.5 animate-spin motion-reduce:animate-none" : "size-3.5"} />
          {isRetrying ? "Retrying" : "Retry search"}
        </button>
      ) : null}
    </div>
  );
}

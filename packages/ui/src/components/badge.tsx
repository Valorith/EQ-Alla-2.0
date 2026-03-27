import * as React from "react";
import { cn } from "../lib/utils";

export function Badge(props: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center rounded-full border border-[var(--border-strong)] bg-[var(--panel)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-strong)]",
        props.className
      )}
    />
  );
}

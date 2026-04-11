import * as React from "react";
import { cn } from "../lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm text-[#e8dfcf] outline-none transition placeholder:text-white/35 focus:border-[var(--accent)] focus:bg-black/30 focus:shadow-[0_0_0_4px_rgba(215,164,95,0.12)]",
        props.className
      )}
    />
  );
}

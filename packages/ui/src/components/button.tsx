import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "default" | "ghost" | "outline";
};

export function Button({ asChild, className, variant = "default", ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        variant === "default" &&
          "border border-[#c99753] bg-[linear-gradient(180deg,#ddb56d,#bc8045)] text-[#1f160f] shadow-[0_12px_24px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 hover:brightness-[1.03]",
        variant === "ghost" && "bg-transparent text-[var(--foreground)] hover:bg-black/[0.04]",
        variant === "outline" &&
          "border border-[var(--border-strong)] bg-white/88 text-[var(--foreground)] hover:bg-white hover:border-[var(--accent)]",
        className
      )}
      {...props}
    />
  );
}

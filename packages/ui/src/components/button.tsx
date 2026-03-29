import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "default" | "ghost" | "outline";
};

const buttonVariantStyles: Record<NonNullable<ButtonProps["variant"]>, React.CSSProperties> = {
  default: {
    borderColor: "#9a6932",
    background: "linear-gradient(180deg, #ddb56d, #bc8045)",
    color: "#1f160f",
    boxShadow: "0 12px 24px rgba(0, 0, 0, 0.16)"
  },
  ghost: {},
  outline: {
    borderColor: "rgba(244, 214, 167, 0.45)",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    color: "#ffffff",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.14)"
  }
};

export function Button({ asChild, className, variant = "default", style, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        variant === "default" && "border hover:-translate-y-0.5",
        variant === "ghost" && "bg-transparent text-[var(--foreground)] hover:bg-black/[0.04]",
        variant === "outline" && "border hover:bg-black/45",
        className
      )}
      style={{ ...buttonVariantStyles[variant], ...style }}
      {...props}
    />
  );
}

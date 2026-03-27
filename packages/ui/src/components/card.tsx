import * as React from "react";
import { cn } from "../lib/utils";

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-[22px] border border-[var(--border)] bg-[var(--card)] shadow-[0_18px_44px_rgba(7,10,15,0.16)] backdrop-blur-sm",
        props.className
      )}
    />
  );
}

export function CardContent(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("p-5 sm:p-6", props.className)} />;
}

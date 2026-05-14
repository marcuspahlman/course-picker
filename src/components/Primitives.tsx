import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export function MonoChip({
  children,
  className,
  tone = "muted",
}: {
  children: ReactNode;
  className?: string;
  tone?: "muted" | "solid";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 font-mono text-[11px]",
        tone === "muted"
          ? "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
          : "bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900",
        className,
      )}
    >
      {children}
    </span>
  );
}

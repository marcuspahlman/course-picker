import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-stone-200 bg-white/60 px-7 py-9 text-center dark:border-stone-800 dark:bg-stone-900/40",
        className,
      )}
    >
      <h3 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        {title}
      </h3>
      {body && (
        <p className="mx-auto mt-2 max-w-[44ch] text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          {body}
        </p>
      )}
      {action && (
        <div className="mt-5 flex items-center justify-center">{action}</div>
      )}
    </div>
  );
}

export function CourseListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton-shimmer h-[120px] rounded-xl border border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-900"
        />
      ))}
    </div>
  );
}

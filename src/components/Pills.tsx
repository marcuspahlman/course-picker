import type { CourseCategory } from "../lib/course";
import { CATEGORY_LABEL } from "../lib/course";
import { cn } from "../lib/cn";

const CATEGORY_STYLES: Record<CourseCategory, string> = {
  mandatory: "bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900",
  conditionally_elective:
    "bg-blue-50 text-blue-800 ring-1 ring-blue-200/70 dark:bg-blue-950/60 dark:text-blue-200 dark:ring-blue-900",
  recommended:
    "bg-amber-50 text-amber-800 ring-1 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60",
};

export function CategoryPill({
  category,
  yearLabel,
  className,
}: {
  category: CourseCategory;
  yearLabel?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        CATEGORY_STYLES[category],
        className,
      )}
    >
      {CATEGORY_LABEL[category]}
      {category === "mandatory" && yearLabel ? (
        <span className="opacity-70">· Year {yearLabel}</span>
      ) : null}
    </span>
  );
}

export function PeriodPill({
  period,
  className,
}: {
  period: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[11px] text-stone-600 ring-1 ring-stone-200 dark:text-stone-300 dark:ring-stone-800",
        className,
      )}
    >
      {period}
    </span>
  );
}

import { ALL_PERIODS, type Period } from "../lib/course";
import { cn } from "../lib/cn";

type Props = {
  selected: ReadonlySet<Period>;
  onChange: (periods: Set<Period>) => void;
  className?: string;
};

export function PeriodToggleRow({ selected, onChange, className }: Props) {
  return (
    <div className={cn("grid grid-cols-4 gap-1.5", className)}>
      {ALL_PERIODS.map((period) => {
        const active = selected.has(period);
        return (
          <button
            key={period}
            type="button"
            aria-pressed={active}
            onClick={() => {
              const next = new Set(selected);
              if (next.has(period)) next.delete(period);
              else next.add(period);
              onChange(next);
            }}
            className={cn(
              "h-10 rounded-md border font-mono text-[12px] font-medium tracking-wider transition-colors",
              active
                ? "border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-300 dark:hover:border-stone-700 dark:hover:text-stone-100",
            )}
          >
            {period}
          </button>
        );
      })}
    </div>
  );
}

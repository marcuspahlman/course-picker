import { useTheme } from "../lib/theme";
import { MonitorIcon, MoonIcon, SunIcon } from "../lib/icons";
import { cn } from "../lib/cn";

const ITEMS: Array<{
  value: "system" | "light" | "dark";
  label: string;
  icon: typeof SunIcon;
}> = [
  { value: "system", label: "System theme", icon: MonitorIcon },
  { value: "light", label: "Light theme", icon: SunIcon },
  { value: "dark", label: "Dark theme", icon: MoonIcon },
];

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const { setting, setSetting } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        "inline-flex items-center rounded-md border border-stone-200 bg-white p-0.5 dark:border-stone-800 dark:bg-stone-900",
        compact ? "gap-0" : "gap-0.5",
      )}
    >
      {ITEMS.map((it) => {
        const Icon = it.icon;
        const active = setting === it.value;
        return (
          <button
            key={it.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={it.label}
            title={it.label}
            onClick={() => setSetting(it.value)}
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded-sm transition-colors",
              active
                ? "bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900"
                : "text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100",
            )}
          >
            <Icon size={13} />
          </button>
        );
      })}
    </div>
  );
}

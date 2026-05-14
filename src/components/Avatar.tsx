import { useState } from "react";
import { cn } from "../lib/cn";

type Profile = {
  displayName?: string;
  imageUrl?: string | null;
} | null;

function initials(name?: string): string {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const LIGHT_PALETTE = [
  "bg-amber-100 text-amber-900",
  "bg-emerald-100 text-emerald-900",
  "bg-sky-100 text-sky-900",
  "bg-rose-100 text-rose-900",
  "bg-violet-100 text-violet-900",
  "bg-stone-200 text-stone-800",
];

const DARK_PALETTE = [
  "dark:bg-amber-900/40 dark:text-amber-100",
  "dark:bg-emerald-900/40 dark:text-emerald-100",
  "dark:bg-sky-900/40 dark:text-sky-100",
  "dark:bg-rose-900/40 dark:text-rose-100",
  "dark:bg-violet-900/40 dark:text-violet-100",
  "dark:bg-stone-800 dark:text-stone-100",
];

function hashIndex(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % LIGHT_PALETTE.length;
}

export function Avatar({
  profile,
  size = "md",
  title,
  ring = true,
}: {
  profile: Profile;
  size?: "xs" | "sm" | "md" | "lg";
  title?: string;
  ring?: boolean;
}) {
  const name = profile?.displayName ?? "?";
  const idx = hashIndex(name);
  const imageUrl = profile?.imageUrl;
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const imageFailed = imageUrl !== undefined && imageUrl === failedImageUrl;

  const dim =
    size === "lg"
      ? "h-9 w-9 text-[13px]"
      : size === "sm"
        ? "h-6 w-6 text-[10px]"
        : size === "xs"
          ? "h-5 w-5 text-[9px]"
          : "h-7 w-7 text-[11px]";

  const ringClass = ring && "ring-2 ring-white dark:ring-stone-900";

  if (imageUrl && !imageFailed) {
    return (
      <span
        title={title ?? name}
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
          ringClass,
          dim,
        )}
      >
        <img
          src={imageUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setFailedImageUrl(imageUrl)}
        />
      </span>
    );
  }

  return (
    <span
      title={title ?? name}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full font-medium",
        ringClass,
        LIGHT_PALETTE[idx],
        DARK_PALETTE[idx],
        dim,
      )}
    >
      {initials(name)}
    </span>
  );
}

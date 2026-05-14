import { Avatar } from "./Avatar";
import { cn } from "../lib/cn";
import type { FriendCourseProfileChip } from "../lib/friendsCourseActivity";

export function FriendCoursePeopleRows({
  saved,
  taking,
  taken,
  className,
}: {
  saved: FriendCourseProfileChip[];
  taking: FriendCourseProfileChip[];
  taken: FriendCourseProfileChip[];
  className?: string;
}) {
  if (saved.length === 0 && taking.length === 0 && taken.length === 0)
    return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {saved.length > 0 && (
        <FriendCoursePeopleRow tone="saved" profiles={saved} label="saved" />
      )}
      {taking.length > 0 && (
        <FriendCoursePeopleRow tone="taking" profiles={taking} label="taking" />
      )}
      {taken.length > 0 && (
        <FriendCoursePeopleRow tone="taken" profiles={taken} label="taken" />
      )}
    </div>
  );
}

function FriendCoursePeopleRow({
  tone,
  profiles,
  label,
}: {
  tone: "saved" | "taking" | "taken";
  profiles: FriendCourseProfileChip[];
  label: string;
}) {
  const count = profiles.length;
  const names = profiles.map((p) => p.displayName);
  const palette =
    tone === "taking"
      ? "bg-emerald-50 text-emerald-900 ring-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60"
      : tone === "taken"
        ? "bg-sky-50 text-sky-900 ring-sky-200/70 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900/60"
        : "bg-stone-50 text-stone-900 ring-stone-200/70 dark:bg-stone-950/40 dark:text-stone-200 dark:ring-stone-800/80";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-2 py-1 text-[12px] ring-1",
        palette,
      )}
    >
      <span className="flex -space-x-1.5">
        {profiles.slice(0, 4).map((p, i) => (
          <Avatar
            key={p.profileId ?? `${p.displayName}-${i}`}
            size="xs"
            profile={{
              displayName: p.displayName,
              imageUrl: p.imageUrl ?? null,
            }}
          />
        ))}
      </span>
      <span>
        <b className="font-medium">{count}</b> {label}
        {count <= 3 && (
          <span className="ml-1 opacity-70">· {names.join(", ")}</span>
        )}
      </span>
    </span>
  );
}

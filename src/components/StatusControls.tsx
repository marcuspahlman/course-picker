import { useMutation } from "convex/react";
import { useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import {
  ArchiveBoxIcon,
  BookmarkFilledIcon,
  BookmarkIcon,
  CheckIcon,
} from "../lib/icons";
import { useAuthContext } from "../lib/authContextValue";
import { cn } from "../lib/cn";

type Props = {
  courseId: Id<"courses">;
  courseCode: string;
  status: "saved" | "taking" | "taken" | null;
  compact?: boolean;
  size?: "sm" | "md";
};

const BASE =
  "inline-flex items-center gap-1.5 rounded-md border text-[12.5px] font-medium transition-colors disabled:cursor-progress disabled:opacity-60 select-none";
const SIZE_MD = "h-8 px-3";
const SIZE_SM = "h-7 px-2.5 text-[12px]";

const INACTIVE =
  "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-stone-700 dark:hover:text-stone-100";

const SAVE_ACTIVE =
  "border-stone-900 bg-stone-900 text-stone-50 hover:bg-stone-800 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white";

const TAKE_ACTIVE =
  "border-emerald-300/80 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-200";

const TAKEN_ACTIVE =
  "border-sky-300/80 bg-sky-50 text-sky-900 hover:bg-sky-100 dark:border-sky-800/70 dark:bg-sky-950/50 dark:text-sky-200";

export function StatusControls({
  courseId,
  courseCode,
  status,
  compact,
  size = "md",
}: Props) {
  const auth = useAuthContext();
  const setSaved = useMutation(api.courseStatuses.setSaved);
  const setTaking = useMutation(api.courseStatuses.setTaking);
  const setTaken = useMutation(api.courseStatuses.setTaken);
  const clearStatus = useMutation(api.courseStatuses.clearStatus);
  const [busy, setBusy] = useState<"saved" | "taking" | "taken" | null>(null);

  const sizeCls = size === "sm" ? SIZE_SM : SIZE_MD;

  async function withBusy(
    key: "saved" | "taking" | "taken",
    fn: () => Promise<unknown>,
  ) {
    if (busy) return;
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }

  const handleSave = () =>
    auth.requireAuth(
      () =>
        withBusy("saved", () => {
          if (status === "saved") return clearStatus({ courseId });
          return setSaved({ courseId });
        }),
      {
        reason: `Sign in to save ${courseCode}. Friends in your groups can see this.`,
      },
    );

  const handleTaking = () =>
    auth.requireAuth(
      () =>
        withBusy("taking", () => {
          if (status === "taking") return clearStatus({ courseId });
          return setTaking({ courseId });
        }),
      {
        reason: `Sign in to commit to taking ${courseCode}. Friends in your groups can see this.`,
      },
    );

  const handleTaken = () =>
    auth.requireAuth(
      () =>
        withBusy("taken", () => {
          if (status === "taken") return clearStatus({ courseId });
          return setTaken({ courseId });
        }),
      {
        reason: `Sign in to mark ${courseCode} as taken. Friends in your groups can see this.`,
      },
    );

  return (
    <div
      className="flex items-center gap-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={handleTaken}
        disabled={busy !== null}
        aria-pressed={status === "taken"}
        title={status === "taken" ? "Taken · click to remove" : "Mark as taken"}
        className={cn(
          BASE,
          sizeCls,
          status === "taken" ? TAKEN_ACTIVE : INACTIVE,
        )}
      >
        <ArchiveBoxIcon size={13} />
        <span>Taken</span>
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={busy !== null}
        aria-pressed={status === "saved"}
        title={status === "saved" ? "Saved · click to remove" : "Save"}
        className={cn(
          BASE,
          sizeCls,
          status === "saved" ? SAVE_ACTIVE : INACTIVE,
          compact && "px-2",
        )}
      >
        {status === "saved" ? (
          <BookmarkFilledIcon size={13} />
        ) : (
          <BookmarkIcon size={13} />
        )}
        {!compact && <span>Save</span>}
      </button>
      <button
        type="button"
        onClick={handleTaking}
        disabled={busy !== null}
        aria-pressed={status === "taking"}
        title={
          status === "taking" ? "Taking · click to remove" : "Mark as taking"
        }
        className={cn(
          BASE,
          sizeCls,
          status === "taking" ? TAKE_ACTIVE : INACTIVE,
        )}
      >
        <CheckIcon size={13} />
        <span>Taking</span>
      </button>
    </div>
  );
}

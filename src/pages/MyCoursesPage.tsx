import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { CourseCard } from "../components/CourseCard";
import { EmptyState } from "../components/States";
import { useAuthContext } from "../lib/authContextValue";
import type { Course } from "../lib/course";
import { cn } from "../lib/cn";
import {
  friendActivityByCourseId,
  type FriendsCourseActivityPayload,
} from "../lib/friendsCourseActivity";

type CourseStatus = "saved" | "taking" | "taken";
type Tab = CourseStatus;

const TAB_LABELS: Record<Tab, string> = {
  taking: "Taking",
  saved: "Saved",
  taken: "Taken",
};

export function MyCoursesPage() {
  const auth = useAuthContext();
  const [tab, setTab] = useState<Tab>("taking");

  const statuses = useQuery(
    api.courseStatuses.getMyCourseStatuses,
    auth.isAuthenticated ? {} : "skip",
  );
  const summaries = useQuery(api.courseData.listAllSummaries);

  const friendActivityRaw = useQuery(
    api.friendGroups.friendsCourseActivity,
    auth.isAuthenticated ? {} : "skip",
  );
  const commentCounts = useQuery(
    api.courseComments.commentCountsForVisibleCourses,
    auth.isAuthenticated ? {} : "skip",
  );

  const friendByCourseId = useMemo(
    () =>
      friendActivityByCourseId(
        friendActivityRaw as FriendsCourseActivityPayload | undefined,
      ),
    [friendActivityRaw],
  );

  const commentCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of commentCounts ?? []) {
      map.set(row.courseId as string, row.count);
    }
    return map;
  }, [commentCounts]);

  const summaryByCourseId = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of summaries ?? []) {
      m.set(s.courseId as string, s.studentSummary.overview);
    }
    return m;
  }, [summaries]);

  const taking = useMemo(
    () => (statuses ?? []).filter((p) => p.status.status === "taking"),
    [statuses],
  );
  const saved = useMemo(
    () => (statuses ?? []).filter((p) => p.status.status === "saved"),
    [statuses],
  );
  const taken = useMemo(
    () => (statuses ?? []).filter((p) => p.status.status === "taken"),
    [statuses],
  );

  const statusMap = useMemo(() => {
    const m = new Map<string, CourseStatus>();
    for (const p of statuses ?? []) {
      m.set(p.status.courseId as string, p.status.status);
    }
    return m;
  }, [statuses]);

  if (!auth.isAuthenticated) {
    return (
      <div>
        <EmptyState
          title="Sign in to see your courses"
          body="My courses is signed-in only. Saved, taking, and taken statuses are visible only to friend groups you join."
          action={
            <button
              type="button"
              onClick={() => auth.promptSignIn()}
              className="inline-flex h-9 items-center rounded-md bg-stone-900 px-4 text-[13px] font-medium text-stone-50 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
            >
              Sign in
            </button>
          }
        />
      </div>
    );
  }

  const counts: Record<Tab, number> = {
    taking: taking.length,
    saved: saved.length,
    taken: taken.length,
  };

  let visibleCourses: Course[] = [];
  if (tab === "taking") {
    visibleCourses = taking.map(courseFromStatus).filter(isCourse);
  }
  if (tab === "saved") {
    visibleCourses = saved.map(courseFromStatus).filter(isCourse);
  }
  if (tab === "taken") {
    visibleCourses = taken.map(courseFromStatus).filter(isCourse);
  }

  return (
    <div>
      <div
        role="tablist"
        className="mb-6 flex items-center gap-1 border-b border-stone-200 dark:border-stone-800"
      >
        {(["taking", "saved", "taken"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px inline-flex items-center gap-2 border-b-2 px-1 py-3 text-[13.5px] font-medium transition-colors",
              tab === t
                ? "border-stone-900 text-stone-900 dark:border-stone-100 dark:text-stone-100"
                : "border-transparent text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100",
            )}
            style={{ marginRight: 18 }}
          >
            {TAB_LABELS[t]}
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 font-mono text-[10.5px]",
                tab === t
                  ? "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200"
                  : "bg-stone-50 text-stone-500 dark:bg-stone-900 dark:text-stone-500",
              )}
            >
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      {visibleCourses.length === 0 ? (
        <EmptyState
          title={
            tab === "taking"
              ? "Nothing marked as taking yet"
              : tab === "saved"
                ? "No saved courses yet"
                : "Nothing marked as taken yet"
          }
          body={
            tab === "saved"
              ? "Save courses while browsing to keep them on your radar."
              : "Set course status from the browser or the course page."
          }
          action={
            <Link
              to="/"
              className="inline-flex h-9 items-center rounded-md border border-stone-200 bg-white px-3 text-[13px] font-medium text-stone-900 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
            >
              Browse courses
            </Link>
          }
        />
      ) : (
        <div className="stagger flex flex-col gap-3">
          {visibleCourses.map((c) => (
            <CourseCard
              key={c._id}
              course={c}
              hasSummary={summaryByCourseId.has(c._id as string)}
              summaryPreview={summaryByCourseId.get(c._id as string) ?? null}
              status={statusMap.get(c._id as string) ?? null}
              friendsOnCourse={friendByCourseId.get(c._id as string)}
              commentCount={commentCountMap.get(c._id as string) ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function isCourse(course: Course | null): course is Course {
  return course !== null;
}

function courseFromStatus(item: {
  course: Doc<"courses"> | null;
  programmeContexts?: Course["programmeContexts"];
}): Course | null {
  const context = item.programmeContexts?.[0];
  if (item.course === null) {
    return null;
  }
  if (context === undefined) {
    return {
      ...item.course,
      offerings: [],
      programmeContexts: item.programmeContexts ?? [],
    };
  }
  return {
    ...item.course,
    offerings: context.programmeCourse.offerings,
    programmeNotes: context.programmeCourse.programmeNotes,
    requirementGroup: context.programmeCourse.requirementGroup,
    programmeContexts: item.programmeContexts,
  };
}

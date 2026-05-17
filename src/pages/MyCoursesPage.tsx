import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { CourseCard } from "../components/CourseCard";
import { MonoChip } from "../components/Primitives";
import { EmptyState } from "../components/States";
import { useAuthContext } from "../lib/authContextValue";
import {
  ALL_PERIODS,
  creditsForPeriod,
  displayCourseCode,
  formatCredits,
  totalCredits,
  type Course,
} from "../lib/course";
import { cn } from "../lib/cn";
import { COURSE_COLOR_PALETTE, type CourseColor } from "../lib/courseColors";
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
type VisibleCourseRow = {
  course: Course;
  id: string;
  color: CourseColor;
};
type PeriodCreditRow = {
  period: (typeof ALL_PERIODS)[number];
  courses: Array<{
    id: string;
    code: string;
    color: CourseColor;
    credits: number;
  }>;
};

export function MyCoursesPage() {
  const auth = useAuthContext();
  const [tab, setTab] = useState<Tab>("taking");
  const [highlightedCourseId, setHighlightedCourseId] = useState<string | null>(
    null,
  );
  const courseCardRefs = useRef(new Map<string, HTMLElement>());
  const highlightTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

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

  const visibleCourseRows = visibleCourses.map((course, index) => ({
    course,
    id: course._id as string,
    color: COURSE_COLOR_PALETTE[index % COURSE_COLOR_PALETTE.length],
  }));
  const visibleCreditTotals = periodCreditRows(visibleCourseRows);
  const visibleTotalCredits = totalCreditsForRows(visibleCourseRows);

  const focusCourseCard = (courseId: string) => {
    const card = courseCardRefs.current.get(courseId);
    if (!card) return;

    card.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedCourseId(courseId);

    if (highlightTimeoutRef.current !== null) {
      window.clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedCourseId((current) =>
        current === courseId ? null : current,
      );
      highlightTimeoutRef.current = null;
    }, 900);
  };

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
          {(tab === "taking" || tab === "saved") && (
            <PeriodCreditsTable
              totalCredits={visibleTotalCredits}
              periods={visibleCreditTotals}
              onSelectCourse={focusCourseCard}
            />
          )}
          {visibleCourseRows.map(({ course, color, id }) => (
            <CourseCard
              key={id}
              ref={(node) => {
                if (node) {
                  courseCardRefs.current.set(id, node);
                } else {
                  courseCardRefs.current.delete(id);
                }
              }}
              course={course}
              courseChipClassName={
                tab === "taking" || tab === "saved"
                  ? color.chipClassName
                  : undefined
              }
              highlightClassName={
                tab === "taking" || tab === "saved"
                  ? color.highlightClassName
                  : undefined
              }
              hasSummary={summaryByCourseId.has(id)}
              summaryPreview={summaryByCourseId.get(id) ?? null}
              status={statusMap.get(id) ?? null}
              friendsOnCourse={friendByCourseId.get(id)}
              commentCount={commentCountMap.get(id) ?? 0}
              highlighted={highlightedCourseId === id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PeriodCreditsTable({
  totalCredits,
  periods,
  onSelectCourse,
}: {
  totalCredits: number;
  periods: PeriodCreditRow[];
  onSelectCourse: (courseId: string) => void;
}) {
  return (
    <div className="border-y border-stone-200 py-2 dark:border-stone-800">
      <table className="w-full table-fixed text-left">
        <caption className="sr-only">
          Credits allocated by period for these courses
        </caption>
        <thead>
          <tr className="border-b border-stone-200 dark:border-stone-800">
            <th
              scope="col"
              className="w-[18%] px-1 py-2 font-mono text-[11px] font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400"
            >
              Total
            </th>
            {periods.map(({ period }) => (
              <th
                key={period}
                scope="col"
                className="px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400"
              >
                {period}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-1 py-3 align-top">
              <div className="text-[18px] font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                {formatCredits(totalCredits)}
              </div>
            </td>
            {periods.map(({ period, courses }) => (
              <td key={period} className="px-3 py-3 align-top">
                <div className="text-[18px] font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                  {formatCredits(
                    courses.reduce(
                      (total, course) => total + course.credits,
                      0,
                    ),
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {courses.length > 0 ? (
                    courses.map((course) => (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => onSelectCourse(course.id)}
                        aria-label={`Show ${course.code} card`}
                        className="inline-flex rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                      >
                        <MonoChip
                          className={cn(
                            "transition-colors",
                            course.color.chipClassName,
                          )}
                        >
                          {course.code}
                        </MonoChip>
                      </button>
                    ))
                  ) : (
                    <span className="font-mono text-[11px] text-stone-400 dark:text-stone-600">
                      -
                    </span>
                  )}
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function periodCreditRows(courses: VisibleCourseRow[]): PeriodCreditRow[] {
  return ALL_PERIODS.map((period) => ({
    period,
    courses: courses
      .map(({ course, color, id }) => ({
        id,
        code: displayCourseCode(course),
        color,
        credits: creditsForPeriod(course, period),
      }))
      .filter((course) => course.credits > 0),
  }));
}

function totalCreditsForRows(courses: VisibleCourseRow[]): number {
  return courses.reduce((total, { course }) => total + totalCredits(course), 0);
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

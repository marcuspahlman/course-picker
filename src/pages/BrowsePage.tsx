import { useMemo, useRef, useState, type ReactNode } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import {
  ALL_CATEGORIES,
  ALL_PERIODS,
  ALL_STUDY_YEARS,
  CATEGORY_LABEL,
  OTHER_LIBRARY_CODE,
  type Course,
  type CourseCategory,
  type Period,
  type StudyYear,
  displayCourseCode,
  dominantCategoryForPeriods,
  formatPeriods,
  mandatoryStudyYearForPeriods,
  offeringsInPeriods,
  totalCredits,
} from "../lib/course";
import { CourseCard } from "../components/CourseCard";
import { ProgrammePicker } from "../components/ProgrammePicker";
import { PeriodToggleRow } from "../components/PeriodToggleRow";
import { EmptyState, CourseListSkeleton } from "../components/States";
import { PlusIcon, SearchIcon } from "../lib/icons";
import { useAuthContext } from "../lib/authContextValue";
import type { SortMode } from "../components/Sidebar";
import type { Doc } from "../../convex/_generated/dataModel";
import {
  friendActivityByCourseId,
  friendPlanningScore,
  type FriendsCourseActivityPayload,
} from "../lib/friendsCourseActivity";

type Props = {
  programmes: Doc<"programmes">[] | undefined;
  defaultProgrammeCode: string | null;
  programmeCode: string;
  onSelectProgramme: (programmeCode: string) => void;
  periods: Set<Period>;
  studyYears: Set<StudyYear>;
  categories: Set<CourseCategory>;
  showTaken: boolean;
  sort: SortMode;
};

function activeSet<T>(selection: ReadonlySet<T>, all: readonly T[]): Set<T> {
  if (selection.size === 0 || selection.size === all.length)
    return new Set(all);
  return new Set(selection);
}

function periodOrderForCourse(
  course: Course,
  periods: ReadonlySet<Period>,
): [number, number] {
  const offerings = offeringsInPeriods(course, periods);
  let firstPeriodIndex: number = ALL_PERIODS.length;
  let shortestRange: number = ALL_PERIODS.length;

  for (const offering of offerings) {
    const periodsFromCredits = ALL_PERIODS.filter(
      (period) => (offering.periodCredits[period] ?? 0) > 0,
    );
    const offeringPeriods =
      periodsFromCredits.length > 0
        ? periodsFromCredits
        : ALL_PERIODS.filter((period) => offering.periods.includes(period));
    const visiblePeriods = offeringPeriods.filter((period) =>
      periods.has(period),
    );
    if (visiblePeriods.length === 0) continue;

    const first = ALL_PERIODS.indexOf(visiblePeriods[0]);
    if (
      first < firstPeriodIndex ||
      (first === firstPeriodIndex && visiblePeriods.length < shortestRange)
    ) {
      firstPeriodIndex = first;
      shortestRange = visiblePeriods.length;
    }
  }

  return [firstPeriodIndex, shortestRange];
}

function compareByPeriodThenTitle(
  a: Course,
  b: Course,
  periods: ReadonlySet<Period>,
): number {
  const [aPeriod, aRange] = periodOrderForCourse(a, periods);
  const [bPeriod, bRange] = periodOrderForCourse(b, periods);
  if (aPeriod !== bPeriod) return aPeriod - bPeriod;
  if (aRange !== bRange) return aRange - bRange;
  return (
    a.courseTitle.localeCompare(b.courseTitle) ||
    displayCourseCode(a).localeCompare(displayCourseCode(b))
  );
}

export function BrowsePage({
  programmes,
  defaultProgrammeCode,
  programmeCode,
  onSelectProgramme,
  periods,
  studyYears,
  categories,
  showTaken,
  sort,
}: Props) {
  const isOtherLibrary = programmeCode === OTHER_LIBRARY_CODE;
  const catalogue = useQuery(api.courseData.listProgrammeCourses, {
    programmeCode,
  });
  const courses = useMemo(() => {
    if (catalogue === undefined) return undefined;
    if (catalogue === null) return [];
    return catalogue.courses.map((row) => ({
      ...row.course,
      offerings: row.programmeCourse?.offerings ?? [],
      programmeNotes: row.programmeCourse?.programmeNotes,
      requirementGroup: row.programmeCourse?.requirementGroup,
      programmeContexts: row.programmeContexts,
    }));
  }, [catalogue]);
  const summaries = useQuery(api.courseData.listAllSummaries);
  const auth = useAuthContext();
  const friendActivityRaw = useQuery(
    api.friendGroups.friendsCourseActivity,
    auth.isAuthenticated ? {} : "skip",
  );

  const friendByCourseId = useMemo(
    () =>
      friendActivityByCourseId(
        friendActivityRaw as FriendsCourseActivityPayload | undefined,
      ),
    [friendActivityRaw],
  );
  const statuses = useQuery(
    api.courseStatuses.getMyCourseStatuses,
    auth.isAuthenticated ? {} : "skip",
  );
  const commentCounts = useQuery(
    api.courseComments.commentCountsForVisibleCourses,
    auth.isAuthenticated ? {} : "skip",
  );

  const commentCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of commentCounts ?? []) {
      map.set(row.courseId as string, row.count);
    }
    return map;
  }, [commentCounts]);

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const statusMap = useMemo(() => {
    const map = new Map<string, "saved" | "taking" | "taken">();
    for (const item of statuses ?? []) {
      map.set(item.status.courseId as string, item.status.status);
    }
    return map;
  }, [statuses]);

  const summaryByCourseId = useMemo(() => {
    const map = new Map<
      string,
      { overview: string; reflectionCount: number }
    >();
    for (const s of summaries ?? []) {
      map.set(s.courseId as string, {
        overview: s.studentSummary.overview,
        reflectionCount: s.reflectionCount,
      });
    }
    return map;
  }, [summaries]);

  const grouped = useMemo(() => {
    if (!courses) return null;
    const query = search.trim().toLowerCase();
    const activePeriods = activeSet(periods, ALL_PERIODS);
    const activeYears = activeSet(studyYears, ALL_STUDY_YEARS);
    const activeCategories = activeSet(categories, ALL_CATEGORIES);

    const inPeriod = isOtherLibrary
      ? courses
      : courses.filter((c) => offeringsInPeriods(c, activePeriods).length > 0);

    const matchingSearch = query
      ? inPeriod.filter(
          (c) =>
            c.courseCode.toLowerCase().includes(query) ||
            displayCourseCode(c).toLowerCase().includes(query) ||
            c.courseTitle.toLowerCase().includes(query) ||
            c.institution?.toLowerCase().includes(query),
        )
      : inPeriod;

    const matching = matchingSearch
      .filter((c) => {
        if (isOtherLibrary) return true;

        const cat = dominantCategoryForPeriods(c, activePeriods);
        if (cat === null || !activeCategories.has(cat)) return false;
        if (cat !== "mandatory") return true;

        const year = mandatoryStudyYearForPeriods(c, activePeriods);
        return year !== null && activeYears.has(year as StudyYear);
      })
      .filter((c) => {
        return showTaken || statusMap.get(c._id as string) !== "taken";
      });

    const groups = new Map<CourseCategory, typeof matching>();
    for (const cat of ALL_CATEGORIES) groups.set(cat, []);

    for (const course of matching) {
      const cat = isOtherLibrary
        ? "recommended"
        : dominantCategoryForPeriods(course, activePeriods);
      if (cat) groups.get(cat)!.push(course);
    }

    if (sort === "friends" && auth.isAuthenticated) {
      const rankedCourses = [...matching].sort((a, b) => {
        const scoreA = friendPlanningScore(
          friendByCourseId.get(a._id as string),
          summaryByCourseId.get(a._id as string)?.reflectionCount ?? 0,
        );
        const scoreB = friendPlanningScore(
          friendByCourseId.get(b._id as string),
          summaryByCourseId.get(b._id as string)?.reflectionCount ?? 0,
        );
        if (scoreB !== scoreA) return scoreB - scoreA;
        return displayCourseCode(a).localeCompare(displayCourseCode(b));
      });

      return {
        activePeriods,
        groups,
        rankedCourses,
        total: matching.length,
        periodLabel: formatPeriods([...activePeriods]),
      };
    }

    for (const [cat, list] of groups.entries()) {
      if (sort === "alphabetical") {
        list.sort(
          (a, b) =>
            a.courseTitle.localeCompare(b.courseTitle) ||
            displayCourseCode(a).localeCompare(displayCourseCode(b)),
        );
      } else if (sort === "credits") {
        list.sort(
          (a, b) =>
            totalCredits(b) - totalCredits(a) ||
            a.courseTitle.localeCompare(b.courseTitle) ||
            displayCourseCode(a).localeCompare(displayCourseCode(b)),
        );
      } else {
        if (cat === "mandatory") {
          list.sort((a, b) => {
            const ya = mandatoryStudyYearForPeriods(a, activePeriods) ?? 9;
            const yb = mandatoryStudyYearForPeriods(b, activePeriods) ?? 9;
            if (ya !== yb) return ya - yb;
            return compareByPeriodThenTitle(a, b, activePeriods);
          });
        } else {
          list.sort((a, b) => compareByPeriodThenTitle(a, b, activePeriods));
        }
      }
    }

    return {
      activePeriods,
      groups,
      rankedCourses: null,
      total: matching.length,
      periodLabel: formatPeriods([...activePeriods]),
    };
  }, [
    courses,
    periods,
    studyYears,
    categories,
    showTaken,
    statusMap,
    sort,
    friendByCourseId,
    summaryByCourseId,
    auth.isAuthenticated,
    search,
    isOtherLibrary,
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <ProgrammePicker
          programmes={programmes}
          defaultProgrammeCode={defaultProgrammeCode}
          selectedProgrammeCode={programmeCode}
          onSelectProgramme={onSelectProgramme}
          compact
          className="sm:w-28 sm:shrink-0"
        />
        <div className="relative min-w-[260px] flex-1">
          <SearchIcon
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by course code or title…"
            type="search"
            className="h-12 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-[14px] text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-200 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-stone-600 dark:focus:ring-stone-800"
          />
        </div>
        {isOtherLibrary && (
          <button
            type="button"
            onClick={() =>
              auth.requireAuth(() => setAddOpen(true), {
                reason: "Sign in to add a course to the community library.",
              })
            }
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 text-[13.5px] font-medium text-stone-50 transition-colors hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
          >
            <PlusIcon size={14} />
            Add course
          </button>
        )}
      </div>

      {!grouped && <CourseListSkeleton rows={6} />}

      {grouped && grouped.total === 0 && (
        <EmptyState
          title="No courses match these filters"
          body={
            search.trim()
              ? "Try clearing the search or adjusting the filters."
              : isOtherLibrary
                ? "No community-added courses have been added yet."
                : "Adjust the show, year, or period filters in the sidebar to see more."
          }
        />
      )}

      {grouped && grouped.rankedCourses && (
        <section className="mt-10 first:mt-2">
          <div className="mb-4 flex items-center gap-3 border-b border-stone-200 pb-3 dark:border-stone-800">
            <h2 className="text-[15px] font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              Popularity
            </h2>
            <span className="font-mono text-[10.5px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
              {isOtherLibrary ? "Other" : grouped.periodLabel}
            </span>
            <span className="ml-auto font-mono text-[11px] text-stone-400 dark:text-stone-500">
              {grouped.rankedCourses.length} course
              {grouped.rankedCourses.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="stagger flex flex-col gap-3">
            {grouped.rankedCourses.map((c) => {
              const summary = summaryByCourseId.get(c._id as string);
              return (
                <CourseCard
                  key={c._id}
                  course={c}
                  programmeCode={programmeCode}
                  showProgrammeContext={false}
                  periods={grouped.activePeriods}
                  hasSummary={summary !== undefined}
                  summaryPreview={summary?.overview ?? null}
                  status={statusMap.get(c._id as string) ?? null}
                  friendsOnCourse={friendByCourseId.get(c._id as string)}
                  commentCount={commentCountMap.get(c._id as string) ?? 0}
                />
              );
            })}
          </div>
        </section>
      )}

      {grouped &&
        !grouped.rankedCourses &&
        ALL_CATEGORIES.map((cat) => {
          const list = grouped.groups.get(cat) ?? [];
          if (list.length === 0) return null;
          return (
            <section key={cat} className="mt-10 first:mt-2">
              <div className="mb-4 flex items-center gap-3 border-b border-stone-200 pb-3 dark:border-stone-800">
                <h2 className="text-[15px] font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                  {isOtherLibrary ? "Community courses" : CATEGORY_LABEL[cat]}
                </h2>
                <span className="font-mono text-[10.5px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
                  {isOtherLibrary ? "Other" : grouped.periodLabel}
                </span>
                <span className="ml-auto font-mono text-[11px] text-stone-400 dark:text-stone-500">
                  {list.length} course{list.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="stagger flex flex-col gap-3">
                {list.map((c) => {
                  const summary = summaryByCourseId.get(c._id as string);
                  return (
                    <CourseCard
                      key={c._id}
                      course={c}
                      programmeCode={programmeCode}
                      showProgrammeContext={false}
                      periods={grouped.activePeriods}
                      hasSummary={summary !== undefined}
                      summaryPreview={summary?.overview ?? null}
                      status={statusMap.get(c._id as string) ?? null}
                      friendsOnCourse={friendByCourseId.get(c._id as string)}
                      commentCount={commentCountMap.get(c._id as string) ?? 0}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}

      {addOpen && (
        <AddCommunityCourseDialog onClose={() => setAddOpen(false)} />
      )}
    </div>
  );
}

type KthLookupState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; normalizedCourseCode: string }
  | {
      status: "canonical" | "community";
      normalizedCourseCode: string;
      href: string;
    }
  | { status: "error"; message: string };

function AddCommunityCourseDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const convex = useConvex();
  const lookupRequestRef = useRef(0);
  const [mode, setMode] = useState<"kth" | "external">("kth");
  const [courseCode, setCourseCode] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [credits, setCredits] = useState("");
  const [selectedPeriods, setSelectedPeriods] = useState<Set<Period>>(
    () => new Set(),
  );
  const [link, setLink] = useState("");
  const [institution, setInstitution] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createKth = useMutation(api.courseData.createCommunityKthCourse);
  const createExternal = useMutation(
    api.courseData.createCommunityExternalCourse,
  );
  const [lookup, setLookup] = useState<KthLookupState>({ status: "idle" });

  function checkCourseCode(value: string) {
    const requestId = lookupRequestRef.current + 1;
    lookupRequestRef.current = requestId;

    if (value.trim().length === 0) {
      setLookup({ status: "idle" });
      return;
    }

    setLookup({ status: "checking" });
    void convex
      .query(api.courseData.lookupKthCourseCode, { courseCode: value })
      .then((result) => {
        if (lookupRequestRef.current !== requestId) return;

        if (result.status === "canonical" || result.status === "community") {
          setLookup({
            status: result.status,
            normalizedCourseCode: result.normalizedCourseCode,
            href: result.href,
          });
          return;
        }

        if (result.status === "available") {
          setLookup({
            status: "available",
            normalizedCourseCode: result.normalizedCourseCode,
          });
          return;
        }

        setLookup({ status: "idle" });
      })
      .catch((err: unknown) => {
        if (lookupRequestRef.current !== requestId) return;
        setLookup({
          status: "error",
          message:
            err instanceof Error
              ? err.message
              : "Could not check this course code.",
        });
      });
  }

  const parsedCredits = parseOptionalNumber(credits);
  const invalidCredits = credits.trim() !== "" && parsedCredits === null;
  const duplicate =
    lookup.status === "canonical" || lookup.status === "community"
      ? lookup
      : null;
  const canSubmit =
    !submitting &&
    !invalidCredits &&
    lookup.status !== "checking" &&
    (mode === "kth"
      ? courseCode.trim().length > 0 && duplicate === null
      : courseTitle.trim().length > 0);

  async function submitCourse() {
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      const result =
        mode === "kth"
          ? await createKth({
              courseCode,
              ...(courseTitle.trim() ? { courseTitle } : {}),
              ...(parsedCredits !== undefined && parsedCredits !== null
                ? { credits: parsedCredits }
                : {}),
              ...(selectedPeriods.size > 0
                ? { period: formatPeriods([...selectedPeriods]) }
                : {}),
              ...(link.trim() ? { link } : {}),
              ...(description.trim() ? { description } : {}),
            })
          : await createExternal({
              courseTitle,
              ...(parsedCredits !== undefined && parsedCredits !== null
                ? { credits: parsedCredits }
                : {}),
              ...(selectedPeriods.size > 0
                ? { period: formatPeriods([...selectedPeriods]) }
                : {}),
              ...(link.trim() ? { link } : {}),
              ...(institution.trim() ? { institution } : {}),
              ...(description.trim() ? { description } : {}),
            });

      onClose();
      navigate(result.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add course");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-stone-950/35 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Add community course"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitCourse();
        }}
        className="w-full max-w-2xl rounded-xl border border-stone-200 bg-white p-5 shadow-xl dark:border-stone-800 dark:bg-stone-950"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[18px] font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              Add course
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
              Add a KTH course by code, or add an external course from another
              institution.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center rounded-md border border-stone-200 px-3 text-[12.5px] font-medium text-stone-700 hover:border-stone-300 dark:border-stone-800 dark:text-stone-300 dark:hover:border-stone-700"
          >
            Close
          </button>
        </div>

        <div className="mb-5 inline-grid grid-cols-2 rounded-lg border border-stone-200 bg-stone-50 p-1 dark:border-stone-800 dark:bg-stone-900">
          {(["kth", "external"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setError(null);
                setLookup({ status: "idle" });
                if (value === "kth") {
                  checkCourseCode(courseCode);
                }
              }}
              className={[
                "h-9 rounded-md px-3 text-[13px] font-medium transition-colors",
                mode === value
                  ? "bg-white text-stone-900 shadow-sm dark:bg-stone-800 dark:text-stone-100"
                  : "text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100",
              ].join(" ")}
            >
              {value === "kth" ? "KTH course" : "External course"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {mode === "kth" ? (
            <Field label="Course code" required>
              <input
                value={courseCode}
                onChange={(event) => {
                  const value = event.target.value;
                  setCourseCode(value);
                  setError(null);
                  checkCourseCode(value);
                }}
                placeholder="DM2578"
                className={inputClass}
              />
            </Field>
          ) : (
            <Field label="Course name" required>
              <input
                value={courseTitle}
                onChange={(event) => {
                  setCourseTitle(event.target.value);
                  setError(null);
                }}
                placeholder="Interaction Design Studio"
                className={inputClass}
              />
            </Field>
          )}

          {mode === "kth" ? (
            <Field label="Course name">
              <input
                value={courseTitle}
                onChange={(event) => setCourseTitle(event.target.value)}
                placeholder="Can be filled in later"
                className={inputClass}
              />
            </Field>
          ) : (
            <Field label="Institution">
              <input
                value={institution}
                onChange={(event) => setInstitution(event.target.value)}
                placeholder="University or provider"
                className={inputClass}
              />
            </Field>
          )}

          <Field label="Credits">
            <input
              value={credits}
              onChange={(event) => setCredits(event.target.value)}
              placeholder="7.5"
              inputMode="decimal"
              className={inputClass}
            />
          </Field>
          <div className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-stone-700 dark:text-stone-300">
              Periods
            </span>
            <PeriodToggleRow
              selected={selectedPeriods}
              onChange={setSelectedPeriods}
            />
          </div>
          {mode === "external" && (
            <Field label="Link" className="sm:col-span-2">
              <input
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="https://"
                className={inputClass}
              />
            </Field>
          )}
          <Field label="Description" className="sm:col-span-2">
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Lightweight notes, syllabus context, or exchange details"
              className={`${inputClass} min-h-24 resize-y py-2`}
            />
          </Field>
        </div>

        {mode === "kth" && lookup.status === "checking" && (
          <p className="mt-3 text-[12.5px] text-stone-500 dark:text-stone-400">
            Checking course code...
          </p>
        )}
        {mode === "kth" && lookup.status === "available" && (
          <p className="mt-3 text-[12.5px] text-stone-500 dark:text-stone-400">
            {lookup.normalizedCourseCode} can be added to Other.
          </p>
        )}
        {mode === "kth" && lookup.status === "error" && (
          <p className="mt-3 text-[12.5px] text-red-600 dark:text-red-400">
            {lookup.message}
          </p>
        )}
        {duplicate && (
          <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3 text-[13px] dark:border-stone-800 dark:bg-stone-900">
            <p className="font-medium text-stone-900 dark:text-stone-100">
              {duplicate.status === "canonical"
                ? "This course already exists in the course library."
                : "This course has already been added."}
            </p>
            <Link
              to={duplicate.href}
              onClick={onClose}
              className="mt-2 inline-flex h-8 items-center rounded-md border border-stone-200 bg-white px-3 text-[12.5px] font-medium text-stone-900 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:hover:border-stone-700"
            >
              Open existing course
            </Link>
          </div>
        )}
        {invalidCredits && (
          <p className="mt-3 text-[12.5px] text-red-600 dark:text-red-400">
            Credits must be a number.
          </p>
        )}
        {error && (
          <p className="mt-3 text-[12.5px] text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-stone-200 pt-4 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-md border border-stone-200 px-3 text-[13px] font-medium text-stone-700 hover:border-stone-300 dark:border-stone-800 dark:text-stone-300 dark:hover:border-stone-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-9 items-center rounded-md bg-stone-900 px-4 text-[13px] font-medium text-stone-50 transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
          >
            {submitting ? "Adding" : "Add course"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-stone-200 bg-white px-3 text-[13.5px] text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-200 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-stone-600 dark:focus:ring-stone-800";

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-[12.5px] font-medium text-stone-700 dark:text-stone-300">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function parseOptionalNumber(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

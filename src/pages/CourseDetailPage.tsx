import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  coursePeriodLabels,
  courseRoute,
  displayCourseCode,
  displayCredits,
  formatCoursePeriods,
  formatCredits,
  formatPeriods,
  isCommunityCourse,
  isExternalCourse,
  mandatoryStudyYearLabel,
  periodsFromText,
  REQUIREMENT_GROUP_LABEL,
  totalCredits,
  type Period,
  type Course,
  type CourseProgrammeContext,
} from "../lib/course";
import { CategoryPill } from "../components/Pills";
import { PeriodToggleRow } from "../components/PeriodToggleRow";
import { StatusControls } from "../components/StatusControls";
import { CourseDiscussionCard } from "../components/CourseDiscussionCard";
import { ArrowLeftIcon, ExternalIcon } from "../lib/icons";
import { CourseListSkeleton, EmptyState } from "../components/States";
import { useAuthContext } from "../lib/authContextValue";
import { MonoChip } from "../components/Primitives";
import { FriendCoursePeopleRows } from "../components/FriendCoursePeopleRows";
import {
  friendsOnSingleCourseFromPayload,
  type FriendsCourseActivityPayload,
} from "../lib/friendsCourseActivity";

export function CourseDetailPage() {
  const { courseCode } = useParams<{ courseCode: string }>();
  const [searchParams] = useSearchParams();
  const identifier = courseCode ?? "";
  const code = identifier.toUpperCase();
  const programmeCode = searchParams.get("programme") ?? undefined;
  const [editing, setEditing] = useState(false);

  const data = useQuery(
    api.courseData.getCourseByIdentifier,
    programmeCode ? { identifier, programmeCode } : { identifier },
  );
  const auth = useAuthContext();
  const statuses = useQuery(
    api.courseStatuses.getMyCourseStatuses,
    auth.isAuthenticated ? {} : "skip",
  );

  const glanceFriendsPayload = useQuery(
    api.friendGroups.friendsCourseActivity,
    auth.isAuthenticated && data?.course !== undefined && data?.course !== null
      ? { courseId: data.course._id }
      : "skip",
  );

  const glanceFriends = useMemo(
    () =>
      friendsOnSingleCourseFromPayload(
        glanceFriendsPayload as FriendsCourseActivityPayload | undefined,
      ),
    [glanceFriendsPayload],
  );

  if (data === undefined) {
    return (
      <div>
        <BackLink />
        <CourseListSkeleton rows={2} />
      </div>
    );
  }

  if (data === null) {
    return (
      <div>
        <BackLink />
        <EmptyState
          title={`No course "${code}"`}
          body="Double-check the course code, or browse the course catalogue."
          action={
            <Link
              to="/"
              className="inline-flex h-9 items-center rounded-md border border-stone-200 bg-white px-3 text-[13px] font-medium text-stone-900 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
            >
              Back to all courses
            </Link>
          }
        />
      </div>
    );
  }

  const { course, studentSummary } = data;
  const selectedContext =
    data.programme !== null && data.programmeCourse !== null
      ? {
          programme: data.programme,
          programmeCourse: data.programmeCourse,
        }
      : null;
  const displayContext = selectedContext;
  const courseForDisplay = courseWithContext(
    course,
    displayContext,
    data.programmeContexts,
  );
  const visibleCourseCode = displayCourseCode(course);
  const community = isCommunityCourse(course);
  const external = isExternalCourse(course);
  const periodLabel =
    formatCoursePeriods(courseForDisplay) ||
    (course.period
      ? course.period
      : data.programmeContexts.length > 0
        ? "Programme-specific"
        : "Not listed");
  const status =
    (statuses ?? []).find((p) => p.status.courseId === course._id)?.status
      .status ?? null;

  return (
    <article>
      <BackLink />
      <DetailHeader
        course={courseForDisplay}
        status={status}
        programme={selectedContext?.programme ?? null}
        onEdit={
          community
            ? () =>
                auth.requireAuth(() => setEditing(true), {
                  reason: "Sign in to edit community-added course metadata.",
                })
            : undefined
        }
      />

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          {studentSummary ? (
            <StudentSummary summary={studentSummary} />
          ) : (
            <NoSummary />
          )}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <div className="mb-2 font-mono text-[10.5px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
              At a glance
            </div>
            <div className="font-mono text-[13px] text-stone-900 dark:text-stone-100">
              {visibleCourseCode}
            </div>
            <dl className="mt-4 flex flex-col gap-2.5 text-[13px]">
              <Row
                k="Credits"
                v={
                  courseForDisplay.offerings.length > 0
                    ? formatCredits(totalCredits(courseForDisplay))
                    : displayCredits(courseForDisplay)
                }
              />
              <Row k="Periods" v={periodLabel} />
              {course.institution && (
                <Row k="Institution" v={course.institution} />
              )}
              {selectedContext ? (
                <Row
                  k="Programme"
                  v={selectedContext.programme.programmeCode}
                />
              ) : (
                <Row
                  k="Programmes"
                  v={
                    data.programmeContexts.length > 0
                      ? data.programmeContexts
                          .map((context) => context.programme.programmeCode)
                          .join(", ")
                      : community
                        ? "Other"
                        : "Not listed"
                  }
                />
              )}
              {courseForDisplay.requirementGroup && (
                <Row
                  k="Requirement"
                  v={REQUIREMENT_GROUP_LABEL[courseForDisplay.requirementGroup]}
                />
              )}
              {courseForDisplay.offerings.map((o, i) => (
                <Row
                  key={i}
                  k={`Year ${o.studyYear} · ${o.academicYear}`}
                  v={
                    o.category === "mandatory"
                      ? "Mandatory"
                      : o.category === "conditionally_elective"
                        ? "Cond. elective"
                        : "Recommended"
                  }
                />
              ))}
            </dl>
            {glanceFriends && (
              <div className="mt-5 border-t border-stone-200 pt-5 dark:border-stone-800">
                <FriendCoursePeopleRows
                  saved={glanceFriends.saved}
                  taking={glanceFriends.taking}
                  taken={glanceFriends.taken}
                />
              </div>
            )}
          </div>

          {course.officialKthUrl && (
            <a
              href={course.officialKthUrl}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl border border-stone-200 bg-white p-5 transition-colors hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
            >
              <div className="mb-2 font-mono text-[10.5px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
                {external ? "Course link" : "Official KTH page"}
              </div>
              <div className="flex items-center gap-1.5 text-[14px] font-medium text-stone-900 dark:text-stone-100">
                {external
                  ? course.courseTitle
                  : `${course.courseCode} • kth.se`}
                <ExternalIcon size={13} className="text-stone-500" />
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-stone-500 dark:text-stone-400">
                {external
                  ? "External course information."
                  : "Full syllabus, learning outcomes, application info."}
              </p>
            </a>
          )}

          {data.programmeContexts.length > 1 && (
            <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
              <div className="mb-2 font-mono text-[10.5px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
                Programme contexts
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.programmeContexts.map((context) => (
                  <Link
                    key={context.programme._id}
                    to={courseRoute(course, context.programme.programmeCode)}
                    className="rounded-md border border-stone-200 px-2 py-1 font-mono text-[11px] text-stone-700 transition-colors hover:border-stone-300 dark:border-stone-800 dark:text-stone-300 dark:hover:border-stone-700"
                  >
                    {context.programme.programmeCode}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {courseForDisplay.programmeNotes &&
            courseForDisplay.programmeNotes.length > 0 && (
              <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
                <div className="mb-2 font-mono text-[10.5px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
                  Programme notes
                </div>
                <ul className="flex flex-col gap-2">
                  {courseForDisplay.programmeNotes.map((note, i) => (
                    <li
                      key={i}
                      className="text-[12.5px] leading-relaxed text-stone-600 dark:text-stone-400"
                    >
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          <CourseDiscussionCard
            courseId={course._id}
            courseCode={visibleCourseCode}
          />
        </aside>
      </div>
      {course.description && (
        <section className="mt-10 border-t border-stone-200 pt-8 dark:border-stone-800">
          <h2 className="mb-3 font-mono text-[10.5px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
            Community notes
          </h2>
          <p className="max-w-[60ch] whitespace-pre-wrap text-[14.5px] leading-relaxed text-stone-700 dark:text-stone-300">
            {course.description}
          </p>
        </section>
      )}
      {editing && (
        <EditCommunityCourseDialog
          course={courseForDisplay}
          onClose={() => setEditing(false)}
        />
      )}
    </article>
  );
}

function courseWithContext(
  course: Omit<Course, "offerings">,
  context: CourseProgrammeContext | null,
  programmeContexts: CourseProgrammeContext[],
): Course {
  return {
    ...course,
    offerings: context?.programmeCourse.offerings ?? [],
    programmeNotes: context?.programmeCourse.programmeNotes,
    requirementGroup: context?.programmeCourse.requirementGroup,
    programmeContexts,
  };
}

function EditCommunityCourseDialog({
  course,
  onClose,
}: {
  course: Course;
  onClose: () => void;
}) {
  const updateCourse = useMutation(api.courseData.updateCommunityCourse);
  const [courseTitle, setCourseTitle] = useState(course.courseTitle);
  const [credits, setCredits] = useState(
    course.credits === undefined ? "" : String(course.credits),
  );
  const [selectedPeriods, setSelectedPeriods] = useState<Set<Period>>(() =>
    periodsFromText(course.period),
  );
  const [link, setLink] = useState(course.link ?? course.officialKthUrl ?? "");
  const [institution, setInstitution] = useState(course.institution ?? "");
  const [description, setDescription] = useState(course.description ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const external = isExternalCourse(course);
  const parsedCredits = parseOptionalCourseNumber(credits);
  const invalidCredits = credits.trim() !== "" && parsedCredits === null;
  const canSubmit =
    !submitting && courseTitle.trim().length > 0 && !invalidCredits;

  async function submitCourse() {
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      await updateCourse({
        courseId: course._id,
        courseTitle,
        credits: parsedCredits === undefined ? null : parsedCredits,
        period:
          selectedPeriods.size > 0 ? formatPeriods([...selectedPeriods]) : null,
        link: link.trim() ? link : null,
        ...(external
          ? { institution: institution.trim() ? institution : null }
          : {}),
        description: description.trim() ? description : null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update course");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-stone-950/35 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Edit community course"
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
              Edit course
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
              Community metadata can be improved by any signed-in user.
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!external && (
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-medium text-stone-700 dark:text-stone-300">
                Course code
              </span>
              <input
                value={course.courseCode}
                disabled
                className={`${courseInputClass} cursor-not-allowed bg-stone-50 text-stone-500 dark:bg-stone-900 dark:text-stone-500`}
              />
            </label>
          )}
          <label className={external ? "block sm:col-span-2" : "block"}>
            <span className="mb-1.5 block text-[12.5px] font-medium text-stone-700 dark:text-stone-300">
              Course name
            </span>
            <input
              value={courseTitle}
              onChange={(event) => setCourseTitle(event.target.value)}
              className={courseInputClass}
            />
          </label>
          {external && (
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-medium text-stone-700 dark:text-stone-300">
                Institution
              </span>
              <input
                value={institution}
                onChange={(event) => setInstitution(event.target.value)}
                className={courseInputClass}
              />
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-stone-700 dark:text-stone-300">
              Credits
            </span>
            <input
              value={credits}
              onChange={(event) => setCredits(event.target.value)}
              inputMode="decimal"
              className={courseInputClass}
            />
          </label>
          <div className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-stone-700 dark:text-stone-300">
              Periods
            </span>
            <PeriodToggleRow
              selected={selectedPeriods}
              onChange={setSelectedPeriods}
            />
          </div>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[12.5px] font-medium text-stone-700 dark:text-stone-300">
              Link
            </span>
            <input
              value={link}
              onChange={(event) => setLink(event.target.value)}
              className={courseInputClass}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[12.5px] font-medium text-stone-700 dark:text-stone-300">
              Description
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className={`${courseInputClass} min-h-24 resize-y py-2`}
            />
          </label>
        </div>

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
            {submitting ? "Saving" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

const courseInputClass =
  "h-10 w-full rounded-md border border-stone-200 bg-white px-3 text-[13.5px] text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-200 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-stone-600 dark:focus:ring-stone-800";

function parseOptionalCourseNumber(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function BackLink() {
  return (
    <Link
      to="/"
      className="mb-8 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-stone-400 hover:text-stone-900 dark:text-stone-500 dark:hover:text-stone-100"
    >
      <ArrowLeftIcon size={12} /> All courses
    </Link>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-stone-500 dark:text-stone-400">{k}</dt>
      <dd className="font-mono text-[12px] text-stone-900 dark:text-stone-100">
        {v}
      </dd>
    </div>
  );
}

function DetailHeader({
  course,
  status,
  programme,
  onEdit,
}: {
  course: Course;
  status: "saved" | "taking" | "taken" | null;
  programme: { programmeCode: string; programmeName: string } | null;
  onEdit?: () => void;
}) {
  const primary = course.offerings[0];
  const mandatoryYear = mandatoryStudyYearLabel(course);
  const periodLabels = coursePeriodLabels(course);
  const visibleCourseCode = displayCourseCode(course);
  const community = isCommunityCourse(course);
  const external = isExternalCourse(course);
  return (
    <header className="mb-10 border-b border-stone-200 pb-8 dark:border-stone-800">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <MonoChip>{visibleCourseCode}</MonoChip>
            {community && !external && (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                Community added
              </span>
            )}
            {external && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                External
              </span>
            )}
            {primary && (
              <CategoryPill
                category={primary.category}
                yearLabel={mandatoryYear}
              />
            )}
            {programme && <MonoChip>{programme.programmeCode}</MonoChip>}
            {course.requirementGroup && (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                {REQUIREMENT_GROUP_LABEL[course.requirementGroup]}
              </span>
            )}
          </div>
          <h1 className="mt-4 max-w-[24ch] text-[2.2rem] font-semibold leading-[1.1] tracking-tightest text-stone-900 sm:text-[2.6rem] dark:text-stone-100">
            {course.courseTitle}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13.5px] text-stone-500 dark:text-stone-400">
            <span>{displayCredits(course)}</span>
            {periodLabels.length > 0 && (
              <>
                <Dot />
                <span>{periodLabels.join(" or ")}</span>
              </>
            )}
            {periodLabels.length === 0 && course.period && (
              <>
                <Dot />
                <span>{course.period}</span>
              </>
            )}
            {course.institution && (
              <>
                <Dot />
                <span>{course.institution}</span>
              </>
            )}
            {programme && (
              <>
                <Dot />
                <span>{programme.programmeName}</span>
              </>
            )}
            <Dot />
            {course.officialKthUrl ? (
              <a
                href={course.officialKthUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100"
              >
                {external ? "Course link" : "Official KTH page"}{" "}
                <ExternalIcon size={12} />
              </a>
            ) : (
              <span>{community ? "Other library" : "No official link"}</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-8 items-center rounded-md border border-stone-200 bg-white px-3 text-[12.5px] font-medium text-stone-900 transition-colors hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-stone-700"
            >
              Edit
            </button>
          )}
          <StatusControls
            courseId={course._id}
            courseCode={visibleCourseCode}
            status={status}
          />
        </div>
      </div>
    </header>
  );
}

function Dot() {
  return <span className="text-current">•</span>;
}

function StudentSummary({
  summary,
}: {
  summary: {
    reflectionCount: number;
    studentSummary: {
      overview: string;
      commonlyPraised: string[];
      commonlyCriticised: string[];
      workloadAndPacing: string | null;
      teachingAndStructure: string;
      assignmentsProjectsAndAssessment: string;
      adviceFromStudents: string[];
      importantCaveats: string[];
    };
  };
}) {
  const s = summary.studentSummary;
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="font-mono text-[10.5px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
          Student perspective
        </span>
        <span className="h-1 w-1 rounded-full bg-stone-300 dark:bg-stone-700" />
        <span className="font-mono text-[10.5px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
          Aggregated from {summary.reflectionCount} reflection
          {summary.reflectionCount === 1 ? "" : "s"}
        </span>
      </div>

      <p className="max-w-[58ch] text-[17.5px] leading-relaxed text-stone-700 dark:text-stone-300">
        {s.overview}
      </p>

      {(s.commonlyPraised.length > 0 || s.commonlyCriticised.length > 0) && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {s.commonlyPraised.length > 0 && (
            <PointBlock
              title="Commonly praised"
              items={s.commonlyPraised}
              tone="praised"
            />
          )}
          {s.commonlyCriticised.length > 0 && (
            <PointBlock
              title="Commonly criticised"
              items={s.commonlyCriticised}
              tone="criticised"
            />
          )}
        </div>
      )}

      {s.workloadAndPacing && (
        <SubSection title="Workload & pacing">
          <p>{s.workloadAndPacing}</p>
        </SubSection>
      )}

      <SubSection title="Teaching & structure">
        <p>{s.teachingAndStructure}</p>
      </SubSection>

      <SubSection title="Assignments, projects & assessment">
        <p>{s.assignmentsProjectsAndAssessment}</p>
      </SubSection>

      {s.adviceFromStudents.length > 0 && (
        <SubSection title="Advice from students">
          <ol className="flex flex-col gap-2">
            {s.adviceFromStudents.map((a, i) => (
              <li
                key={i}
                className="grid grid-cols-[28px_1fr] gap-3 rounded-lg bg-stone-50 px-3 py-2.5 text-[14px] leading-relaxed text-stone-700 dark:bg-stone-900/60 dark:text-stone-300"
              >
                <span className="font-mono text-[11px] text-stone-400 dark:text-stone-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{a}</span>
              </li>
            ))}
          </ol>
        </SubSection>
      )}

      {s.importantCaveats.length > 0 && (
        <SubSection title="Worth knowing">
          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 dark:border-stone-800 dark:bg-stone-900/40">
            <ul className="flex flex-col gap-1.5">
              {s.importantCaveats.map((c, i) => (
                <li
                  key={i}
                  className="relative pl-4 text-[13px] leading-relaxed text-stone-600 dark:text-stone-400"
                >
                  <span className="absolute left-0 top-0 text-stone-300 dark:text-stone-600">
                    ※
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </SubSection>
      )}
    </div>
  );
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h3 className="mb-3 border-b border-dashed border-stone-200 pb-2 font-mono text-[10.5px] uppercase tracking-widest text-stone-400 dark:border-stone-800 dark:text-stone-500">
        {title}
      </h3>
      <div className="max-w-[60ch] text-[14.5px] leading-relaxed text-stone-700 dark:text-stone-300">
        {children}
      </div>
    </section>
  );
}

function PointBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "praised" | "criticised";
}) {
  return (
    <div
      className={
        "relative rounded-xl border border-stone-200 bg-white p-4 pl-5 dark:border-stone-800 dark:bg-stone-900"
      }
    >
      <span
        aria-hidden
        className={
          "absolute inset-y-3 left-0 w-[3px] rounded-full " +
          (tone === "praised" ? "bg-emerald-500" : "bg-rose-500")
        }
      />
      <h4 className="mb-2 text-[11.5px] font-semibold uppercase tracking-widest text-stone-700 dark:text-stone-200">
        {title}
      </h4>
      <ul className="flex flex-col gap-1.5">
        {items.map((p, i) => (
          <li
            key={i}
            className="relative pl-3 text-[13.5px] leading-relaxed text-stone-700 dark:text-stone-300"
          >
            <span className="absolute left-0 top-2 h-1 w-1 rounded-full bg-stone-400 dark:bg-stone-500" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NoSummary() {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="font-mono text-[10.5px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
          Student perspective
        </span>
      </div>
      <div className="rounded-xl border border-dashed border-stone-200 bg-white/60 p-7 text-left dark:border-stone-800 dark:bg-stone-900/40">
        <h3 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          No aggregated student reflections yet
        </h3>
        <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-stone-500 dark:text-stone-400">
          We haven't gathered enough student reflections to summarise this
          course yet. Use the official KTH page for the formal syllabus, and
          check back later — summaries grow as more reflections come in.
        </p>
      </div>
    </div>
  );
}

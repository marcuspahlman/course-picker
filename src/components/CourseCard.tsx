import { useNavigate } from "react-router-dom";
import {
  type Course,
  type Period,
  REQUIREMENT_GROUP_LABEL,
  coursePeriodLabels,
  courseRoute,
  dominantCategoryForPeriods,
  displayCourseCode,
  displayCredits,
  isCommunityCourse,
  isExternalCourse,
  mandatoryStudyYearLabel,
} from "../lib/course";
import { CategoryPill } from "./Pills";
import { StatusControls } from "./StatusControls";
import { MonoChip } from "./Primitives";
import { FriendCoursePeopleRows } from "./FriendCoursePeopleRows";
import type { FriendsOnCourse } from "../lib/friendsCourseActivity";
import { ChatBubbleIcon } from "../lib/icons";

type Props = {
  course: Course;
  programmeCode?: string | null;
  showProgrammeContext?: boolean;
  periods?: ReadonlySet<Period>;
  summaryPreview?: string | null;
  hasSummary: boolean;
  status: "saved" | "taking" | "taken" | null;
  friendsOnCourse?: FriendsOnCourse | null;
  commentCount?: number;
};

export function CourseCard({
  course,
  programmeCode,
  showProgrammeContext = true,
  periods: periodFilter,
  summaryPreview,
  hasSummary,
  status,
  friendsOnCourse,
  commentCount = 0,
}: Props) {
  const navigate = useNavigate();
  const category = periodFilter
    ? dominantCategoryForPeriods(course, periodFilter)
    : null;
  const mandatoryYear = mandatoryStudyYearLabel(course, periodFilter);
  const periodLabels = coursePeriodLabels(course, periodFilter);
  const isCommunity = isCommunityCourse(course);
  const external = isExternalCourse(course);
  const visibleCourseCode = displayCourseCode(course);
  const programmeCodes =
    course.programmeContexts?.map(
      (context) => context.programme.programmeCode,
    ) ?? [];
  const href = courseRoute(course, programmeCode);

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => navigate(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(href);
        }
      }}
      className="group cursor-pointer rounded-xl border border-stone-200 bg-white p-6 transition-all duration-200 hover:border-stone-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-6">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <MonoChip>{visibleCourseCode}</MonoChip>
            {isCommunity && !external && (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                Community added
              </span>
            )}
            {external && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                External
              </span>
            )}
            {category && (
              <CategoryPill category={category} yearLabel={mandatoryYear} />
            )}
            {course.requirementGroup && (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                {REQUIREMENT_GROUP_LABEL[course.requirementGroup]}
              </span>
            )}
          </div>
          <h3 className="text-[1.2rem] font-semibold leading-snug tracking-tight text-stone-900 dark:text-stone-100">
            {course.courseTitle}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] text-stone-500 dark:text-stone-400">
            <span>{displayCredits(course)}</span>
            {periodLabels.length > 0 && (
              <>
                <span className="text-current">•</span>
                <span>{periodLabels.join(" or ")}</span>
              </>
            )}
            {periodLabels.length === 0 && course.period && (
              <>
                <span className="text-current">•</span>
                <span>{course.period}</span>
              </>
            )}
            {course.institution && (
              <>
                <span className="text-current">•</span>
                <span>{course.institution}</span>
              </>
            )}
            {showProgrammeContext && programmeCodes.length > 0 && (
              <>
                <span className="text-current">•</span>
                <span>
                  {programmeCodes.length === 1
                    ? programmeCodes[0]
                    : `Programmes ${programmeCodes.join(", ")}`}
                </span>
              </>
            )}
            {!hasSummary && (
              <>
                <span className="text-current">•</span>
                <span className="text-stone-400 dark:text-stone-500">
                  No student summary yet
                </span>
              </>
            )}
          </div>
          {summaryPreview && (
            <p className="mt-3 line-clamp-2 max-w-[60ch] text-[14px] leading-relaxed text-stone-600 dark:text-stone-300">
              {summaryPreview}
            </p>
          )}

          {friendsOnCourse && (
            <FriendCoursePeopleRows
              saved={friendsOnCourse.saved}
              taking={friendsOnCourse.taking}
              taken={friendsOnCourse.taken}
              className="mt-4"
            />
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 lg:flex-col lg:items-end lg:justify-between lg:gap-2">
          <StatusControls
            courseId={course._id}
            courseCode={visibleCourseCode}
            status={status}
            size="sm"
          />
          {commentCount > 0 && <CommentCountChip count={commentCount} />}
        </div>
      </div>
    </article>
  );
}

function CommentCountChip({ count }: { count: number }) {
  return (
    <span
      aria-label={`${count} discussion comment${count === 1 ? "" : "s"}`}
      title={`${count} discussion comment${count === 1 ? "" : "s"}`}
      className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 font-mono text-[11px] text-stone-600 dark:bg-stone-800 dark:text-stone-300"
    >
      <ChatBubbleIcon size={11} />
      {count}
    </span>
  );
}

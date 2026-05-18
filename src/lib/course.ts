import type { Doc } from "../../convex/_generated/dataModel";

export type CourseOffering = Doc<"programmeCourses">["offerings"][number];
export type CourseCategory = CourseOffering["category"];
export type RequirementGroup = NonNullable<
  Doc<"programmeCourses">["requirementGroup"]
>;
export type CourseProgrammeContext = {
  programme: Doc<"programmes">;
  programmeCourse: Doc<"programmeCourses">;
};
export type Course = Doc<"courses"> & {
  offerings: Doc<"programmeCourses">["offerings"];
  programmeNotes?: Doc<"programmeCourses">["programmeNotes"];
  requirementGroup?: Doc<"programmeCourses">["requirementGroup"];
  programmeContexts?: CourseProgrammeContext[];
};
export type StudentSummary = Doc<"courseStudentSummaries"> | null;

export const OTHER_LIBRARY_CODE = "Other";
export const OTHER_LIBRARY_NAME = "Community added courses";
export const ALL_LIBRARY_CODE = "All";
export const ALL_LIBRARY_NAME = "All courses";

export const ALL_PERIODS = ["P1", "P2", "P3", "P4"] as const;
export type Period = (typeof ALL_PERIODS)[number];

export const ALL_STUDY_YEARS = [1, 2] as const;
export type StudyYear = (typeof ALL_STUDY_YEARS)[number];

export const ALL_CATEGORIES: CourseCategory[] = [
  "mandatory",
  "conditionally_elective",
  "recommended",
];

export const CATEGORY_LABEL: Record<CourseCategory, string> = {
  mandatory: "Mandatory",
  conditionally_elective: "Conditionally elective",
  recommended: "Recommended",
};

export const CATEGORY_SHORT: Record<CourseCategory, string> = {
  mandatory: "Mandatory",
  conditionally_elective: "Conditionally elective",
  recommended: "Recommended",
};

export const REQUIREMENT_GROUP_LABEL: Record<RequirementGroup, string> = {
  theory: "Theory",
  application_domain: "Application domain",
};

const CATEGORY_ORDER: Record<CourseCategory, number> = {
  mandatory: 0,
  conditionally_elective: 1,
  recommended: 2,
};

function isPeriod(value: string): value is Period {
  return ALL_PERIODS.includes(value as Period);
}

function offeringPeriods(offering: CourseOffering): Period[] {
  const periodsFromCredits = Object.entries(offering.periodCredits)
    .filter(([, credits]) => typeof credits === "number" && credits > 0)
    .map(([period]) => period)
    .filter(isPeriod);

  if (periodsFromCredits.length > 0) {
    return ALL_PERIODS.filter((p) => periodsFromCredits.includes(p));
  }

  return ALL_PERIODS.filter((p) => offering.periods.includes(p));
}

export function offeringsInPeriod(
  course: Course,
  period: Period,
): CourseOffering[] {
  return course.offerings.filter((o) => offeringPeriods(o).includes(period));
}

export function offeringsInPeriods(
  course: Course,
  periods: ReadonlySet<Period>,
): CourseOffering[] {
  return course.offerings.filter((o) =>
    offeringPeriods(o).some((period) => periods.has(period)),
  );
}

export function dominantCategoryForPeriod(
  course: Course,
  period: Period,
): CourseCategory | null {
  const offerings = offeringsInPeriod(course, period);
  if (offerings.length === 0) return null;
  return offerings
    .map((o) => o.category)
    .sort((a, b) => CATEGORY_ORDER[a] - CATEGORY_ORDER[b])[0];
}

export function dominantCategoryForPeriods(
  course: Course,
  periods: ReadonlySet<Period>,
): CourseCategory | null {
  const offerings = offeringsInPeriods(course, periods);
  if (offerings.length === 0) return null;
  return offerings
    .map((o) => o.category)
    .sort((a, b) => CATEGORY_ORDER[a] - CATEGORY_ORDER[b])[0];
}

export function mandatoryStudyYearForPeriod(
  course: Course,
  period: Period,
): number | null {
  const mandatory = offeringsInPeriod(course, period).find(
    (o) => o.category === "mandatory",
  );
  return mandatory?.studyYear ?? null;
}

export function mandatoryStudyYearForPeriods(
  course: Course,
  periods: ReadonlySet<Period>,
): number | null {
  const mandatory = offeringsInPeriods(course, periods).find(
    (o) => o.category === "mandatory",
  );
  return mandatory?.studyYear ?? null;
}

export function mandatoryStudyYearsForPeriods(
  course: Course,
  periods?: ReadonlySet<Period>,
): number[] {
  const offerings = periods
    ? offeringsInPeriods(course, periods)
    : course.offerings;
  const years = new Set<number>();

  for (const offering of offerings) {
    if (offering.category === "mandatory") {
      years.add(offering.studyYear);
    }
  }

  return [...years].sort((a, b) => a - b);
}

export function formatStudyYears(years: number[]): string | null {
  if (years.length === 0) return null;

  const parts: string[] = [];
  let start = years[0];
  let end = start;

  for (let i = 1; i <= years.length; i++) {
    const current = i < years.length ? years[i] : Number.NaN;
    if (current === end + 1) {
      end = current;
      continue;
    }

    parts.push(start === end ? String(start) : `${start}-${end}`);
    start = current;
    end = current;
  }

  return parts.join(", ");
}

function periodCreditSignature(offering: CourseOffering): string {
  return ALL_PERIODS.map((period) => {
    const credits = offering.periodCredits[period] ?? 0;
    return `${period}:${credits}`;
  }).join("|");
}

function usesAlternativeMandatoryYears(offerings: CourseOffering[]): boolean {
  if (offerings.length < 2) return false;
  const signatures = new Set(offerings.map(periodCreditSignature));
  return signatures.size > 1;
}

export function mandatoryStudyYearLabel(
  course: Course,
  periods?: ReadonlySet<Period>,
): string | null {
  const offerings = periods
    ? offeringsInPeriods(course, periods)
    : course.offerings;
  const mandatoryOfferings = offerings.filter(
    (o) => o.category === "mandatory",
  );
  const years = [...new Set(mandatoryOfferings.map((o) => o.studyYear))].sort(
    (a, b) => a - b,
  );

  if (years.length === 0) return null;
  if (usesAlternativeMandatoryYears(mandatoryOfferings)) {
    return years.join(" or ");
  }

  return formatStudyYears(years);
}

export function creditsForPeriod(course: Course, period: Period): number {
  const offerings = offeringsInPeriod(course, period);
  if (offerings.length === 0) {
    const coursePeriods = ALL_PERIODS.filter((p) =>
      periodsFromText(course.period).has(p),
    );

    if (
      course.credits === undefined ||
      coursePeriods.length === 0 ||
      !coursePeriods.includes(period)
    ) {
      return 0;
    }

    return course.credits / coursePeriods.length;
  }

  return Math.max(
    ...offerings.map((offering) => offering.periodCredits[period] ?? 0),
  );
}

export function totalCredits(course: Course): number {
  const offerings = course.offerings;
  if (offerings.length === 0) return course.credits ?? 0;
  return Math.max(...offerings.map((o) => o.credits));
}

export function distinctPeriods(course: Course): Period[] {
  const set = new Set<Period>();
  for (const offering of course.offerings) {
    for (const period of offeringPeriods(offering)) {
      set.add(period);
    }
  }
  return ALL_PERIODS.filter((p) => set.has(p));
}

export function distinctPeriodsForSelection(
  course: Course,
  periods: ReadonlySet<Period>,
): Period[] {
  const set = new Set<Period>();
  for (const offering of offeringsInPeriods(course, periods)) {
    for (const period of offeringPeriods(offering)) {
      set.add(period);
    }
  }
  return ALL_PERIODS.filter((p) => set.has(p));
}

export function formatPeriods(periods: Period[]): string {
  if (periods.length === 0) return "";

  const sortedPeriods = ALL_PERIODS.filter((p) => periods.includes(p));
  const parts: string[] = [];
  let start = ALL_PERIODS.indexOf(sortedPeriods[0]);
  let end = start;

  for (let i = 1; i <= sortedPeriods.length; i++) {
    const current =
      i < sortedPeriods.length ? ALL_PERIODS.indexOf(sortedPeriods[i]) : -1;
    if (current === end + 1) {
      end = current;
      continue;
    }

    parts.push(
      start === end
        ? ALL_PERIODS[start]
        : `${ALL_PERIODS[start]}-${ALL_PERIODS[end]}`,
    );
    start = current;
    end = current;
  }

  return parts.join(", ");
}

export function periodsFromText(value: string | undefined | null): Set<Period> {
  const selected = new Set<Period>();
  if (!value) return selected;

  const normalized = value.toUpperCase();
  for (const period of ALL_PERIODS) {
    if (new RegExp(`\\b${period}\\b`).test(normalized)) {
      selected.add(period);
    }
  }

  for (const match of normalized.matchAll(/\bP([1-4])\s*-\s*P([1-4])\b/g)) {
    const start = Number(match[1]);
    const end = Number(match[2]);
    const [from, to] = start <= end ? [start, end] : [end, start];
    for (let period = from; period <= to; period += 1) {
      selected.add(`P${period}` as Period);
    }
  }

  return selected;
}

export function coursePeriodLabels(
  course: Course,
  periods?: ReadonlySet<Period>,
): string[] {
  const ranges = new Map<string, number>();
  const offerings = periods
    ? offeringsInPeriods(course, periods)
    : course.offerings;

  if (offerings.length === 0) {
    const storedPeriods = periodsFromText(course.period);
    const filteredPeriods = ALL_PERIODS.filter(
      (period) =>
        storedPeriods.has(period) && (!periods || periods.has(period)),
    );

    return filteredPeriods.length > 0 ? [formatPeriods(filteredPeriods)] : [];
  }

  for (const offering of offerings) {
    const offeringPeriodList = offeringPeriods(offering);
    if (offeringPeriodList.length === 0) continue;

    const label = formatPeriods(offeringPeriodList);
    const firstPeriodIndex = ALL_PERIODS.indexOf(offeringPeriodList[0]);
    const previousIndex = ranges.get(label);
    if (previousIndex === undefined || firstPeriodIndex < previousIndex) {
      ranges.set(label, firstPeriodIndex);
    }
  }

  return [...ranges.entries()]
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .map(([label]) => label);
}

export function formatCoursePeriods(
  course: Course,
  periods?: ReadonlySet<Period>,
): string {
  return coursePeriodLabels(course, periods).join(", ");
}

export function formatCredits(credits: number): string {
  if (Number.isInteger(credits)) return `${credits} hp`;
  return `${credits.toFixed(1)} hp`;
}

export function isCommunityCourse(course: Pick<Doc<"courses">, "source">) {
  return course.source === "community";
}

export function isExternalCourse(
  course: Pick<Doc<"courses">, "courseType" | "source">,
) {
  return course.source === "community" && course.courseType === "external";
}

export function displayCourseCode(course: Doc<"courses">): string {
  return isExternalCourse(course) ? "External" : course.courseCode;
}

export function courseRoute(
  course: Pick<
    Doc<"courses">,
    "canonicalSlug" | "courseCode" | "courseType" | "source"
  >,
  programmeCode?: string | null,
): string {
  const identifier = isExternalCourse(course)
    ? course.canonicalSlug
    : course.courseCode;
  const programme =
    programmeCode &&
    programmeCode !== OTHER_LIBRARY_CODE &&
    programmeCode !== ALL_LIBRARY_CODE
      ? `?programme=${encodeURIComponent(programmeCode)}`
      : "";
  return `/course/${encodeURIComponent(identifier)}${programme}`;
}

export function displayCredits(course: Course): string {
  if (course.credits !== undefined) {
    return formatCredits(course.credits);
  }

  const credits = totalCredits(course);
  return credits > 0 ? formatCredits(credits) : "Credits not set";
}

export function sortByCategoryThenCode(
  courses: Array<{ course: Course; period: Period }>,
): Array<{ course: Course; period: Period }> {
  return [...courses].sort((a, b) => {
    const ca = dominantCategoryForPeriod(a.course, a.period);
    const cb = dominantCategoryForPeriod(b.course, b.period);
    if (ca && cb) {
      const diff = CATEGORY_ORDER[ca] - CATEGORY_ORDER[cb];
      if (diff !== 0) return diff;
    }
    return a.course.courseCode.localeCompare(b.course.courseCode);
  });
}

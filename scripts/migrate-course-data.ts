import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type ProgrammeInput = {
  programmeCode: string;
  programmeName: string;
  syllabusStart: string;
  programmeSyllabusContext: {
    studyYear1AcademicYear: string;
    studyYear2AcademicYear: string;
  };
  programmeRules: string[];
};

type RequirementGroup = "theory" | "application_domain";
type CourseCategory = "mandatory" | "conditionally_elective" | "recommended";

type CourseInput = {
  courseCode: string;
  courseTitle: string;
  canonicalSlug: string;
  officialKthUrl: string;
  programmeNotes?: string[];
  requirementGroup?: RequirementGroup;
  offerings: {
    studyYear: number;
    academicYear: string;
    category: "mandatory" | "conditionally_elective" | "recommended";
    applicationCode: string | null;
    credits: number;
    periodCredits: Partial<Record<"P1" | "P2" | "P3" | "P4", number>>;
    periods: string[];
  }[];
};

type SummaryInput = {
  courseCode: string;
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

type CatalogueInput = {
  programme: ProgrammeInput;
  courses: CourseInput[];
};

const timtmCanonicalPath = resolve("pipeline/data/canonical/courses.json");
const tmaimCanonicalPath = resolve(
  "pipeline/data/canonical/tmaim_courses.json",
);
const studentSummariesPath = resolve(
  "pipeline/data/processed/course-student-summaries.json",
);

const tmaimTheoryCourseCodes = new Set([
  "DD2420",
  "DD2437",
  "DD2447",
  "DD2601",
  "DD2610",
  "EL2320",
  "EL2805",
  "EL2810",
  "EQ2341",
  "ID2222",
  "ID2223",
  "SF1811",
  "SF2930",
  "SF2940",
  "SF2943",
]);

const tmaimApplicationDomainCourseCodes = new Set([
  "DD2257",
  "DD2401",
  "DD2402",
  "DD2410",
  "DD2411",
  "DD2417",
  "DD2419",
  "DD2423",
  "DD2424",
  "DD2430",
  "DD2435",
  "DD2438",
  "DD2477",
  "DT2112",
  "DT2119",
  "DT2470",
  "EQ2425",
]);

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function assertObject(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  return value;
}

function assertNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  return value;
}

function assertStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} must be an array of strings`);
  }
  return value;
}

function validateProgramme(raw: unknown, label: string): ProgrammeInput {
  assertObject(raw, label);
  assertObject(
    raw.programmeSyllabusContext,
    `${label}.programmeSyllabusContext`,
  );

  return {
    programmeCode: assertString(raw.programme, `${label}.programme`),
    programmeName: assertString(raw.programmeName, `${label}.programmeName`),
    syllabusStart: assertString(raw.syllabusStart, `${label}.syllabusStart`),
    programmeSyllabusContext: {
      studyYear1AcademicYear: assertString(
        raw.programmeSyllabusContext.studyYear1AcademicYear,
        `${label}.programmeSyllabusContext.studyYear1AcademicYear`,
      ),
      studyYear2AcademicYear: assertString(
        raw.programmeSyllabusContext.studyYear2AcademicYear,
        `${label}.programmeSyllabusContext.studyYear2AcademicYear`,
      ),
    },
    programmeRules: assertStringArray(
      raw.programmeRules,
      `${label}.programmeRules`,
    ),
  };
}

function validatePeriodCredits(
  raw: Record<string, unknown>,
  label: string,
): Partial<Record<"P1" | "P2" | "P3" | "P4", number>> {
  const allowedPeriods = new Set(["P1", "P2", "P3", "P4"]);
  const periodCredits: Partial<Record<"P1" | "P2" | "P3" | "P4", number>> = {};

  for (const [period, credits] of Object.entries(raw)) {
    if (!allowedPeriods.has(period)) {
      throw new Error(`${label}.${period} is not a supported period`);
    }
    periodCredits[period as "P1" | "P2" | "P3" | "P4"] = assertNumber(
      credits,
      `${label}.${period}`,
    );
  }

  return periodCredits;
}

function requirementGroupForCourse(
  programmeCode: string,
  courseCode: string,
  categories: Set<CourseInput["offerings"][number]["category"]>,
): RequirementGroup | undefined {
  if (programmeCode !== "TMAIM" || !categories.has("conditionally_elective")) {
    return undefined;
  }
  if (tmaimTheoryCourseCodes.has(courseCode)) return "theory";
  if (tmaimApplicationDomainCourseCodes.has(courseCode)) {
    return "application_domain";
  }
  throw new Error(
    `TMAIM conditionally elective course ${courseCode} has no requirement group`,
  );
}

function validateCourse(
  raw: unknown,
  index: number,
  programmeCode: string,
): CourseInput {
  assertObject(raw, `courses[${index}]`);
  const offerings = raw.offerings;
  if (!Array.isArray(offerings) || offerings.length === 0) {
    throw new Error(`courses[${index}].offerings must be a non-empty array`);
  }

  const courseCode = assertString(
    raw.courseCode,
    `courses[${index}].courseCode`,
  );
  const mappedOfferings = offerings.map((offering, offeringIndex) => {
    assertObject(offering, `courses[${index}].offerings[${offeringIndex}]`);
    assertObject(
      offering.periodCredits,
      `courses[${index}].offerings[${offeringIndex}].periodCredits`,
    );

    const categoryValue = assertString(
      offering.category,
      `courses[${index}].offerings[${offeringIndex}].category`,
    );
    if (
      categoryValue !== "mandatory" &&
      categoryValue !== "conditionally_elective" &&
      categoryValue !== "recommended"
    ) {
      throw new Error(
        `courses[${index}].offerings[${offeringIndex}].category is invalid`,
      );
    }
    const category: CourseCategory = categoryValue;

    return {
      studyYear: assertNumber(
        offering.studyYear,
        `courses[${index}].offerings[${offeringIndex}].studyYear`,
      ),
      academicYear: assertString(
        offering.academicYear,
        `courses[${index}].offerings[${offeringIndex}].academicYear`,
      ),
      category,
      applicationCode:
        offering.applicationCode === null
          ? null
          : assertString(
              offering.applicationCode,
              `courses[${index}].offerings[${offeringIndex}].applicationCode`,
            ),
      credits: assertNumber(
        offering.credits,
        `courses[${index}].offerings[${offeringIndex}].credits`,
      ),
      periodCredits: validatePeriodCredits(
        offering.periodCredits,
        `courses[${index}].offerings[${offeringIndex}].periodCredits`,
      ),
      periods: assertStringArray(
        offering.periods,
        `courses[${index}].offerings[${offeringIndex}].periods`,
      ),
    };
  });

  const categories = new Set(mappedOfferings.map((o) => o.category));
  const course: CourseInput = {
    courseCode,
    courseTitle: assertString(raw.courseTitle, `courses[${index}].courseTitle`),
    canonicalSlug: assertString(
      raw.canonicalSlug,
      `courses[${index}].canonicalSlug`,
    ),
    officialKthUrl: assertString(
      raw.officialKthUrl,
      `courses[${index}].officialKthUrl`,
    ),
    requirementGroup: requirementGroupForCourse(
      programmeCode,
      courseCode,
      categories,
    ),
    offerings: mappedOfferings,
  };

  if (raw.programmeNotes !== undefined) {
    course.programmeNotes = assertStringArray(
      raw.programmeNotes,
      `courses[${index}].programmeNotes`,
    );
  }

  return course;
}

function validateCatalogue(path: string, label: string): CatalogueInput {
  const json = readJson(path);
  assertObject(json, label);
  if (!Array.isArray(json.courses)) {
    throw new Error(`${label}.courses must be an array`);
  }

  const programme = validateProgramme(json, label);
  const courses = json.courses.map((course, index) =>
    validateCourse(course, index, programme.programmeCode),
  );

  assertNoDuplicates(
    courses.map((course) => course.courseCode),
    `${programme.programmeCode} course codes`,
  );
  assertNoDuplicates(
    courses.map((course) => course.canonicalSlug),
    `${programme.programmeCode} course slugs`,
  );

  return { programme, courses };
}

function validateSummary(raw: unknown, index: number): SummaryInput {
  assertObject(raw, `summaries[${index}]`);
  assertObject(raw.studentSummary, `summaries[${index}].studentSummary`);

  return {
    courseCode: assertString(raw.courseCode, `summaries[${index}].courseCode`),
    reflectionCount: assertNumber(
      raw.reflectionCount,
      `summaries[${index}].reflectionCount`,
    ),
    studentSummary: {
      overview: assertString(
        raw.studentSummary.overview,
        `summaries[${index}].studentSummary.overview`,
      ),
      commonlyPraised: assertStringArray(
        raw.studentSummary.commonlyPraised,
        `summaries[${index}].studentSummary.commonlyPraised`,
      ),
      commonlyCriticised: assertStringArray(
        raw.studentSummary.commonlyCriticised,
        `summaries[${index}].studentSummary.commonlyCriticised`,
      ),
      workloadAndPacing:
        raw.studentSummary.workloadAndPacing === null
          ? null
          : assertString(
              raw.studentSummary.workloadAndPacing,
              `summaries[${index}].studentSummary.workloadAndPacing`,
            ),
      teachingAndStructure: assertString(
        raw.studentSummary.teachingAndStructure,
        `summaries[${index}].studentSummary.teachingAndStructure`,
      ),
      assignmentsProjectsAndAssessment: assertString(
        raw.studentSummary.assignmentsProjectsAndAssessment,
        `summaries[${index}].studentSummary.assignmentsProjectsAndAssessment`,
      ),
      adviceFromStudents: assertStringArray(
        raw.studentSummary.adviceFromStudents,
        `summaries[${index}].studentSummary.adviceFromStudents`,
      ),
      importantCaveats: assertStringArray(
        raw.studentSummary.importantCaveats,
        `summaries[${index}].studentSummary.importantCaveats`,
      ),
    },
  };
}

function assertNoDuplicates(values: string[], label: string) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  if (duplicates.size > 0) {
    throw new Error(
      `${label} contains duplicates: ${[...duplicates].join(", ")}`,
    );
  }
}

const timtmCatalogue = validateCatalogue(timtmCanonicalPath, "courses.json");
const tmaimCatalogue = validateCatalogue(
  tmaimCanonicalPath,
  "tmaim_courses.json",
);

const summariesJson = readJson(studentSummariesPath);
if (!Array.isArray(summariesJson)) {
  throw new Error("course-student-summaries.json must be an array");
}
const summaries = summariesJson.map(validateSummary);
assertNoDuplicates(
  summaries.map((summary) => summary.courseCode),
  "Student summary course codes",
);

const timtmCourseCodes = new Set(
  timtmCatalogue.courses.map((c) => c.courseCode),
);
const allCourseCodes = new Set([
  ...timtmCatalogue.courses.map((c) => c.courseCode),
  ...tmaimCatalogue.courses.map((c) => c.courseCode),
]);
const unmatchedSummaryCourseCodes = summaries
  .map((summary) => summary.courseCode)
  .filter((courseCode) => !allCourseCodes.has(courseCode));
if (unmatchedSummaryCourseCodes.length > 0) {
  throw new Error(
    `Student summaries reference unknown courses: ${unmatchedSummaryCourseCodes.join(", ")}`,
  );
}

const tmaimOverlaps = tmaimCatalogue.courses
  .map((course) => course.courseCode)
  .filter((courseCode) => timtmCourseCodes.has(courseCode))
  .sort();

const payload = JSON.stringify({
  catalogues: [timtmCatalogue, tmaimCatalogue],
  summaries,
});
const isProd = process.argv.includes("--prod");
const result = spawnSync(
  "npx",
  [
    "convex",
    "run",
    ...(isProd ? ["--prod"] : []),
    "courseDataMigration:migrateCourseData",
    payload,
    ...(isProd ? [] : ["--push"]),
    "--typecheck",
    "try",
  ],
  {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  },
);

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.stderr.write(result.stdout);
  process.exit(result.status ?? 1);
}

const remoteReport = JSON.parse(result.stdout);
const tmaimReport = remoteReport.programmeReports.find(
  (report: { programmeCode: string }) => report.programmeCode === "TMAIM",
);

console.log("Course catalogue rebuild complete");
console.log(`Target: ${isProd ? "production" : "dev"}`);
console.log(`Programmes inserted: ${remoteReport.programmesInserted}`);
console.log(
  `Canonical courses inserted: ${remoteReport.canonicalCoursesInserted}`,
);
console.log(`Canonical courses reused: ${remoteReport.canonicalCoursesReused}`);
console.log(
  `Programme-course relations inserted: ${remoteReport.programmeCourseRelationsInserted}`,
);
console.log(`Student summaries read: ${remoteReport.studentSummariesRead}`);
console.log(`Summary records inserted: ${remoteReport.summaryRecordsInserted}`);
console.log("Cleared before rebuild:");
for (const [table, count] of Object.entries(remoteReport.cleared)) {
  console.log(`  ${table}: ${count}`);
}
console.log(`TIMTM courses read: ${timtmCatalogue.courses.length}`);
console.log(`TMAIM courses read: ${tmaimCatalogue.courses.length}`);
console.log(
  `TMAIM canonical courses newly inserted: ${tmaimReport?.canonicalCoursesInserted ?? 0}`,
);
console.log(
  `TMAIM canonical courses reused from TIMTM: ${tmaimReport?.canonicalCoursesReused ?? 0}`,
);
console.log(
  `TMAIM programme-course relations created: ${tmaimReport?.programmeCourseRelationsInserted ?? 0}`,
);
console.log(
  `TMAIM requirement groups: theory=${tmaimReport?.requirementGroups.theory ?? 0}, application_domain=${tmaimReport?.requirementGroups.application_domain ?? 0}`,
);
console.log(`Overlapping TIMTM/TMAIM course codes: ${tmaimOverlaps.length}`);
if (tmaimOverlaps.length > 0) {
  console.log(tmaimOverlaps.join(", "));
}
console.log(
  `Canonical courses with no TIMTM student summary: ${remoteReport.canonicalCoursesWithNoStudentSummary.length}`,
);
console.log(
  `Unmatched student summaries: ${remoteReport.unmatchedSummaryCourseCodes.length}`,
);

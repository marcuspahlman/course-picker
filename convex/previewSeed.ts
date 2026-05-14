import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const CLEAR_TABLES = [
  "courseStatuses",
  "courseComments",
  "friendGroupMembers",
  "friendGroups",
  "courseStudentSummaries",
  "programmeCourses",
  "courses",
  "programmes",
  "profiles",
] as const;

const PREVIEW_PROGRAMMES = [
  {
    key: "timtm",
    programmeCode: "TIMTM",
    programmeName: "Interactive Media Technology",
    syllabusStart: "2025",
    programmeSyllabusContext: {
      studyYear1AcademicYear: "2025/2026",
      studyYear2AcademicYear: "2026/2027",
    },
    programmeRules: [
      "Preview sample based on common media technology course planning flows.",
    ],
  },
  {
    key: "tmaim",
    programmeCode: "TMAIM",
    programmeName: "Machine Learning",
    syllabusStart: "2025",
    programmeSyllabusContext: {
      studyYear1AcademicYear: "2025/2026",
      studyYear2AcademicYear: "2026/2027",
    },
    programmeRules: [
      "Preview sample includes theory and application domain electives.",
    ],
  },
] as const;

const PREVIEW_COURSES = [
  {
    key: "dm2573",
    courseCode: "DM2573",
    courseTitle: "Sustainability and Media Technology",
    canonicalSlug: "dm2573-sustainability-and-media-technology",
    officialKthUrl: "https://www.kth.se/student/kurser/kurs/DM2573?l=en",
  },
  {
    key: "dm2583",
    courseCode: "DM2583",
    courseTitle: "Technology, Media and Design",
    canonicalSlug: "dm2583-technology-media-and-design",
    officialKthUrl: "https://www.kth.se/student/kurser/kurs/DM2583?l=en",
  },
  {
    key: "dt2119",
    courseCode: "DT2119",
    courseTitle: "Speech and Speaker Recognition",
    canonicalSlug: "dt2119-speech-and-speaker-recognition",
    officialKthUrl: "https://www.kth.se/student/kurser/kurs/DT2119?l=en",
  },
  {
    key: "dt2212",
    courseCode: "DT2212",
    courseTitle: "Music Acoustics",
    canonicalSlug: "dt2212-music-acoustics",
    officialKthUrl: "https://www.kth.se/student/kurser/kurs/DT2212?l=en",
  },
  {
    key: "dd2424",
    courseCode: "DD2424",
    courseTitle: "Deep Learning in Data Science",
    canonicalSlug: "dd2424-deep-learning-in-data-science",
    officialKthUrl: "https://www.kth.se/student/kurser/kurs/DD2424?l=en",
  },
  {
    key: "dd2437",
    courseCode: "DD2437",
    courseTitle: "Artificial Neural Networks and Deep Architectures",
    canonicalSlug: "dd2437-artificial-neural-networks-and-deep-architectures",
    officialKthUrl: "https://www.kth.se/student/kurser/kurs/DD2437?l=en",
  },
  {
    key: "id2223",
    courseCode: "ID2223",
    courseTitle: "Scalable Machine Learning and Deep Learning",
    canonicalSlug: "id2223-scalable-machine-learning-and-deep-learning",
    officialKthUrl: "https://www.kth.se/student/kurser/kurs/ID2223?l=en",
  },
] as const;

const PREVIEW_PROGRAMME_COURSES = [
  {
    programmeKey: "timtm",
    courseKey: "dm2573",
    category: "mandatory",
    studyYear: 1,
    periods: ["P1"],
    periodCredits: { P1: 7.5 },
  },
  {
    programmeKey: "timtm",
    courseKey: "dm2583",
    category: "mandatory",
    studyYear: 1,
    periods: ["P2"],
    periodCredits: { P2: 7.5 },
  },
  {
    programmeKey: "timtm",
    courseKey: "dt2119",
    category: "recommended",
    studyYear: 2,
    periods: ["P3"],
    periodCredits: { P3: 7.5 },
  },
  {
    programmeKey: "timtm",
    courseKey: "dt2212",
    category: "recommended",
    studyYear: 2,
    periods: ["P4"],
    periodCredits: { P4: 7.5 },
  },
  {
    programmeKey: "tmaim",
    courseKey: "dd2424",
    category: "conditionally_elective",
    requirementGroup: "application_domain",
    studyYear: 1,
    periods: ["P1"],
    periodCredits: { P1: 7.5 },
  },
  {
    programmeKey: "tmaim",
    courseKey: "dd2437",
    category: "conditionally_elective",
    requirementGroup: "theory",
    studyYear: 1,
    periods: ["P2"],
    periodCredits: { P2: 7.5 },
  },
  {
    programmeKey: "tmaim",
    courseKey: "id2223",
    category: "conditionally_elective",
    requirementGroup: "theory",
    studyYear: 2,
    periods: ["P3"],
    periodCredits: { P3: 7.5 },
  },
] as const;

const PREVIEW_SUMMARIES = [
  {
    courseKey: "dm2573",
    reflectionCount: 8,
    overview:
      "Students describe this as a broad course for connecting technical choices with sustainability tradeoffs.",
    commonlyPraised: ["Relevant discussions", "Clear project framing"],
    commonlyCriticised: ["Readings can feel uneven"],
  },
  {
    courseKey: "dd2424",
    reflectionCount: 12,
    overview:
      "Students often treat this as a demanding but useful deep learning course with practical assignments.",
    commonlyPraised: ["Strong technical depth", "Useful assignments"],
    commonlyCriticised: ["Heavy workload"],
  },
  {
    courseKey: "dt2119",
    reflectionCount: 5,
    overview:
      "Students mention a specialized course with a good fit for speech, audio, and machine learning interests.",
    commonlyPraised: ["Interesting domain", "Applied signal processing"],
    commonlyCriticised: ["Narrow scope"],
  },
] as const;

type SeedTable = (typeof CLEAR_TABLES)[number];
type SeedReport = {
  cleared: Record<SeedTable, number>;
  inserted: Record<SeedTable, number>;
};

async function clearTable(ctx: MutationCtx, table: SeedTable) {
  let cleared = 0;
  for (;;) {
    const rows = await ctx.db.query(table).take(100);
    if (rows.length === 0) {
      return cleared;
    }
    for (const row of rows) {
      await ctx.db.delete(row._id);
      cleared += 1;
    }
  }
}

function normalizeCourseCode(courseCode: string) {
  return courseCode.replace(/\s+/g, "").trim().toUpperCase();
}

function requireMapValue<Key extends string, Value>(
  map: Map<Key, Value>,
  key: Key,
) {
  const value = map.get(key);
  if (value === undefined) {
    throw new Error(`Preview seed is missing fixture key: ${key}`);
  }
  return value;
}

export const seed = internalMutation({
  args: {},
  handler: async (ctx): Promise<SeedReport> => {
    const cleared = {} as SeedReport["cleared"];
    for (const table of CLEAR_TABLES) {
      cleared[table] = await clearTable(ctx, table);
    }

    const programmeIds = new Map<string, Id<"programmes">>();
    const courseIds = new Map<string, Id<"courses">>();

    for (const { key, ...programme } of PREVIEW_PROGRAMMES) {
      programmeIds.set(
        key,
        await ctx.db.insert("programmes", {
          ...programme,
          programmeRules: [...programme.programmeRules],
        }),
      );
    }

    for (const { key, ...course } of PREVIEW_COURSES) {
      courseIds.set(
        key,
        await ctx.db.insert("courses", {
          ...course,
          source: "canonical",
          courseType: "kth",
          normalizedCourseCode: normalizeCourseCode(course.courseCode),
        }),
      );
    }

    for (const relation of PREVIEW_PROGRAMME_COURSES) {
      await ctx.db.insert("programmeCourses", {
        programmeId: requireMapValue(programmeIds, relation.programmeKey),
        courseId: requireMapValue(courseIds, relation.courseKey),
        offerings: [
          {
            studyYear: relation.studyYear,
            academicYear: "2025/2026",
            category: relation.category,
            applicationCode: null,
            credits: 7.5,
            periodCredits: relation.periodCredits,
            periods: [...relation.periods],
          },
        ],
        ...("requirementGroup" in relation
          ? { requirementGroup: relation.requirementGroup }
          : {}),
      });
    }

    for (const summary of PREVIEW_SUMMARIES) {
      await ctx.db.insert("courseStudentSummaries", {
        courseId: requireMapValue(courseIds, summary.courseKey),
        reflectionCount: summary.reflectionCount,
        studentSummary: {
          overview: summary.overview,
          commonlyPraised: [...summary.commonlyPraised],
          commonlyCriticised: [...summary.commonlyCriticised],
          workloadAndPacing: null,
          teachingAndStructure:
            "Preview summary data is intentionally compact and illustrative.",
          assignmentsProjectsAndAssessment:
            "Assessment details are omitted from the preview fixture.",
          adviceFromStudents: [
            "Use this preview data to verify browsing and comparison flows.",
          ],
          importantCaveats: [
            "This is not a full production export or a source of truth.",
          ],
        },
      });
    }

    return {
      cleared,
      inserted: {
        courseStatuses: 0,
        courseComments: 0,
        friendGroupMembers: 0,
        friendGroups: 0,
        courseStudentSummaries: PREVIEW_SUMMARIES.length,
        programmeCourses: PREVIEW_PROGRAMME_COURSES.length,
        courses: PREVIEW_COURSES.length,
        programmes: PREVIEW_PROGRAMMES.length,
        profiles: 0,
      },
    };
  },
});

import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  courseInputValidator,
  courseStudentSummaryInputValidator,
  programmeInputValidator,
} from "./courseDataModel";

const CLEAR_TABLES = [
  "courseStatuses",
  "courseComments",
  "courseStudentSummaries",
  "programmeCourses",
  "courses",
  "programmes",
] as const;

type ClearTable = (typeof CLEAR_TABLES)[number];
type RequirementGroup = "theory" | "application_domain";

type ProgrammeReport = {
  programmeCode: string;
  coursesRead: number;
  canonicalCoursesInserted: number;
  canonicalCoursesReused: number;
  programmeCourseRelationsInserted: number;
  requirementGroups: Record<RequirementGroup | "none", number>;
};

type MigrationReport = {
  cleared: Record<ClearTable, number>;
  programmesInserted: number;
  canonicalCoursesInserted: number;
  canonicalCoursesReused: number;
  programmeCourseRelationsInserted: number;
  studentSummariesRead: number;
  summaryRecordsInserted: number;
  canonicalCoursesWithNoStudentSummary: string[];
  unmatchedSummaryCourseCodes: string[];
  overlappingCourseCodes: string[];
  programmeReports: ProgrammeReport[];
};

function normalizeCourseCode(courseCode: string) {
  return courseCode.replace(/\s+/g, "").trim().toUpperCase();
}

export const migrateCourseData = action({
  args: {
    catalogues: v.array(
      v.object({
        programme: programmeInputValidator,
        courses: v.array(courseInputValidator),
      }),
    ),
    summaries: v.array(courseStudentSummaryInputValidator),
  },
  handler: async (ctx, args) => {
    const report: MigrationReport = await ctx.runMutation(
      internal.courseDataMigration.rebuildCourseCatalogue,
      args,
    );
    return report;
  },
});

async function clearTable(ctx: MutationCtx, table: ClearTable) {
  const rows = await ctx.db.query(table).take(1000);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

export const rebuildCourseCatalogue = internalMutation({
  args: {
    catalogues: v.array(
      v.object({
        programme: programmeInputValidator,
        courses: v.array(courseInputValidator),
      }),
    ),
    summaries: v.array(courseStudentSummaryInputValidator),
  },
  handler: async (ctx, args): Promise<MigrationReport> => {
    const cleared = {} as Record<ClearTable, number>;
    for (const table of CLEAR_TABLES) {
      cleared[table] = await clearTable(ctx, table);
    }

    const courseIdByCode = new Map<string, Id<"courses">>();
    const summaryCodes = new Set(args.summaries.map((s) => s.courseCode));
    const seenCourseCodes = new Set<string>();
    const overlappingCourseCodes = new Set<string>();
    const programmeReports: ProgrammeReport[] = [];

    let programmesInserted = 0;
    let totalCoursesInserted = 0;
    let totalCoursesReused = 0;
    let totalProgrammeCoursesInserted = 0;

    for (const catalogue of args.catalogues) {
      const programmeId = await ctx.db.insert("programmes", {
        programmeCode: catalogue.programme.programmeCode,
        programmeName: catalogue.programme.programmeName,
        syllabusStart: catalogue.programme.syllabusStart,
        programmeSyllabusContext: catalogue.programme.programmeSyllabusContext,
        programmeRules: catalogue.programme.programmeRules,
      });
      programmesInserted += 1;

      const programmeReport: ProgrammeReport = {
        programmeCode: catalogue.programme.programmeCode,
        coursesRead: catalogue.courses.length,
        canonicalCoursesInserted: 0,
        canonicalCoursesReused: 0,
        programmeCourseRelationsInserted: 0,
        requirementGroups: {
          theory: 0,
          application_domain: 0,
          none: 0,
        },
      };

      for (const course of catalogue.courses) {
        let courseId = courseIdByCode.get(course.courseCode);
        if (courseId === undefined) {
          courseId = await ctx.db.insert("courses", {
            courseCode: course.courseCode,
            courseTitle: course.courseTitle,
            canonicalSlug: course.canonicalSlug,
            officialKthUrl: course.officialKthUrl,
            source: "canonical",
            courseType: "kth",
            normalizedCourseCode: normalizeCourseCode(course.courseCode),
          });
          courseIdByCode.set(course.courseCode, courseId);
          seenCourseCodes.add(course.courseCode);
          programmeReport.canonicalCoursesInserted += 1;
          totalCoursesInserted += 1;
        } else {
          overlappingCourseCodes.add(course.courseCode);
          programmeReport.canonicalCoursesReused += 1;
          totalCoursesReused += 1;
        }

        const relation: {
          programmeId: Id<"programmes">;
          courseId: Id<"courses">;
          offerings: typeof course.offerings;
          programmeNotes?: string[];
          requirementGroup?: RequirementGroup;
        } = {
          programmeId,
          courseId,
          offerings: course.offerings,
        };
        if (course.programmeNotes !== undefined) {
          relation.programmeNotes = course.programmeNotes;
        }
        if (course.requirementGroup !== undefined) {
          relation.requirementGroup = course.requirementGroup;
          programmeReport.requirementGroups[course.requirementGroup] += 1;
        } else {
          programmeReport.requirementGroups.none += 1;
        }

        await ctx.db.insert("programmeCourses", relation);
        programmeReport.programmeCourseRelationsInserted += 1;
        totalProgrammeCoursesInserted += 1;
      }

      programmeReports.push(programmeReport);
    }

    const unmatchedSummaryCourseCodes: string[] = [];
    let summariesInserted = 0;

    for (const summary of args.summaries) {
      const courseId = courseIdByCode.get(summary.courseCode);
      if (courseId === undefined) {
        unmatchedSummaryCourseCodes.push(summary.courseCode);
        continue;
      }

      await ctx.db.insert("courseStudentSummaries", {
        courseId,
        reflectionCount: summary.reflectionCount,
        studentSummary: summary.studentSummary,
      });
      summariesInserted += 1;
    }

    return {
      cleared,
      programmesInserted,
      canonicalCoursesInserted: totalCoursesInserted,
      canonicalCoursesReused: totalCoursesReused,
      programmeCourseRelationsInserted: totalProgrammeCoursesInserted,
      studentSummariesRead: args.summaries.length,
      summaryRecordsInserted: summariesInserted,
      canonicalCoursesWithNoStudentSummary: [...seenCourseCodes]
        .filter((courseCode) => !summaryCodes.has(courseCode))
        .sort(),
      unmatchedSummaryCourseCodes: unmatchedSummaryCourseCodes.sort(),
      overlappingCourseCodes: [...overlappingCourseCodes].sort(),
      programmeReports,
    };
  },
});

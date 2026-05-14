import { v } from "convex/values";

export const programmeSyllabusContextValidator = v.object({
  studyYear1AcademicYear: v.string(),
  studyYear2AcademicYear: v.string(),
});

export const periodCreditsValidator = v.object({
  P1: v.optional(v.number()),
  P2: v.optional(v.number()),
  P3: v.optional(v.number()),
  P4: v.optional(v.number()),
});

export const courseCategoryValidator = v.union(
  v.literal("mandatory"),
  v.literal("conditionally_elective"),
  v.literal("recommended"),
);

export const courseOfferingValidator = v.object({
  studyYear: v.number(),
  academicYear: v.string(),
  category: courseCategoryValidator,
  applicationCode: v.union(v.string(), v.null()),
  credits: v.number(),
  periodCredits: periodCreditsValidator,
  periods: v.array(v.string()),
});

export const requirementGroupValidator = v.union(
  v.literal("theory"),
  v.literal("application_domain"),
);

export const studentSummaryValidator = v.object({
  overview: v.string(),
  commonlyPraised: v.array(v.string()),
  commonlyCriticised: v.array(v.string()),
  workloadAndPacing: v.union(v.string(), v.null()),
  teachingAndStructure: v.string(),
  assignmentsProjectsAndAssessment: v.string(),
  adviceFromStudents: v.array(v.string()),
  importantCaveats: v.array(v.string()),
});

export const programmeInputValidator = v.object({
  programmeCode: v.string(),
  programmeName: v.string(),
  syllabusStart: v.string(),
  programmeSyllabusContext: programmeSyllabusContextValidator,
  programmeRules: v.array(v.string()),
});

export const courseInputValidator = v.object({
  courseCode: v.string(),
  courseTitle: v.string(),
  canonicalSlug: v.string(),
  officialKthUrl: v.string(),
  programmeNotes: v.optional(v.array(v.string())),
  requirementGroup: v.optional(requirementGroupValidator),
  offerings: v.array(courseOfferingValidator),
});

export const courseStudentSummaryInputValidator = v.object({
  courseCode: v.string(),
  reflectionCount: v.number(),
  studentSummary: studentSummaryValidator,
});

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { ensureProfile, requireProfile } from "./profileHelpers";

type CourseStatus = "saved" | "taking" | "taken";

async function setCourseStatus(
  ctx: MutationCtx,
  profileId: Id<"profiles">,
  courseId: Id<"courses">,
  status: CourseStatus,
) {
  const existing = await ctx.db
    .query("courseStatuses")
    .withIndex("by_profileId_and_courseId", (q) =>
      q.eq("profileId", profileId).eq("courseId", courseId),
    )
    .unique();

  const now = Date.now();
  if (existing !== null) {
    await ctx.db.patch(existing._id, {
      status,
      updatedAt: now,
    });
    return { courseId, status };
  }

  await ctx.db.insert("courseStatuses", {
    profileId,
    courseId,
    status,
    createdAt: now,
    updatedAt: now,
  });
  return { courseId, status };
}

async function programmeContextsForCourse(
  ctx: QueryCtx,
  courseId: Id<"courses">,
) {
  const programmeCourses = await ctx.db
    .query("programmeCourses")
    .withIndex("by_courseId", (q) => q.eq("courseId", courseId))
    .take(20);

  const contexts = await Promise.all(
    programmeCourses.map(async (programmeCourse) => {
      const programme = await ctx.db.get(programmeCourse.programmeId);
      if (programme === null) return null;
      return { programme, programmeCourse };
    }),
  );

  return contexts
    .filter(
      (
        context,
      ): context is {
        programme: Doc<"programmes">;
        programmeCourse: Doc<"programmeCourses">;
      } => context !== null,
    )
    .sort((a, b) =>
      a.programme.programmeCode.localeCompare(b.programme.programmeCode),
    );
}

export const setSaved = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const profile = await ensureProfile(ctx);
    return await setCourseStatus(ctx, profile._id, args.courseId, "saved");
  },
});

export const setTaking = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const profile = await ensureProfile(ctx);
    return await setCourseStatus(ctx, profile._id, args.courseId, "taking");
  },
});

export const setTaken = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const profile = await ensureProfile(ctx);
    return await setCourseStatus(ctx, profile._id, args.courseId, "taken");
  },
});

export const clearStatus = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx);
    const existing = await ctx.db
      .query("courseStatuses")
      .withIndex("by_profileId_and_courseId", (q) =>
        q.eq("profileId", profile._id).eq("courseId", args.courseId),
      )
      .unique();

    if (existing !== null) {
      await ctx.db.delete(existing._id);
    }

    return { courseId: args.courseId, status: null };
  },
});

export const getMyCourseStatuses = query({
  args: {},
  handler: async (ctx) => {
    const profile = await requireProfile(ctx);
    const statuses = await ctx.db
      .query("courseStatuses")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .collect();

    const courses = await Promise.all(
      statuses.map(async (status) => {
        const course = await ctx.db.get(status.courseId);
        return {
          status,
          course,
          programmeContexts:
            course === null
              ? []
              : await programmeContextsForCourse(ctx, course._id),
        };
      }),
    );

    return courses.filter((item) => item.course !== null);
  },
});

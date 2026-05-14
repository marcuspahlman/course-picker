import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { ensureProfile } from "./profileHelpers";

const COMMUNITY_LIBRARY_CODE = "Other";

function normalizeCourseCode(courseCode: string) {
  return courseCode.replace(/\s+/g, "").trim().toUpperCase();
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function communitySource(course: Doc<"courses">) {
  return course.source === "community";
}

async function canonicalCourseByNormalizedCode(
  ctx: QueryCtx | MutationCtx,
  normalizedCourseCode: string,
) {
  const direct = await ctx.db
    .query("courses")
    .withIndex("by_courseCode", (q) => q.eq("courseCode", normalizedCourseCode))
    .first();

  if (direct !== null && !communitySource(direct)) {
    return direct;
  }

  const normalized = await ctx.db
    .query("courses")
    .withIndex("by_normalizedCourseCode", (q) =>
      q.eq("normalizedCourseCode", normalizedCourseCode),
    )
    .collect();

  return normalized.find((course) => !communitySource(course)) ?? null;
}

async function communityKthCourseByNormalizedCode(
  ctx: QueryCtx | MutationCtx,
  normalizedCourseCode: string,
) {
  const matches = await ctx.db
    .query("courses")
    .withIndex("by_normalizedCourseCode", (q) =>
      q.eq("normalizedCourseCode", normalizedCourseCode),
    )
    .collect();

  return (
    matches.find(
      (course) =>
        course.source === "community" && (course.courseType ?? "kth") === "kth",
    ) ?? null
  );
}

function cleanOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function publicCourseRoute(course: Doc<"courses">) {
  if (course.courseType === "external") {
    return `/course/${course.canonicalSlug}`;
  }
  return `/course/${course.courseCode}`;
}

async function summaryForCourse(ctx: QueryCtx, courseId: Id<"courses">) {
  return await ctx.db
    .query("courseStudentSummaries")
    .withIndex("by_courseId", (q) => q.eq("courseId", courseId))
    .unique();
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

function contextForProgramme(
  contexts: Awaited<ReturnType<typeof programmeContextsForCourse>>,
  programmeCode: string | undefined,
) {
  if (programmeCode === undefined) {
    return null;
  }
  return (
    contexts.find(
      (context) => context.programme.programmeCode === programmeCode,
    ) ?? null
  );
}

export const listProgrammes = query({
  args: {},
  handler: async (ctx) => {
    const programmes = await ctx.db.query("programmes").take(100);
    return programmes.sort((a, b) =>
      a.programmeCode.localeCompare(b.programmeCode),
    );
  },
});

export const listProgrammeCourses = query({
  args: { programmeCode: v.string() },
  handler: async (ctx, args) => {
    if (args.programmeCode === COMMUNITY_LIBRARY_CODE) {
      const courses = await ctx.db
        .query("courses")
        .withIndex("by_source", (q) => q.eq("source", "community"))
        .take(500);

      const rows = await Promise.all(
        courses.map(async (course) => ({
          course,
          programme: null,
          programmeCourse: null,
          programmeContexts: await programmeContextsForCourse(ctx, course._id),
        })),
      );

      return {
        programme: null,
        courses: rows.sort((a, b) => {
          const aKey =
            a.course.courseType === "external"
              ? a.course.courseTitle
              : a.course.courseCode;
          const bKey =
            b.course.courseType === "external"
              ? b.course.courseTitle
              : b.course.courseCode;
          return aKey.localeCompare(bKey);
        }),
      };
    }

    const programme = await ctx.db
      .query("programmes")
      .withIndex("by_programmeCode", (q) =>
        q.eq("programmeCode", args.programmeCode),
      )
      .unique();

    if (programme === null) {
      return null;
    }

    const programmeCourses = await ctx.db
      .query("programmeCourses")
      .withIndex("by_programmeId", (q) => q.eq("programmeId", programme._id))
      .take(500);

    const rows = await Promise.all(
      programmeCourses.map(async (programmeCourse) => {
        const course = await ctx.db.get(programmeCourse.courseId);
        if (course === null) return null;
        return {
          course,
          programme,
          programmeCourse,
          programmeContexts: await programmeContextsForCourse(ctx, course._id),
        };
      }),
    );

    return {
      programme,
      courses: rows
        .filter((row): row is NonNullable<typeof row> => row !== null)
        .sort((a, b) => a.course.courseCode.localeCompare(b.course.courseCode)),
    };
  },
});

export const lookupKthCourseCode = query({
  args: { courseCode: v.string() },
  handler: async (ctx, args) => {
    const normalizedCourseCode = normalizeCourseCode(args.courseCode);
    if (normalizedCourseCode.length === 0) {
      return { status: "empty" as const, normalizedCourseCode };
    }

    const canonical = await canonicalCourseByNormalizedCode(
      ctx,
      normalizedCourseCode,
    );
    if (canonical !== null) {
      return {
        status: "canonical" as const,
        normalizedCourseCode,
        course: canonical,
        href: publicCourseRoute(canonical),
      };
    }

    const community = await communityKthCourseByNormalizedCode(
      ctx,
      normalizedCourseCode,
    );
    if (community !== null) {
      return {
        status: "community" as const,
        normalizedCourseCode,
        course: community,
        href: publicCourseRoute(community),
      };
    }

    return { status: "available" as const, normalizedCourseCode };
  },
});

export const createCommunityKthCourse = mutation({
  args: {
    courseCode: v.string(),
    courseTitle: v.optional(v.string()),
    credits: v.optional(v.number()),
    period: v.optional(v.string()),
    link: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await ensureProfile(ctx);
    const normalizedCourseCode = normalizeCourseCode(args.courseCode);
    if (normalizedCourseCode.length === 0) {
      throw new Error("Course code is required");
    }

    const canonical = await canonicalCourseByNormalizedCode(
      ctx,
      normalizedCourseCode,
    );
    if (canonical !== null) {
      return {
        created: false as const,
        reason: "canonical" as const,
        courseId: canonical._id,
        href: publicCourseRoute(canonical),
      };
    }

    const existingCommunity = await communityKthCourseByNormalizedCode(
      ctx,
      normalizedCourseCode,
    );
    if (existingCommunity !== null) {
      return {
        created: false as const,
        reason: "community" as const,
        courseId: existingCommunity._id,
        href: publicCourseRoute(existingCommunity),
      };
    }

    const now = Date.now();
    const link = cleanOptionalText(args.link);
    const courseId = await ctx.db.insert("courses", {
      courseCode: normalizedCourseCode,
      courseTitle: cleanOptionalText(args.courseTitle) ?? normalizedCourseCode,
      canonicalSlug: `other-${normalizedCourseCode.toLowerCase()}`,
      officialKthUrl:
        link ??
        `https://www.kth.se/student/kurser/kurs/${normalizedCourseCode}`,
      source: "community",
      courseType: "kth",
      normalizedCourseCode,
      ...(args.credits !== undefined ? { credits: args.credits } : {}),
      ...(cleanOptionalText(args.period) !== undefined
        ? { period: cleanOptionalText(args.period) }
        : {}),
      ...(link !== undefined ? { link } : {}),
      ...(cleanOptionalText(args.description) !== undefined
        ? { description: cleanOptionalText(args.description) }
        : {}),
      createdBy: profile._id,
      createdAt: now,
      lastEditedBy: profile._id,
      lastEditedAt: now,
    });

    const course = await ctx.db.get(courseId);
    if (course === null) {
      throw new Error("Course not found");
    }

    return {
      created: true as const,
      courseId,
      href: publicCourseRoute(course),
    };
  },
});

export const createCommunityExternalCourse = mutation({
  args: {
    courseTitle: v.string(),
    link: v.optional(v.string()),
    institution: v.optional(v.string()),
    credits: v.optional(v.number()),
    period: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await ensureProfile(ctx);
    const courseTitle = args.courseTitle.trim();
    if (courseTitle.length === 0) {
      throw new Error("Course name is required");
    }

    const now = Date.now();
    const suffix = Math.random().toString(36).slice(2, 8);
    const slugBase = slugify(courseTitle) || "external-course";
    const canonicalSlug = `other-${slugBase}-${suffix}`;
    const link = cleanOptionalText(args.link);
    const courseId = await ctx.db.insert("courses", {
      courseCode: `OTHER-${suffix.toUpperCase()}`,
      courseTitle,
      canonicalSlug,
      officialKthUrl: link ?? "",
      source: "community",
      courseType: "external",
      ...(args.credits !== undefined ? { credits: args.credits } : {}),
      ...(cleanOptionalText(args.period) !== undefined
        ? { period: cleanOptionalText(args.period) }
        : {}),
      ...(link !== undefined ? { link } : {}),
      ...(cleanOptionalText(args.institution) !== undefined
        ? { institution: cleanOptionalText(args.institution) }
        : {}),
      ...(cleanOptionalText(args.description) !== undefined
        ? { description: cleanOptionalText(args.description) }
        : {}),
      createdBy: profile._id,
      createdAt: now,
      lastEditedBy: profile._id,
      lastEditedAt: now,
    });

    const course = await ctx.db.get(courseId);
    if (course === null) {
      throw new Error("Course not found");
    }

    return {
      created: true as const,
      courseId,
      href: publicCourseRoute(course),
    };
  },
});

export const updateCommunityCourse = mutation({
  args: {
    courseId: v.id("courses"),
    courseTitle: v.optional(v.string()),
    credits: v.optional(v.union(v.number(), v.null())),
    period: v.optional(v.union(v.string(), v.null())),
    link: v.optional(v.union(v.string(), v.null())),
    institution: v.optional(v.union(v.string(), v.null())),
    description: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const profile = await ensureProfile(ctx);
    const course = await ctx.db.get(args.courseId);
    if (course === null) {
      throw new Error("Course not found");
    }
    if (course.source !== "community") {
      throw new Error("Only community-added courses can be edited");
    }

    const patch: Partial<Doc<"courses">> = {
      lastEditedBy: profile._id,
      lastEditedAt: Date.now(),
    };

    if (args.courseTitle !== undefined) {
      const title = args.courseTitle.trim();
      if (title.length === 0) {
        throw new Error("Course name cannot be empty");
      }
      patch.courseTitle = title;
    }

    if (args.credits !== undefined) {
      patch.credits = args.credits === null ? undefined : args.credits;
    }
    if (args.period !== undefined) {
      patch.period = cleanOptionalText(args.period) ?? undefined;
    }
    if (args.link !== undefined) {
      const link = cleanOptionalText(args.link) ?? undefined;
      patch.link = link;
      patch.officialKthUrl =
        link ??
        (course.courseType === "kth"
          ? `https://www.kth.se/student/kurser/kurs/${course.courseCode}`
          : "");
    }
    if (args.institution !== undefined) {
      patch.institution = cleanOptionalText(args.institution) ?? undefined;
    }
    if (args.description !== undefined) {
      patch.description = cleanOptionalText(args.description) ?? undefined;
    }

    await ctx.db.patch(args.courseId, patch);
    return { courseId: args.courseId };
  },
});

export const listCanonicalCourses = query({
  args: { programmeCode: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.programmeCode !== undefined) {
      const programmeCode = args.programmeCode;
      const programme = await ctx.db
        .query("programmes")
        .withIndex("by_programmeCode", (q) =>
          q.eq("programmeCode", programmeCode),
        )
        .unique();

      if (programme === null) {
        return [];
      }

      const programmeCourses = await ctx.db
        .query("programmeCourses")
        .withIndex("by_programmeId", (q) => q.eq("programmeId", programme._id))
        .take(500);

      const rows = await Promise.all(
        programmeCourses.map(async (programmeCourse) => {
          const course = await ctx.db.get(programmeCourse.courseId);
          if (course === null) return null;
          return {
            ...course,
            programmeId: programme._id,
            programmeCode: programme.programmeCode,
            programmeNotes: programmeCourse.programmeNotes,
            requirementGroup: programmeCourse.requirementGroup,
            offerings: programmeCourse.offerings,
          };
        }),
      );

      return rows
        .filter((row): row is NonNullable<typeof row> => row !== null)
        .sort((a, b) => a.courseCode.localeCompare(b.courseCode));
    }

    const courses = await ctx.db.query("courses").take(500);
    return courses
      .filter((course) => !communitySource(course))
      .sort((a, b) => a.courseCode.localeCompare(b.courseCode));
  },
});

export const listAllSummaries = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("courseStudentSummaries").take(500);
  },
});

export const getCourseBySlug = query({
  args: {
    canonicalSlug: v.string(),
    programmeCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const course = await ctx.db
      .query("courses")
      .withIndex("by_canonicalSlug", (q) =>
        q.eq("canonicalSlug", args.canonicalSlug),
      )
      .unique();

    if (course === null) {
      return null;
    }

    const programmeContexts = await programmeContextsForCourse(ctx, course._id);
    const selectedContext = contextForProgramme(
      programmeContexts,
      args.programmeCode,
    );

    return {
      course,
      programme: selectedContext?.programme ?? null,
      programmeCourse: selectedContext?.programmeCourse ?? null,
      programmeContexts,
      studentSummary: await summaryForCourse(ctx, course._id),
    };
  },
});

export const getCourseByCourseCode = query({
  args: {
    courseCode: v.string(),
    programmeCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const course = await ctx.db
      .query("courses")
      .withIndex("by_courseCode", (q) => q.eq("courseCode", args.courseCode))
      .unique();

    if (course === null) {
      return null;
    }

    const programmeContexts = await programmeContextsForCourse(ctx, course._id);
    const selectedContext = contextForProgramme(
      programmeContexts,
      args.programmeCode,
    );

    return {
      course,
      programme: selectedContext?.programme ?? null,
      programmeCourse: selectedContext?.programmeCourse ?? null,
      programmeContexts,
      studentSummary: await summaryForCourse(ctx, course._id),
    };
  },
});

export const getCourseByIdentifier = query({
  args: {
    identifier: v.string(),
    programmeCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rawIdentifier = decodeURIComponent(args.identifier).trim();
    const normalizedCourseCode = normalizeCourseCode(rawIdentifier);
    const byCourseCode =
      normalizedCourseCode.length > 0
        ? await ctx.db
            .query("courses")
            .withIndex("by_courseCode", (q) =>
              q.eq("courseCode", normalizedCourseCode),
            )
            .first()
        : null;

    const course =
      byCourseCode ??
      (await ctx.db
        .query("courses")
        .withIndex("by_canonicalSlug", (q) =>
          q.eq("canonicalSlug", rawIdentifier),
        )
        .unique());

    if (course === null) {
      return null;
    }

    const programmeContexts = await programmeContextsForCourse(ctx, course._id);
    const selectedContext = contextForProgramme(
      programmeContexts,
      args.programmeCode,
    );

    return {
      course,
      programme: selectedContext?.programme ?? null,
      programmeCourse: selectedContext?.programmeCourse ?? null,
      programmeContexts,
      studentSummary: await summaryForCourse(ctx, course._id),
    };
  },
});

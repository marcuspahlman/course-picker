import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { currentProfile, ensureProfile } from "./profileHelpers";

const MAX_COMMENT_LENGTH = 1000;
const COMMENT_LIST_LIMIT = 100;

function commentAuthor(profile: Doc<"profiles"> | null) {
  if (profile === null) {
    return {
      profileId: null,
      displayName: "Former student",
      imageUrl: null,
    };
  }

  return {
    profileId: profile._id,
    displayName: profile.displayName,
    imageUrl: profile.imageUrl ?? null,
  };
}

async function collectVisibleAuthorIds(
  ctx: QueryCtx,
  profileId: Id<"profiles">,
): Promise<Id<"profiles">[]> {
  const visibleAuthorIds = new Set<string>([profileId]);

  const memberships = await ctx.db
    .query("friendGroupMembers")
    .withIndex("by_profileId", (q) => q.eq("profileId", profileId))
    .collect();

  for (const membership of memberships) {
    const groupMembers = await ctx.db
      .query("friendGroupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", membership.groupId))
      .collect();

    for (const groupMember of groupMembers) {
      visibleAuthorIds.add(groupMember.profileId);
    }
  }

  return [...visibleAuthorIds] as Id<"profiles">[];
}

export const listForCourse = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const profile = await currentProfile(ctx);
    if (profile === null) {
      return {
        visibility: "signedOut" as const,
        comments: [],
      };
    }

    const visibleAuthorIds = await collectVisibleAuthorIds(ctx, profile._id);
    const comments = (
      await Promise.all(
        visibleAuthorIds.map((authorId) =>
          ctx.db
            .query("courseComments")
            .withIndex("by_courseId_and_authorId_and_createdAt", (q) =>
              q.eq("courseId", args.courseId).eq("authorId", authorId),
            )
            .order("desc")
            .take(COMMENT_LIST_LIMIT),
        ),
      )
    )
      .flat()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, COMMENT_LIST_LIMIT)
      .sort((a, b) => a.createdAt - b.createdAt);

    const authorIds = new Set(comments.map((comment) => comment.authorId));
    const authors = new Map(
      (
        await Promise.all(
          Array.from(authorIds).map(async (authorId) => ({
            authorId,
            profile: await ctx.db.get(authorId),
          })),
        )
      ).map(({ authorId, profile }) => [authorId, commentAuthor(profile)]),
    );

    return {
      visibility: "groupScoped" as const,
      comments: comments.map((comment) => ({
        _id: comment._id,
        courseId: comment.courseId,
        body: comment.body,
        createdAt: comment.createdAt,
        author: authors.get(comment.authorId) ?? commentAuthor(null),
      })),
    };
  },
});

export const commentCountsForVisibleCourses = query({
  args: {},
  handler: async (ctx) => {
    const profile = await currentProfile(ctx);
    if (profile === null) {
      return [] as Array<{ courseId: Id<"courses">; count: number }>;
    }

    const visibleAuthorIds = await collectVisibleAuthorIds(ctx, profile._id);
    const commentsByAuthor = await Promise.all(
      visibleAuthorIds.map((authorId) =>
        ctx.db
          .query("courseComments")
          .withIndex("by_authorId", (q) => q.eq("authorId", authorId))
          .collect(),
      ),
    );

    const counts = new Map<string, number>();
    for (const comments of commentsByAuthor) {
      for (const comment of comments) {
        const key = comment.courseId as string;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    return [...counts.entries()].map(([courseId, count]) => ({
      courseId: courseId as Id<"courses">,
      count,
    }));
  },
});

export const create = mutation({
  args: {
    courseId: v.id("courses"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ensureProfile(ctx);
    const course = await ctx.db.get(args.courseId);
    if (course === null) {
      throw new Error("Course not found");
    }

    const body = args.body.trim();
    if (body.length === 0) {
      throw new Error("Comment cannot be empty");
    }
    if (body.length > MAX_COMMENT_LENGTH) {
      throw new Error(
        `Comment must be ${MAX_COMMENT_LENGTH} characters or fewer`,
      );
    }

    const createdAt = Date.now();
    const commentId = await ctx.db.insert("courseComments", {
      courseId: args.courseId,
      authorId: profile._id,
      body,
      createdAt,
    });

    return { commentId, createdAt };
  },
});

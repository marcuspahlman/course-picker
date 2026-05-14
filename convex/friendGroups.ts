import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  currentProfile,
  ensureProfile,
  requireProfile,
} from "./profileHelpers";

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_CODE_LENGTH = 12;

function generateInviteCode() {
  const values = new Uint8Array(INVITE_CODE_LENGTH);
  crypto.getRandomValues(values);
  return Array.from(
    values,
    (value) => INVITE_ALPHABET[value % INVITE_ALPHABET.length],
  ).join("");
}

async function uniqueInviteCode(ctx: MutationCtx) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = generateInviteCode();
    const existing = await ctx.db
      .query("friendGroups")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", inviteCode))
      .unique();
    if (existing === null) {
      return inviteCode;
    }
  }
  throw new Error("Could not generate invite code");
}

async function ensureMembership(
  ctx: MutationCtx,
  groupId: Id<"friendGroups">,
  profileId: Id<"profiles">,
) {
  const existing = await ctx.db
    .query("friendGroupMembers")
    .withIndex("by_groupId_and_profileId", (q) =>
      q.eq("groupId", groupId).eq("profileId", profileId),
    )
    .unique();

  if (existing !== null) {
    return { membership: existing, created: false };
  }

  const membershipId = await ctx.db.insert("friendGroupMembers", {
    groupId,
    profileId,
    joinedAt: Date.now(),
  });
  const membership = await ctx.db.get(membershipId);
  if (membership === null) {
    throw new Error("Membership not found");
  }
  return { membership, created: true };
}

async function requireGroupMember(
  ctx: QueryCtx,
  groupId: Id<"friendGroups">,
  profileId: Id<"profiles">,
) {
  const membership = await ctx.db
    .query("friendGroupMembers")
    .withIndex("by_groupId_and_profileId", (q) =>
      q.eq("groupId", groupId).eq("profileId", profileId),
    )
    .unique();

  if (membership === null) {
    throw new Error("Unauthorized");
  }

  return membership;
}

function courseStatusCounts(
  statuses: Array<Doc<"courseStatuses">>,
  reflectionCounts = new Map<string, number>(),
) {
  const counts = new Map<
    Id<"courses">,
    {
      courseId: Id<"courses">;
      saved: number;
      taking: number;
      taken: number;
      memberStatuses: Array<{
        profileId: Id<"profiles">;
        status: "saved" | "taking" | "taken";
        updatedAt: number;
      }>;
    }
  >();

  for (const status of statuses) {
    const existing = counts.get(status.courseId) ?? {
      courseId: status.courseId,
      saved: 0,
      taking: 0,
      taken: 0,
      memberStatuses: [],
    };

    existing[status.status] += 1;
    existing.memberStatuses.push({
      profileId: status.profileId,
      status: status.status,
      updatedAt: status.updatedAt,
    });
    counts.set(status.courseId, existing);
  }

  return Array.from(counts.values()).sort((a, b) => {
    const scoreA =
      a.saved * 1.2 +
      a.taken +
      a.taking * 2 +
      (reflectionCounts.get(a.courseId as string) ?? 0) * 0.2;
    const scoreB =
      b.saved * 1.2 +
      b.taken +
      b.taking * 2 +
      (reflectionCounts.get(b.courseId as string) ?? 0) * 0.2;
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    return b.taking - a.taking;
  });
}

export const createGroup = mutation({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const profile = await ensureProfile(ctx);
    const inviteCode = await uniqueInviteCode(ctx);
    const groupId = await ctx.db.insert("friendGroups", {
      name: args.name?.trim() || "Course planning group",
      creatorProfileId: profile._id,
      inviteCode,
      createdAt: Date.now(),
    });
    const { membership } = await ensureMembership(ctx, groupId, profile._id);

    return {
      groupId,
      inviteCode,
      membershipId: membership._id,
    };
  },
});

export const getInvite = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const group = await ctx.db
      .query("friendGroups")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode))
      .unique();

    if (group === null) {
      return null;
    }

    const members = await ctx.db
      .query("friendGroupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", group._id))
      .collect();

    return {
      groupId: group._id,
      name: group.name,
      memberCount: members.length,
      createdAt: group.createdAt,
    };
  },
});

export const acceptGroupInvite = mutation({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const profile = await ensureProfile(ctx);
    const group = await ctx.db
      .query("friendGroups")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode))
      .unique();

    if (group === null) {
      throw new Error("Invite not found");
    }

    const { membership, created } = await ensureMembership(
      ctx,
      group._id,
      profile._id,
    );

    return {
      groupId: group._id,
      groupName: group.name,
      membershipId: membership._id,
      alreadyMember: !created,
    };
  },
});

export const listMyGroups = query({
  args: {},
  handler: async (ctx) => {
    const profile = await currentProfile(ctx);
    if (profile === null) return [];

    const memberships = await ctx.db
      .query("friendGroupMembers")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .collect();

    const groups = await Promise.all(
      memberships.map(async (m) => {
        const group = await ctx.db.get(m.groupId);
        if (group === null) return null;
        const allMembers = await ctx.db
          .query("friendGroupMembers")
          .withIndex("by_groupId", (q) => q.eq("groupId", m.groupId))
          .collect();
        return {
          group,
          memberCount: allMembers.length,
          joinedAt: m.joinedAt,
        };
      }),
    );

    return groups
      .filter((g): g is NonNullable<typeof g> => g !== null)
      .sort((a, b) => b.group.createdAt - a.group.createdAt);
  },
});

export const getGroupSocialSummary = query({
  args: { groupId: v.id("friendGroups") },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx);
    await requireGroupMember(ctx, args.groupId, profile._id);

    const group = await ctx.db.get(args.groupId);
    if (group === null) {
      return null;
    }

    const memberships = await ctx.db
      .query("friendGroupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .collect();
    const memberProfiles = await Promise.all(
      memberships.map(async (membership) => {
        const memberProfile = await ctx.db.get(membership.profileId);
        return {
          membership,
          profile: memberProfile,
        };
      }),
    );

    const statuses = (
      await Promise.all(
        memberships.map(async (membership) => {
          return await ctx.db
            .query("courseStatuses")
            .withIndex("by_profileId", (q) =>
              q.eq("profileId", membership.profileId),
            )
            .collect();
        }),
      )
    ).flat();

    const reflectionCounts = new Map<string, number>();
    await Promise.all(
      [...new Set(statuses.map((status) => status.courseId as string))].map(
        async (courseId) => {
          const summary = await ctx.db
            .query("courseStudentSummaries")
            .withIndex("by_courseId", (q) =>
              q.eq("courseId", courseId as Id<"courses">),
            )
            .unique();
          if (summary !== null) {
            reflectionCounts.set(courseId, summary.reflectionCount);
          }
        },
      ),
    );

    const courseStatuses = await Promise.all(
      courseStatusCounts(statuses, reflectionCounts).map(
        async (statusSummary) => {
          const course = await ctx.db.get(statusSummary.courseId);
          return {
            ...statusSummary,
            course,
            programmeContexts:
              course === null
                ? []
                : await programmeContextsForCourse(ctx, course._id),
          };
        },
      ),
    );

    return {
      group,
      members: memberProfiles.filter((member) => member.profile !== null),
      courseStatuses: courseStatuses.filter((item) => item.course !== null),
    };
  },
});

async function collectFriendIdsExcludingSelf(
  ctx: QueryCtx,
  myProfileId: Id<"profiles">,
): Promise<Id<"profiles">[]> {
  const friendIds = new Set<string>();

  const myMemberships = await ctx.db
    .query("friendGroupMembers")
    .withIndex("by_profileId", (q) => q.eq("profileId", myProfileId))
    .collect();

  for (const membership of myMemberships) {
    const groupMembers = await ctx.db
      .query("friendGroupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", membership.groupId))
      .collect();
    for (const gm of groupMembers) {
      if (gm.profileId !== myProfileId) {
        friendIds.add(gm.profileId as string);
      }
    }
  }

  return [...friendIds] as Id<"profiles">[];
}

async function loadProfileBriefs(ctx: QueryCtx, profileIds: Id<"profiles">[]) {
  const docs = await Promise.all(profileIds.map((id) => ctx.db.get(id)));
  return docs
    .filter((p): p is Doc<"profiles"> => p !== null)
    .map((p) => ({
      profileId: p._id,
      displayName: p.displayName,
      imageUrl: p.imageUrl ?? null,
    }));
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

/**
 * Course activity from other members in your friend groups (excluding you).
 * Pass `courseId` to only load rows for that course (cheaper on the course page).
 */
export const friendsCourseActivity = query({
  args: {
    courseId: v.optional(v.id("courses")),
  },
  handler: async (ctx, args) => {
    const me = await currentProfile(ctx);
    if (me === null) {
      return null;
    }

    const friendIds = await collectFriendIdsExcludingSelf(ctx, me._id);
    if (friendIds.length === 0) {
      return { profiles: [], courses: [] };
    }

    let summaries;
    if (args.courseId !== undefined) {
      const courseId = args.courseId;
      const statusRows = (
        await Promise.all(
          friendIds.map((pid) =>
            ctx.db
              .query("courseStatuses")
              .withIndex("by_profileId_and_courseId", (q) =>
                q.eq("profileId", pid).eq("courseId", courseId),
              )
              .first(),
          ),
        )
      ).filter((s): s is Doc<"courseStatuses"> => s !== null);
      summaries = courseStatusCounts(statusRows);
    } else {
      const allStatuses = (
        await Promise.all(
          friendIds.map((pid) =>
            ctx.db
              .query("courseStatuses")
              .withIndex("by_profileId", (q) => q.eq("profileId", pid))
              .collect(),
          ),
        )
      ).flat();
      summaries = courseStatusCounts(allStatuses);
    }

    const rows = summaries.map((s) => ({
      courseId: s.courseId,
      saved: s.memberStatuses
        .filter((m) => m.status === "saved")
        .map((m) => m.profileId),
      taking: s.memberStatuses
        .filter((m) => m.status === "taking")
        .map((m) => m.profileId),
      taken: s.memberStatuses
        .filter((m) => m.status === "taken")
        .map((m) => m.profileId),
    }));

    const needed = new Set<string>();
    for (const row of rows) {
      for (const id of row.saved) needed.add(id as string);
      for (const id of row.taking) needed.add(id as string);
      for (const id of row.taken) needed.add(id as string);
    }

    const profiles = await loadProfileBriefs(ctx, [
      ...needed,
    ] as Id<"profiles">[]);

    return { profiles, courses: rows };
  },
});

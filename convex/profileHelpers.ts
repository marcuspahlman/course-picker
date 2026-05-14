import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { authComponent } from "./auth";

type AuthenticatedCtx = QueryCtx | MutationCtx;

export async function currentProfile(
  ctx: AuthenticatedCtx,
): Promise<Doc<"profiles"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }

  return await ctx.db
    .query("profiles")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .order("asc")
    .first();
}

export async function requireProfile(
  ctx: AuthenticatedCtx,
): Promise<Doc<"profiles">> {
  const profile = await currentProfile(ctx);
  if (profile === null) {
    throw new Error("Not authenticated");
  }
  return profile;
}

export async function ensureProfile(
  ctx: MutationCtx,
): Promise<Doc<"profiles">> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Not authenticated");
  }

  const existingProfiles = await ctx.db
    .query("profiles")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .order("asc")
    .collect();
  const existing = existingProfiles[0] ?? null;

  const authUser = await authComponent.getAuthUser(ctx);
  const now = Date.now();
  const displayName =
    authUser.name || identity.name || identity.email || "Student";
  const imageUrl = authUser.image ?? identity.pictureUrl;

  if (existing !== null) {
    if (existingProfiles.length > 1) {
      await mergeDuplicateProfiles(ctx, existing, existingProfiles.slice(1));
    }
    await ctx.db.patch(existing._id, {
      authUserId: authUser._id,
      displayName,
      ...(imageUrl === undefined || imageUrl === null ? {} : { imageUrl }),
      updatedAt: now,
    });
    const updated = await ctx.db.get(existing._id);
    if (updated === null) {
      throw new Error("Profile not found");
    }
    return updated;
  }

  const profileId = await ctx.db.insert("profiles", {
    authUserId: authUser._id,
    tokenIdentifier: identity.tokenIdentifier,
    displayName,
    ...(imageUrl === undefined || imageUrl === null ? {} : { imageUrl }),
    createdAt: now,
    updatedAt: now,
  });

  const profile = await ctx.db.get(profileId);
  if (profile === null) {
    throw new Error("Profile not found");
  }
  return profile;
}

async function mergeDuplicateProfiles(
  ctx: MutationCtx,
  canonical: Doc<"profiles">,
  duplicates: Doc<"profiles">[],
) {
  for (const duplicate of duplicates) {
    await moveCreatedGroups(ctx, duplicate._id, canonical._id);
    await moveMemberships(ctx, duplicate._id, canonical._id);
    await moveCourseStatuses(ctx, duplicate._id, canonical._id);
    await moveCourseComments(ctx, duplicate._id, canonical._id);
    await ctx.db.delete(duplicate._id);
  }
}

async function moveCreatedGroups(
  ctx: MutationCtx,
  fromProfileId: Id<"profiles">,
  toProfileId: Id<"profiles">,
) {
  const groups = await ctx.db
    .query("friendGroups")
    .withIndex("by_creatorProfileId", (q) =>
      q.eq("creatorProfileId", fromProfileId),
    )
    .collect();

  for (const group of groups) {
    await ctx.db.patch(group._id, { creatorProfileId: toProfileId });
  }
}

async function moveMemberships(
  ctx: MutationCtx,
  fromProfileId: Id<"profiles">,
  toProfileId: Id<"profiles">,
) {
  const memberships = await ctx.db
    .query("friendGroupMembers")
    .withIndex("by_profileId", (q) => q.eq("profileId", fromProfileId))
    .collect();

  for (const membership of memberships) {
    const existing = await ctx.db
      .query("friendGroupMembers")
      .withIndex("by_groupId_and_profileId", (q) =>
        q.eq("groupId", membership.groupId).eq("profileId", toProfileId),
      )
      .unique();

    if (existing !== null) {
      await ctx.db.delete(membership._id);
    } else {
      await ctx.db.patch(membership._id, { profileId: toProfileId });
    }
  }
}

async function moveCourseStatuses(
  ctx: MutationCtx,
  fromProfileId: Id<"profiles">,
  toProfileId: Id<"profiles">,
) {
  const statuses = await ctx.db
    .query("courseStatuses")
    .withIndex("by_profileId", (q) => q.eq("profileId", fromProfileId))
    .collect();

  for (const status of statuses) {
    const existing = await ctx.db
      .query("courseStatuses")
      .withIndex("by_profileId_and_courseId", (q) =>
        q.eq("profileId", toProfileId).eq("courseId", status.courseId),
      )
      .unique();

    if (existing !== null) {
      await mergeCourseStatus(ctx, existing, status);
      await ctx.db.delete(status._id);
    } else {
      await ctx.db.patch(status._id, { profileId: toProfileId });
    }
  }
}

async function moveCourseComments(
  ctx: MutationCtx,
  fromProfileId: Id<"profiles">,
  toProfileId: Id<"profiles">,
) {
  const comments = ctx.db
    .query("courseComments")
    .withIndex("by_authorId", (q) => q.eq("authorId", fromProfileId));

  for await (const comment of comments) {
    await ctx.db.patch(comment._id, { authorId: toProfileId });
  }
}

async function mergeCourseStatus(
  ctx: MutationCtx,
  existing: Doc<"courseStatuses">,
  duplicate: Doc<"courseStatuses">,
) {
  if (duplicate.updatedAt <= existing.updatedAt) {
    return;
  }

  await ctx.db.patch(existing._id, {
    status: duplicate.status,
    updatedAt: duplicate.updatedAt,
  });
}

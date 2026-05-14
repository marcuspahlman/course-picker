import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { currentProfile, ensureProfile } from "./profileHelpers";

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    return await currentProfile(ctx);
  },
});

export const ensureMyProfile = mutation({
  args: {},
  handler: async (ctx) => {
    return await ensureProfile(ctx);
  },
});

export const setDefaultProgramme = mutation({
  args: { programmeCode: v.string() },
  handler: async (ctx, args) => {
    const profile = await ensureProfile(ctx);
    const programme = await ctx.db
      .query("programmes")
      .withIndex("by_programmeCode", (q) =>
        q.eq("programmeCode", args.programmeCode),
      )
      .unique();

    if (programme === null) {
      throw new Error("Programme not found");
    }

    await ctx.db.patch(profile._id, {
      defaultProgrammeCode: programme.programmeCode,
      updatedAt: Date.now(),
    });

    return programme.programmeCode;
  },
});

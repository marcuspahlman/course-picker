/// <reference types="node" />
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";

const siteUrls = [
  process.env.SITE_URL,
  ...(process.env.SITE_URLS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0),
].filter((origin): origin is string => origin !== undefined);

const primarySiteUrl = siteUrls[0];

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  const options = {
    appName: "Course Picker",
    baseURL: process.env.CONVEX_SITE_URL,
    trustedOrigins: siteUrls,
    database: authComponent.adapter(ctx),
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      },
    },
    plugins: [
      ...(primarySiteUrl === undefined
        ? []
        : [crossDomain({ siteUrl: primarySiteUrl })]),
      convex({ authConfig }),
    ],
  } satisfies BetterAuthOptions;

  return betterAuth(options);
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.safeGetAuthUser(ctx);
  },
});

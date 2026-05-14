/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as courseComments from "../courseComments.js";
import type * as courseData from "../courseData.js";
import type * as courseDataMigration from "../courseDataMigration.js";
import type * as courseDataModel from "../courseDataModel.js";
import type * as courseStatuses from "../courseStatuses.js";
import type * as friendGroups from "../friendGroups.js";
import type * as http from "../http.js";
import type * as profileHelpers from "../profileHelpers.js";
import type * as profiles from "../profiles.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  courseComments: typeof courseComments;
  courseData: typeof courseData;
  courseDataMigration: typeof courseDataMigration;
  courseDataModel: typeof courseDataModel;
  courseStatuses: typeof courseStatuses;
  friendGroups: typeof friendGroups;
  http: typeof http;
  profileHelpers: typeof profileHelpers;
  profiles: typeof profiles;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};

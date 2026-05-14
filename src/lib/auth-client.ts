import { createAuthClient } from "better-auth/react";
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import { getClientEnv, type ClientEnv } from "./env";

type AuthClient = ReturnType<typeof createConfiguredAuthClient>;

let authClient: AuthClient | null = null;

export function createConfiguredAuthClient(env: ClientEnv) {
  return createAuthClient({
    baseURL: env.VITE_CONVEX_SITE_URL,
    plugins: [convexClient(), crossDomainClient()],
  });
}

export function getAuthClient(env = getClientEnv()) {
  if (authClient !== null) {
    return authClient;
  }

  if (env === null) {
    throw new Error("Missing Convex auth environment variables.");
  }

  authClient = createConfiguredAuthClient(env);
  return authClient;
}

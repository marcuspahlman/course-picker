import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { getAuthClient } from "./auth-client";
import { api } from "../../convex/_generated/api";

export function useAuth() {
  const authClient = getAuthClient();
  const session = authClient.useSession();
  const profile = useQuery(api.profiles.getMyProfile);
  const ensureMyProfile = useMutation(api.profiles.ensureMyProfile);

  const hasSession = !!session.data?.session && !session.isPending;
  const isAuthenticated =
    hasSession && profile !== undefined && profile !== null;
  const isLoadingSession = session.isPending;
  const isLoadingProfile = hasSession && profile === undefined;

  useEffect(() => {
    if (hasSession && profile === null) {
      void ensureMyProfile();
    }
  }, [hasSession, profile, ensureMyProfile]);

  return {
    session: session.data ?? null,
    isAuthenticated,
    isLoadingSession,
    isLoadingProfile,
    profile: profile ?? null,
  };
}

export async function signInWithGoogle(callbackURL?: string) {
  const authClient = getAuthClient();

  await authClient.signIn.social({
    provider: "google",
    callbackURL: callbackURL ?? window.location.href,
  });
}

export async function signOut() {
  const authClient = getAuthClient();

  await authClient.signOut();
}

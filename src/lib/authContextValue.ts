import { createContext, useContext } from "react";
import type { useAuth } from "./useAuth";

type SignInPromptOpts = {
  reason?: string;
  callbackURL?: string;
};

export type AuthContextValue = ReturnType<typeof useAuth> & {
  requireAuth: <T>(
    fn: () => Promise<T> | T,
    opts?: SignInPromptOpts,
  ) => Promise<T | undefined>;
  promptSignIn: (opts?: SignInPromptOpts) => void;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within AuthContextProvider");
  }
  return ctx;
}

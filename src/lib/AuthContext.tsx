import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth, signInWithGoogle, signOut } from "./useAuth";
import { GoogleMark, CloseIcon } from "./icons";
import { AuthContext, type AuthContextValue } from "./authContextValue";

type SignInPromptOpts = {
  reason?: string;
  callbackURL?: string;
};

export function AuthContextProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [modal, setModal] = useState<SignInPromptOpts | null>(null);

  const promptSignIn = useCallback((opts?: SignInPromptOpts) => {
    setModal(opts ?? {});
  }, []);

  const requireAuth = useCallback(
    async <T,>(fn: () => Promise<T> | T, opts?: SignInPromptOpts) => {
      if (!auth.isAuthenticated) {
        setModal(opts ?? {});
        return undefined;
      }
      return await fn();
    },
    [auth.isAuthenticated],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ ...auth, requireAuth, promptSignIn, signOut }),
    [auth, requireAuth, promptSignIn],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {modal !== null && (
        <SignInModal
          reason={modal.reason}
          callbackURL={modal.callbackURL}
          onClose={() => setModal(null)}
        />
      )}
    </AuthContext.Provider>
  );
}

function SignInModal({
  reason,
  callbackURL,
  onClose,
}: {
  reason?: string;
  callbackURL?: string;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-[420px] rounded-2xl border border-stone-200 bg-white p-7 shadow-[0_18px_50px_rgba(0,0,0,0.18)] dark:border-stone-800 dark:bg-stone-900 dark:shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
        >
          <CloseIcon size={14} />
        </button>
        <div className="mb-2 font-mono text-[10.5px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
          Sign in
        </div>
        <h2 className="mb-2 text-[20px] font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          Save, plan and share with friends
        </h2>
        <p className="mb-6 text-[13.5px] leading-relaxed text-stone-500 dark:text-stone-400">
          {reason ??
            "Sign in to track saved, taking, and taken courses, and see what your friends are taking."}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await signInWithGoogle(callbackURL);
            } catch (err) {
              console.error(err);
              setBusy(false);
            }
          }}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-stone-900 px-4 text-[14px] font-medium text-stone-50 transition-colors hover:bg-stone-800 disabled:cursor-progress disabled:opacity-60 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
        >
          <GoogleMark size={16} />
          {busy ? "Redirecting…" : "Continue with Google"}
        </button>
        <p className="mt-4 text-[11.5px] text-stone-500 dark:text-stone-500">
          Browsing is public. We use Google sign-in only for the personal and
          social parts of the app.
        </p>
      </div>
    </div>
  );
}

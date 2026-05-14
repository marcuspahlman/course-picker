import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthContext } from "../lib/authContextValue";
import { signInWithGoogle } from "../lib/useAuth";
import { ArrowRightIcon, GoogleMark, UsersIcon } from "../lib/icons";

export function JoinInvitePage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const code = inviteCode ?? "";
  const auth = useAuthContext();
  const navigate = useNavigate();

  const invite = useQuery(
    api.friendGroups.getInvite,
    code ? { inviteCode: code } : "skip",
  );
  const acceptInvite = useMutation(api.friendGroups.acceptGroupInvite);

  const [joining, setJoining] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoTriedRef = useRef(false);

  useEffect(() => {
    if (
      !autoTriedRef.current &&
      auth.isAuthenticated &&
      !auth.isLoadingProfile &&
      invite &&
      !done &&
      !joining
    ) {
      autoTriedRef.current = true;
      void (async () => {
        setJoining(true);
        try {
          const res = await acceptInvite({ inviteCode: code });
          setDone(true);
          setTimeout(() => navigate(`/group/${res.groupId}`), 600);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to join");
        } finally {
          setJoining(false);
        }
      })();
    }
  }, [
    auth.isAuthenticated,
    auth.isLoadingProfile,
    invite,
    code,
    acceptInvite,
    navigate,
    done,
    joining,
  ]);

  if (invite === undefined) {
    return (
      <Card>
        <Eyebrow>Friend group invite</Eyebrow>
        <H1>Loading invite…</H1>
        <Lead>One moment while we look this up.</Lead>
      </Card>
    );
  }

  if (invite === null) {
    return (
      <Card>
        <Eyebrow>Invite</Eyebrow>
        <H1>This invite link doesn't work</H1>
        <Lead>
          The code{" "}
          <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[12.5px] dark:bg-stone-800">
            {code}
          </code>{" "}
          is invalid or has been revoked. Ask whoever sent it for a fresh link.
        </Lead>
        <Link
          to="/"
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-stone-900 px-4 text-[13.5px] font-medium text-stone-50 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
        >
          Browse courses
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <Eyebrow>You've been invited</Eyebrow>
      <H1>
        Join{" "}
        <span className="text-stone-900 dark:text-stone-100">
          {invite.name}
        </span>
      </H1>
      <Lead>
        <UsersIcon size={13} className="-mt-0.5 mr-1 inline align-middle" />
        {invite.memberCount} member{invite.memberCount === 1 ? "" : "s"} so far.
        Members can see each other's saved, taking, and taken lists across the
        course catalogue.
      </Lead>

      {error && (
        <div className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-[13px] text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      {!auth.isAuthenticated && !auth.isLoadingSession && (
        <button
          type="button"
          onClick={async () => {
            await signInWithGoogle(window.location.href);
          }}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-stone-900 px-4 text-[14px] font-medium text-stone-50 transition-colors hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
        >
          <GoogleMark size={16} />
          Continue with Google
        </button>
      )}

      {auth.isLoadingSession && (
        <button
          type="button"
          disabled
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-4 text-[14px] font-medium text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400"
        >
          Loading…
        </button>
      )}

      {auth.isAuthenticated && joining && (
        <button
          type="button"
          disabled
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-4 text-[14px] font-medium text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400"
        >
          Joining {invite.name}…
        </button>
      )}

      {auth.isAuthenticated && done && (
        <button
          type="button"
          disabled
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-stone-900 px-4 text-[14px] font-medium text-stone-50 dark:bg-stone-100 dark:text-stone-900"
        >
          Joined — taking you in
          <ArrowRightIcon size={14} />
        </button>
      )}

      <p className="mt-4 text-[11.5px] text-stone-500 dark:text-stone-500">
        Browsing courses doesn't need an account. Joining a group does.
      </p>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto my-16 w-full max-w-[460px] rounded-2xl border border-stone-200 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_18px_50px_-20px_rgba(0,0,0,0.18)] dark:border-stone-800 dark:bg-stone-900 dark:shadow-[0_18px_50px_rgba(0,0,0,0.4)]">
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 font-mono text-[10.5px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
      {children}
    </div>
  );
}

function H1({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="mb-3 text-[1.6rem] font-semibold leading-tight tracking-tight text-stone-900 dark:text-stone-100">
      {children}
    </h1>
  );
}

function Lead({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-6 text-[14.5px] leading-relaxed text-stone-500 dark:text-stone-400">
      {children}
    </p>
  );
}

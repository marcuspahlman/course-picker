import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { EmptyState } from "../components/States";
import { useAuthContext } from "../lib/authContextValue";
import { ArrowRightIcon, PlusIcon, UsersIcon } from "../lib/icons";
import { MonoChip } from "../components/Primitives";

export function GroupsListPage() {
  const auth = useAuthContext();
  const groups = useQuery(
    api.friendGroups.listMyGroups,
    auth.isAuthenticated ? {} : "skip",
  );
  const createGroup = useMutation(api.friendGroups.createGroup);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!auth.isAuthenticated) {
    return (
      <div>
        <EmptyState
          title="Sign in to create or join groups"
          body="Groups are tied to your account. Browsing courses doesn't need an account; planning together does."
          action={
            <button
              type="button"
              onClick={() => auth.promptSignIn()}
              className="inline-flex h-9 items-center rounded-md bg-stone-900 px-4 text-[13px] font-medium text-stone-50 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
            >
              Sign in
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <section className="mt-2">
        <div className="mb-4 flex items-center gap-3 border-b border-stone-200 pb-3 dark:border-stone-800">
          <h2 className="text-[15px] font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            Your groups
          </h2>
          <span className="ml-auto font-mono text-[11px] text-stone-400 dark:text-stone-500">
            {groups
              ? `${groups.length} group${groups.length === 1 ? "" : "s"}`
              : ""}
          </span>
        </div>

        {groups && groups.length === 0 && (
          <EmptyState
            title="No groups yet"
            body="Create your first one below or open an invite link from a friend."
          />
        )}

        {groups && groups.length > 0 && (
          <div className="stagger flex flex-col gap-3">
            {groups.map((g) => (
              <Link
                key={g.group._id}
                to={`/group/${g.group._id}`}
                className="group flex items-center justify-between rounded-xl border border-stone-200 bg-white p-5 transition-colors hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
              >
                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center gap-2 text-stone-500 dark:text-stone-400">
                    <UsersIcon size={13} />
                    <span className="text-[12px]">
                      {g.memberCount} member
                      {g.memberCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <h3 className="truncate text-[18px] font-semibold leading-snug tracking-tight text-stone-900 dark:text-stone-100">
                    {g.group.name}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-500">
                    <span className="font-mono">invite</span>
                    <MonoChip>{g.group.inviteCode}</MonoChip>
                  </div>
                </div>
                <ArrowRightIcon
                  size={16}
                  className="text-stone-400 transition-transform group-hover:translate-x-0.5 dark:text-stone-500"
                />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-center gap-3 border-b border-stone-200 pb-3 dark:border-stone-800">
          <h2 className="text-[15px] font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            Start a group
          </h2>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (creating) return;
            setError(null);
            setCreating(true);
            try {
              await createGroup({ name: name.trim() || undefined });
              setName("");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to create");
            } finally {
              setCreating(false);
            }
          }}
          className="flex max-w-[520px] items-stretch gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. KTH Year 1 - Group A"
            className="h-10 flex-1 rounded-md border border-stone-200 bg-white px-3 text-[14px] text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-200 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-stone-600 dark:focus:ring-stone-800"
          />
          <button
            type="submit"
            disabled={creating}
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-stone-900 px-4 text-[13px] font-medium text-stone-50 transition-colors hover:bg-stone-800 disabled:cursor-progress disabled:opacity-60 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
          >
            <PlusIcon size={13} />
            {creating ? "Creating…" : "Create"}
          </button>
        </form>
        {error && (
          <p className="mt-2 text-[13px] text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}
        <p className="mt-2 text-[12.5px] text-stone-500 dark:text-stone-400">
          You'll get a private invite link to share with the people you want in
          the group.
        </p>
      </section>
    </div>
  );
}

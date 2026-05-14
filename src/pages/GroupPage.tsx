import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Avatar } from "../components/Avatar";
import { FriendCoursePeopleRows } from "../components/FriendCoursePeopleRows";
import { CourseListSkeleton, EmptyState } from "../components/States";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CopyIcon,
  UsersIcon,
} from "../lib/icons";
import { useAuthContext } from "../lib/authContextValue";
import { MonoChip } from "../components/Primitives";
import type { FriendCourseProfileChip } from "../lib/friendsCourseActivity";
import { courseRoute, displayCourseCode } from "../lib/course";

export function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const auth = useAuthContext();
  const data = useQuery(
    api.friendGroups.getGroupSocialSummary,
    auth.isAuthenticated && groupId
      ? { groupId: groupId as Id<"friendGroups"> }
      : "skip",
  );
  const [copied, setCopied] = useState(false);

  if (!auth.isAuthenticated) {
    return (
      <div>
        <Back />
        <EmptyState
          title="Sign in to view this group"
          body="Group activity is private to members."
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

  if (data === undefined) {
    return (
      <div>
        <Back />
        <CourseListSkeleton rows={3} />
      </div>
    );
  }

  if (data === null) {
    return (
      <div>
        <Back />
        <EmptyState
          title="Group not found"
          body="It may have been removed, or you might not be a member."
          action={
            <Link
              to="/groups"
              className="inline-flex h-9 items-center rounded-md border border-stone-200 bg-white px-3 text-[13px] font-medium text-stone-900 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
            >
              Back to your groups
            </Link>
          }
        />
      </div>
    );
  }

  const inviteUrl = `${window.location.origin}/join/${data.group.inviteCode}`;
  const profileById = new Map<
    string,
    { displayName: string; imageUrl?: string | null } | null
  >();
  for (const m of data.members) {
    if (m.profile) {
      profileById.set(m.profile._id as string, {
        displayName: m.profile.displayName,
        imageUrl: m.profile.imageUrl ?? null,
      });
    }
  }
  function nameOf(profileId: Id<"profiles">) {
    const p = profileById.get(profileId as string);
    return p?.displayName ?? "Member";
  }

  return (
    <div>
      <Back />

      <section className="mb-10">
        <h1 className="text-[2.2rem] font-semibold leading-[1.05] tracking-tightest text-stone-900 sm:text-[2.6rem] dark:text-stone-100">
          {data.group.name}
        </h1>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <span className="flex items-center -space-x-2">
            {data.members.slice(0, 8).map((m, i) =>
              m.profile ? (
                <Avatar
                  key={i}
                  profile={{
                    displayName: m.profile.displayName,
                    imageUrl: m.profile.imageUrl ?? null,
                  }}
                />
              ) : null,
            )}
          </span>
          <div className="leading-tight">
            <div className="text-[13.5px] text-stone-700 dark:text-stone-200">
              {data.members
                .slice(0, 3)
                .map((m) => m.profile?.displayName ?? "Member")
                .join(", ")}
              {data.members.length > 3 &&
                ` and ${data.members.length - 3} more`}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-stone-500 dark:text-stone-400">
              <UsersIcon size={11} /> joined this group
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 dark:border-stone-800 dark:bg-stone-900">
            <span className="font-mono text-[10.5px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
              Invite
            </span>
            <MonoChip>{data.group.inviteCode}</MonoChip>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(inviteUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[12px] text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
              title="Copy invite link"
            >
              <CopyIcon size={12} />
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-2">
        <div className="mb-4 flex items-center gap-3 border-b border-stone-200 pb-3 dark:border-stone-800">
          <h2 className="text-[15px] font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            Courses friends are planning
          </h2>
          <span className="ml-auto font-mono text-[11px] text-stone-400 dark:text-stone-500">
            {data.courseStatuses.length} course
            {data.courseStatuses.length === 1 ? "" : "s"}
          </span>
        </div>

        {data.courseStatuses.length === 0 ? (
          <EmptyState
            title="No course activity yet"
            body="When you or anyone in this group saves, takes, or has taken a course, it shows up here."
            action={
              <Link
                to="/"
                className="inline-flex h-9 items-center rounded-md border border-stone-200 bg-white px-3 text-[13px] font-medium text-stone-900 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
              >
                Browse courses
              </Link>
            }
          />
        ) : (
          <div className="stagger flex flex-col gap-3">
            {data.courseStatuses.map((cs) => {
              const chipOf = (
                profileId: (typeof cs.memberStatuses)[0]["profileId"],
              ): FriendCourseProfileChip => ({
                profileId: profileId as string,
                displayName: nameOf(profileId),
                imageUrl:
                  profileById.get(profileId as string)?.imageUrl ?? null,
              });
              const saved = cs.memberStatuses
                .filter((p) => p.status === "saved")
                .map((p) => chipOf(p.profileId));
              const taking = cs.memberStatuses
                .filter((p) => p.status === "taking")
                .map((p) => chipOf(p.profileId));
              const taken = cs.memberStatuses
                .filter((p) => p.status === "taken")
                .map((p) => chipOf(p.profileId));
              return (
                <Link
                  key={cs.courseId}
                  to={courseRoute(cs.course!)}
                  className="group flex items-center justify-between gap-5 rounded-xl border border-stone-200 bg-white p-5 transition-colors hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
                >
                  <div className="min-w-0">
                    <div className="mb-1.5 flex items-center gap-2">
                      <MonoChip>{displayCourseCode(cs.course!)}</MonoChip>
                    </div>
                    <h3 className="truncate text-[17px] font-semibold leading-snug tracking-tight text-stone-900 dark:text-stone-100">
                      {cs.course!.courseTitle}
                    </h3>
                    {cs.programmeContexts.length > 0 && (
                      <div className="mt-1.5 font-mono text-[10.5px] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                        {cs.programmeContexts
                          .map((context) => context.programme.programmeCode)
                          .join(", ")}
                      </div>
                    )}
                    <FriendCoursePeopleRows
                      className="mt-3"
                      saved={saved}
                      taking={taking}
                      taken={taken}
                    />
                  </div>
                  <ArrowRightIcon
                    size={14}
                    className="text-stone-400 transition-transform group-hover:translate-x-0.5 dark:text-stone-500"
                  />
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Back() {
  return (
    <Link
      to="/groups"
      className="mb-8 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-stone-400 hover:text-stone-900 dark:text-stone-500 dark:hover:text-stone-100"
    >
      <ArrowLeftIcon size={12} /> All groups
    </Link>
  );
}

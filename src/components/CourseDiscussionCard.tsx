import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthContext } from "../lib/authContextValue";

const MAX_COMMENT_LENGTH = 1000;

type Props = {
  courseId: Id<"courses">;
  courseCode: string;
};

export function CourseDiscussionCard({ courseId, courseCode }: Props) {
  const auth = useAuthContext();
  const discussion = useQuery(api.courseComments.listForCourse, { courseId });
  const createComment = useMutation(api.courseComments.create);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollAfterSubmit = useRef(false);

  const trimmed = body.trim();
  const canSubmit = trimmed.length > 0 && !submitting;
  const comments = discussion?.comments;
  const isSignedOutView = discussion?.visibility === "signedOut";

  useEffect(() => {
    if (!scrollAfterSubmit.current || comments === undefined) return;
    const el = listRef.current;
    if (el === null) return;

    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
      scrollAfterSubmit.current = false;
    });
  }, [comments]);

  async function submitComment() {
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      scrollAfterSubmit.current = true;
      await createComment({ courseId, body: trimmed });
      setBody("");
    } catch (err) {
      scrollAfterSubmit.current = false;
      setError(err instanceof Error ? err.message : "Could not post comment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="flex max-h-[28rem] min-h-[21rem] flex-col rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-4">
        <div className="font-mono text-[10.5px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
          Discussion
        </div>
      </div>

      <div
        ref={listRef}
        className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto pr-1"
        aria-live="polite"
      >
        {discussion === undefined ? (
          <div className="space-y-3">
            <CommentSkeleton />
            <CommentSkeleton />
          </div>
        ) : isSignedOutView ? (
          <EmptyDiscussionState>
            Sign in to see friends' notes.
          </EmptyDiscussionState>
        ) : discussion.comments.length === 0 ? (
          <EmptyDiscussionState>No group notes yet.</EmptyDiscussionState>
        ) : (
          <ol className="space-y-3">
            {discussion.comments.map((comment) => (
              <li
                key={comment._id}
                className="border-b border-stone-100 pb-3 last:border-b-0 last:pb-0 dark:border-stone-800"
              >
                <div className="flex items-start gap-2.5">
                  <Avatar
                    name={comment.author.displayName}
                    imageUrl={comment.author.imageUrl}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="truncate text-[12.5px] font-medium text-stone-900 dark:text-stone-100">
                        {comment.author.displayName}
                      </span>
                      <time
                        dateTime={new Date(comment.createdAt).toISOString()}
                        className="text-[11px] text-stone-400 dark:text-stone-500"
                      >
                        {formatTimestamp(comment.createdAt)}
                      </time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-stone-600 dark:text-stone-300">
                      {comment.body}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-4">
        {auth.isAuthenticated ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitComment();
            }}
          >
            <textarea
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && event.metaKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              maxLength={MAX_COMMENT_LENGTH}
              rows={2}
              placeholder={`Add a note about ${courseCode}`}
              className="block max-h-28 min-h-16 w-full resize-y rounded-md border border-stone-200 bg-white px-3 py-2 text-[12.5px] leading-relaxed text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-400 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-stone-600"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                {error ? (
                  <p className="text-[11.5px] text-red-600 dark:text-red-400">
                    {error}
                  </p>
                ) : (
                  <p className="text-[11.5px] text-stone-400 dark:text-stone-500">
                    {trimmed.length}/{MAX_COMMENT_LENGTH}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex h-8 items-center rounded-md bg-stone-900 px-3 text-[12.5px] font-medium text-stone-50 transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
              >
                {submitting ? "Posting" : "Post"}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12.5px] leading-relaxed text-stone-500 dark:text-stone-400">
              Group discussions are private. Sign in to see and add notes.
            </p>
            <button
              type="button"
              onClick={() =>
                auth.promptSignIn({
                  reason: `Sign in to add a note to ${courseCode}.`,
                })
              }
              className="inline-flex h-8 shrink-0 items-center rounded-md border border-stone-200 bg-white px-3 text-[12.5px] font-medium text-stone-900 transition-colors hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-stone-700"
            >
              Sign in
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyDiscussionState({ children }: { children: string }) {
  return (
    <div className="flex h-full min-h-36 items-center justify-center px-2">
      <p className="max-w-[28ch] text-center text-[12.5px] leading-relaxed text-stone-400 dark:text-stone-500">
        {children}
      </p>
    </div>
  );
}

function Avatar({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="h-7 w-7 shrink-0 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 font-mono text-[10px] text-stone-500 dark:bg-stone-800 dark:text-stone-300">
      {initials || "S"}
    </div>
  );
}

function CommentSkeleton() {
  return (
    <div className="flex items-start gap-2.5 border-b border-stone-100 pb-3 dark:border-stone-800">
      <div className="h-7 w-7 shrink-0 rounded-full bg-stone-100 skeleton-shimmer dark:bg-stone-800" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 w-24 rounded bg-stone-100 skeleton-shimmer dark:bg-stone-800" />
        <div className="h-3 w-full rounded bg-stone-100 skeleton-shimmer dark:bg-stone-800" />
        <div className="h-3 w-2/3 rounded bg-stone-100 skeleton-shimmer dark:bg-stone-800" />
      </div>
    </div>
  );
}

function formatTimestamp(createdAt: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

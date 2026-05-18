import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuthContext } from "../lib/authContextValue";
import { Avatar } from "./Avatar";
import { ThemeToggle } from "./ThemeToggle";
import {
  ALL_CATEGORIES,
  ALL_PERIODS,
  ALL_STUDY_YEARS,
  CATEGORY_LABEL,
  type CourseCategory,
  type Period,
  type StudyYear,
} from "../lib/course";
import {
  ArrowRightIcon,
  BooksIcon,
  CloseIcon,
  UserIcon,
  UsersIcon,
} from "../lib/icons";
import { cn } from "../lib/cn";

export type SortMode = "default" | "alphabetical" | "credits" | "friends";

type Props = {
  periods: Set<Period>;
  onTogglePeriod: (p: Period) => void;
  studyYears: Set<StudyYear>;
  onToggleStudyYear: (y: StudyYear) => void;
  categories: Set<CourseCategory>;
  onToggleCategory: (c: CourseCategory) => void;
  showTaken: boolean;
  onToggleShowTaken: () => void;
  sort: SortMode;
  onSort: (s: SortMode) => void;
  groupContext: boolean;
  onClose?: () => void;
  open?: boolean;
};

const NAV_BASE =
  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13.5px] transition-colors";
const NAV_INACTIVE =
  "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800/60 dark:hover:text-stone-100";
const NAV_ACTIVE =
  "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100";

const LABEL =
  "px-2 mb-1.5 font-mono text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500";

export function Sidebar({
  periods,
  onTogglePeriod,
  studyYears,
  onToggleStudyYear,
  categories,
  onToggleCategory,
  showTaken,
  onToggleShowTaken,
  sort,
  onSort,
  groupContext,
  onClose,
  open,
}: Props) {
  const auth = useAuthContext();
  const loc = useLocation();
  const onBrowser = loc.pathname === "/";
  const coursesNavActive =
    loc.pathname === "/" || loc.pathname.startsWith("/course/");
  const friendGroupsNavActive =
    loc.pathname === "/groups" || loc.pathname.startsWith("/group/");
  const canSortByFriends = groupContext || auth.isAuthenticated;
  const effectiveSort =
    sort === "friends" && !canSortByFriends ? "default" : sort;

  return (
    <>
      {open && onClose && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "z-50 flex w-[280px] shrink-0 flex-col gap-7 overflow-y-auto border-r border-stone-200 bg-white px-5 py-6 dark:border-stone-800 dark:bg-stone-950",
          "fixed inset-y-0 left-0 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0",
          open
            ? "translate-x-0 shadow-xl"
            : "-translate-x-full md:translate-x-0",
        )}
        aria-label="Navigation"
      >
        <div className="flex items-center gap-2">
          <Link
            to="/"
            onClick={onClose}
            className="group flex min-w-0 flex-1 flex-col justify-center rounded-md py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-stone-500 dark:focus-visible:ring-offset-stone-950"
          >
            <span className="truncate text-[15px] font-semibold tracking-tight text-stone-900 transition-colors group-hover:text-stone-700 dark:text-stone-100 dark:group-hover:text-stone-200">
              Course Picker
            </span>
            <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
              Find and pick courses
            </span>
          </Link>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:text-stone-900 dark:border-stone-800 dark:text-stone-400 dark:hover:text-stone-100 md:hidden"
            >
              <CloseIcon size={13} />
            </button>
          )}
        </div>

        <nav className="flex flex-col gap-0.5">
          <NavLink
            to="/"
            end
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                NAV_BASE,
                isActive || coursesNavActive ? NAV_ACTIVE : NAV_INACTIVE,
              )
            }
          >
            <BooksIcon size={14} />
            Courses
          </NavLink>
          <NavLink
            to="/me"
            onClick={onClose}
            className={({ isActive }) =>
              cn(NAV_BASE, isActive ? NAV_ACTIVE : NAV_INACTIVE)
            }
          >
            <UserIcon size={14} />
            My courses
          </NavLink>
          <NavLink
            to="/groups"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                NAV_BASE,
                isActive || friendGroupsNavActive ? NAV_ACTIVE : NAV_INACTIVE,
              )
            }
          >
            <UsersIcon size={14} />
            Friend groups
          </NavLink>
        </nav>

        {onBrowser && (
          <>
            <div>
              <div className={LABEL}>Year</div>
              <div className="grid grid-cols-2 gap-1.5 px-1">
                {ALL_STUDY_YEARS.map((y) => (
                  <label
                    key={y}
                    className={cn(
                      "flex h-8 cursor-pointer items-center justify-center gap-2 rounded-md border font-mono text-[12px] tracking-wider transition-colors",
                      studyYears.has(y)
                        ? "border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-stone-700",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={studyYears.has(y)}
                      onChange={() => onToggleStudyYear(y)}
                      className="sr-only"
                    />
                    Year {y}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className={LABEL}>Period</div>
              <div className="grid grid-cols-4 gap-1.5 px-1">
                {ALL_PERIODS.map((p) => (
                  <label
                    key={p}
                    className={cn(
                      "flex h-8 cursor-pointer items-center justify-center rounded-md border font-mono text-[12px] tracking-wider transition-colors",
                      periods.has(p)
                        ? "border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-stone-700",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={periods.has(p)}
                      onChange={() => onTogglePeriod(p)}
                      className="sr-only"
                    />
                    {p}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className={LABEL}>Show</div>
              <div className="flex flex-col gap-0.5">
                {ALL_CATEGORIES.map((c) => (
                  <label
                    key={c}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800/60"
                  >
                    <input
                      type="checkbox"
                      checked={categories.has(c)}
                      onChange={() => onToggleCategory(c)}
                      className="checkbox-minimal"
                    />
                    <span>{CATEGORY_LABEL[c]}</span>
                  </label>
                ))}
                <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800/60">
                  <input
                    type="checkbox"
                    checked={showTaken}
                    onChange={onToggleShowTaken}
                    className="checkbox-minimal"
                  />
                  <span>Taken</span>
                </label>
              </div>
            </div>

            <div>
              <div className={LABEL}>Sort</div>
              <div className="flex flex-col gap-0.5">
                {(
                  [
                    ...(canSortByFriends
                      ? ([["friends", "Popularity"]] as const)
                      : []),
                    ["default", "Programme order"],
                    ["alphabetical", "Alphabetical"],
                    ["credits", "Credits"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800/60"
                  >
                    <input
                      type="radio"
                      name="sort"
                      checked={effectiveSort === value}
                      onChange={() => onSort(value)}
                      className="radio-minimal"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="mt-auto flex flex-col gap-3 border-t border-stone-200 pt-4 dark:border-stone-800">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
              Theme
            </span>
            <ThemeToggle />
          </div>

          {auth.isLoadingSession ? (
            <div className="rounded-md border border-stone-200 px-3 py-2 text-[12.5px] text-stone-400 dark:border-stone-800 dark:text-stone-500">
              Loading session…
            </div>
          ) : auth.isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Sign out?")) void auth.signOut();
                onClose?.();
              }}
              className="flex items-center gap-2.5 rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:border-stone-200 hover:bg-white dark:hover:border-stone-800 dark:hover:bg-stone-900"
              title="Sign out"
            >
              <Avatar
                profile={
                  auth.profile
                    ? {
                        displayName: auth.profile.displayName,
                        imageUrl: auth.profile.imageUrl ?? null,
                      }
                    : null
                }
                ring={false}
              />
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[13px] font-medium text-stone-900 dark:text-stone-100">
                  {auth.profile?.displayName ?? "Signed in"}
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-500">
                  Signed in
                </div>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                auth.promptSignIn();
                onClose?.();
              }}
              className="flex w-full items-center justify-between rounded-md border border-stone-200 bg-white px-3 py-2 text-[13px] font-medium text-stone-900 transition-colors hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-stone-700"
            >
              <span>Sign in</span>
              <ArrowRightIcon size={13} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

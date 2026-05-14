import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { CourseCategory, Period, StudyYear } from "../lib/course";
import { Sidebar, type SortMode } from "./Sidebar";
import { MenuIcon } from "../lib/icons";

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
  children: ReactNode;
};

export function AppShell({
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
  children,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        periods={periods}
        onTogglePeriod={onTogglePeriod}
        studyYears={studyYears}
        onToggleStudyYear={onToggleStudyYear}
        categories={categories}
        onToggleCategory={onToggleCategory}
        showTaken={showTaken}
        onToggleShowTaken={onToggleShowTaken}
        sort={sort}
        onSort={onSort}
        groupContext={groupContext}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-stone-200 bg-white/90 px-4 py-2.5 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-950/90 md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-stone-200 text-stone-700 hover:border-stone-300 dark:border-stone-800 dark:text-stone-300 dark:hover:border-stone-700"
          >
            <MenuIcon size={16} />
          </button>
          <Link
            to="/"
            className="text-[15px] font-semibold tracking-tight text-stone-900 dark:text-stone-100"
          >
            Course Picker
          </Link>
        </div>

        <div className="mx-auto w-full max-w-[68rem] flex-1 px-6 py-10 lg:px-12 lg:py-14">
          {children}
        </div>
      </main>
    </div>
  );
}

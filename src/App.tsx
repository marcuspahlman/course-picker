import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Link,
} from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AuthContextProvider } from "./lib/AuthContext";
import { BrowsePage } from "./pages/BrowsePage";
import { CourseDetailPage } from "./pages/CourseDetailPage";
import { MyCoursesPage } from "./pages/MyCoursesPage";
import { GroupsListPage } from "./pages/GroupsListPage";
import { GroupPage } from "./pages/GroupPage";
import { JoinInvitePage } from "./pages/JoinInvitePage";
import {
  ALL_CATEGORIES,
  ALL_PERIODS,
  ALL_STUDY_YEARS,
  type CourseCategory,
  type Period,
  type StudyYear,
} from "./lib/course";
import type { SortMode } from "./components/Sidebar";
import { ThemeToggle } from "./components/ThemeToggle";
import { useAuthContext } from "./lib/authContextValue";
import { api } from "../convex/_generated/api";

const FALLBACK_PROGRAMME_CODE = "TIMTM";

export default function App() {
  return (
    <BrowserRouter>
      <AuthContextProvider>
        <AppRoutes />
      </AuthContextProvider>
    </BrowserRouter>
  );
}

function AppRoutes() {
  const loc = useLocation();
  const isJoin = loc.pathname.startsWith("/join/");

  if (isJoin) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-950/90">
          <div className="mx-auto flex max-w-[68rem] items-center justify-between px-6 py-3 lg:px-12">
            <Link
              to="/"
              className="text-[15px] font-semibold tracking-tight text-stone-900 dark:text-stone-100"
            >
              Course Picker
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 px-4">
          <Routes>
            <Route path="/join/:inviteCode" element={<JoinInvitePage />} />
          </Routes>
        </main>
      </div>
    );
  }

  return <ShellRoutes />;
}

function ShellRoutes() {
  const auth = useAuthContext();
  const programmes = useQuery(api.courseData.listProgrammes);
  const initialisedForProfileRef = useRef<string | null>(null);
  const [selectedProgrammeCode, setSelectedProgrammeCode] = useState(
    FALLBACK_PROGRAMME_CODE,
  );
  const [periods, setPeriods] = useState<Set<Period>>(
    () => new Set(ALL_PERIODS),
  );
  const [studyYears, setStudyYears] = useState<Set<StudyYear>>(
    () => new Set(ALL_STUDY_YEARS),
  );
  const [categories, setCategories] = useState<Set<CourseCategory>>(
    () => new Set(ALL_CATEGORIES),
  );
  const [showTaken, setShowTaken] = useState(false);
  const [sort, setSort] = useState<SortMode>("friends");

  useEffect(() => {
    if (programmes === undefined || programmes.length === 0) return;
    if (auth.isLoadingSession || auth.isLoadingProfile) return;

    const profileKey = auth.profile?._id ?? "anonymous";
    if (initialisedForProfileRef.current === profileKey) return;

    const savedDefault = auth.profile?.defaultProgrammeCode;
    const validDefault =
      savedDefault !== undefined &&
      programmes.some((programme) => programme.programmeCode === savedDefault);

    setSelectedProgrammeCode(
      validDefault ? savedDefault : FALLBACK_PROGRAMME_CODE,
    );
    initialisedForProfileRef.current = profileKey;
  }, [auth.isLoadingProfile, auth.isLoadingSession, auth.profile, programmes]);

  function togglePeriod(p: Period) {
    setPeriods((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  function toggleStudyYear(y: StudyYear) {
    setStudyYears((prev) => {
      const next = new Set(prev);
      if (next.has(y)) next.delete(y);
      else next.add(y);
      return next;
    });
  }

  function toggleCategory(c: CourseCategory) {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  return (
    <AppShell
      periods={periods}
      onTogglePeriod={togglePeriod}
      studyYears={studyYears}
      onToggleStudyYear={toggleStudyYear}
      categories={categories}
      onToggleCategory={toggleCategory}
      showTaken={showTaken}
      onToggleShowTaken={() => setShowTaken((prev) => !prev)}
      sort={sort}
      onSort={setSort}
      groupContext={false}
    >
      <Routes>
        <Route
          path="/"
          element={
            <BrowsePage
              programmes={programmes}
              defaultProgrammeCode={auth.profile?.defaultProgrammeCode ?? null}
              programmeCode={selectedProgrammeCode}
              onSelectProgramme={setSelectedProgrammeCode}
              periods={periods}
              studyYears={studyYears}
              categories={categories}
              showTaken={showTaken}
              sort={sort}
            />
          }
        />
        <Route path="/course/:courseCode" element={<CourseDetailPage />} />
        <Route path="/me" element={<MyCoursesPage />} />
        <Route path="/groups" element={<GroupsListPage />} />
        <Route path="/group/:groupId" element={<GroupPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  );
}

function NotFound() {
  return (
    <div>
      <section className="mb-10">
        <div className="mb-6 flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
            404
          </span>
          <div className="h-px max-w-16 flex-1 bg-stone-200 dark:bg-stone-800" />
        </div>
        <h1 className="max-w-[20ch] text-[2.2rem] font-semibold leading-[1.05] tracking-tightest text-stone-900 sm:text-[2.6rem] dark:text-stone-100">
          This page doesn't exist.
        </h1>
        <p className="mt-4 max-w-[60ch] text-[15.5px] leading-relaxed text-stone-500 dark:text-stone-400">
          The link may be old, or the address mistyped.
        </p>
      </section>
      <Link
        to="/"
        className="inline-flex h-9 items-center rounded-md border border-stone-200 bg-white px-3 text-[13px] font-medium text-stone-900 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
      >
        Back to all courses
      </Link>
    </div>
  );
}

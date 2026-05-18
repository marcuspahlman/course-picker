import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import type { Doc } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { useAuthContext } from "../lib/authContextValue";
import { CheckIcon, ChevronDownIcon, MoreVerticalIcon } from "../lib/icons";
import { cn } from "../lib/cn";
import {
  ALL_LIBRARY_CODE,
  ALL_LIBRARY_NAME,
  OTHER_LIBRARY_CODE,
  OTHER_LIBRARY_NAME,
} from "../lib/course";

type Programme = Doc<"programmes">;
type LibraryItem =
  | { kind: "programme"; programme: Programme }
  | { kind: "other"; programmeCode: typeof OTHER_LIBRARY_CODE }
  | { kind: "all"; programmeCode: typeof ALL_LIBRARY_CODE };

function formatProgrammeName(programmeName: string) {
  return programmeName.replace(/^master(?:['’]s|s)?\s+programme,\s*/i, "");
}

function orderLibraryItems(programmes: Programme[]): LibraryItem[] {
  const programmeItems = [...programmes]
    .sort((a, b) =>
      a.programmeCode.localeCompare(b.programmeCode, undefined, {
        sensitivity: "base",
      }),
    )
    .map((programme) => ({
      kind: "programme" as const,
      programme,
    }));
  const otherItem: LibraryItem = {
    kind: "other",
    programmeCode: OTHER_LIBRARY_CODE,
  };
  const allItem: LibraryItem = {
    kind: "all",
    programmeCode: ALL_LIBRARY_CODE,
  };
  return [...programmeItems, otherItem, allItem];
}

type Props = {
  programmes: Programme[] | undefined;
  defaultProgrammeCode: string | null;
  selectedProgrammeCode: string;
  onSelectProgramme: (programmeCode: string) => void;
  compact?: boolean;
  className?: string;
};

export function ProgrammePicker({
  programmes,
  defaultProgrammeCode,
  selectedProgrammeCode,
  onSelectProgramme,
  compact = false,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [actionProgrammeCode, setActionProgrammeCode] = useState<string | null>(
    null,
  );
  const [pendingDefaultCode, setPendingDefaultCode] = useState<string | null>(
    null,
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const auth = useAuthContext();
  const setDefaultProgramme = useMutation(api.profiles.setDefaultProgramme);
  const selectedProgramme = programmes?.find(
    (programme) => programme.programmeCode === selectedProgrammeCode,
  );
  const selectedProgrammeName =
    selectedProgrammeCode === ALL_LIBRARY_CODE
      ? ALL_LIBRARY_NAME
      : selectedProgrammeCode === OTHER_LIBRARY_CODE
        ? OTHER_LIBRARY_NAME
        : selectedProgramme === undefined
          ? "Course catalogue"
          : formatProgrammeName(selectedProgramme.programmeName);
  const savedDefaultCode =
    pendingDefaultCode ??
    (defaultProgrammeCode !== null &&
    programmes?.some(
      (programme) => programme.programmeCode === defaultProgrammeCode,
    )
      ? defaultProgrammeCode
      : "TIMTM");
  const items: LibraryItem[] =
    programmes && programmes.length > 0
      ? orderLibraryItems(programmes)
      : selectedProgrammeCode === OTHER_LIBRARY_CODE ||
          selectedProgrammeCode === ALL_LIBRARY_CODE
        ? [
            { kind: "other", programmeCode: OTHER_LIBRARY_CODE },
            { kind: "all", programmeCode: ALL_LIBRARY_CODE },
          ]
        : selectedProgramme === undefined
          ? [
              {
                kind: "programme",
                programme: {
                  _id: selectedProgrammeCode,
                  programmeCode: selectedProgrammeCode,
                  programmeName: selectedProgrammeCode,
                } as Programme,
              },
              { kind: "other", programmeCode: OTHER_LIBRARY_CODE },
              { kind: "all", programmeCode: ALL_LIBRARY_CODE },
            ]
          : [
              { kind: "programme", programme: selectedProgramme },
              { kind: "other", programmeCode: OTHER_LIBRARY_CODE },
              { kind: "all", programmeCode: ALL_LIBRARY_CODE },
            ];

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActionProgrammeCode(null);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative w-full min-w-0 lg:min-w-[260px] lg:max-w-md",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Switch Course Picker programme"
        aria-expanded={open}
        onClick={() => {
          setOpen((prev) => !prev);
          setActionProgrammeCode(null);
        }}
        className={cn(
          "inline-flex w-full max-w-full items-center gap-3 rounded-lg border border-stone-200 bg-white text-left text-[14px] transition-colors",
          compact ? "h-12 px-4" : "min-h-12 px-4 py-2.5",
          "hover:border-stone-300",
          "focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200",
          open &&
            "border-stone-400 ring-2 ring-stone-200 dark:border-stone-600 dark:ring-stone-800",
          "dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700",
          "dark:focus:border-stone-600 dark:focus:ring-stone-800",
        )}
      >
        <span className={cn("min-w-0 flex-1", !compact && "space-y-0.5")}>
          <span className="block truncate font-mono text-[13px] font-semibold tabular-nums tracking-normal text-stone-900 dark:text-stone-100">
            {selectedProgrammeCode}
          </span>
          {!compact && (
            <span className="block truncate text-[13px] text-stone-600 dark:text-stone-400">
              {selectedProgrammeName}
            </span>
          )}
        </span>
        <ChevronDownIcon
          size={13}
          className={cn(
            "ml-0 shrink-0 text-stone-400 transition-transform dark:text-stone-500",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 min-w-[20rem] rounded-md border border-stone-200 bg-white p-1.5 shadow-lg dark:border-stone-800 dark:bg-stone-900">
          {items.map((item) => {
            const programmeCode =
              item.kind === "other"
                ? item.programmeCode
                : item.kind === "all"
                  ? item.programmeCode
                  : item.programme.programmeCode;
            const selected = programmeCode === selectedProgrammeCode;
            const isLibraryItem = item.kind === "other" || item.kind === "all";
            const isDefault =
              !isLibraryItem && programmeCode === savedDefaultCode;
            const actionOpen =
              actionProgrammeCode === programmeCode && !isDefault;
            const pending =
              pendingDefaultCode === programmeCode ||
              (pendingDefaultCode !== null && isDefault);

            return (
              <div
                key={programmeCode}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "relative flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left transition-colors",
                  selected
                    ? "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100"
                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800/70 dark:hover:text-stone-100",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectProgramme(programmeCode);
                    setOpen(false);
                    setActionProgrammeCode(null);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="w-4 shrink-0 text-stone-500 dark:text-stone-400">
                    {selected && <CheckIcon size={13} />}
                  </span>
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="font-mono text-[13px] font-semibold tracking-normal">
                        {programmeCode}
                      </span>
                      {isDefault && (
                        <span className="shrink-0 text-[10.5px] font-medium text-stone-400 dark:text-stone-500">
                          Default
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-[12px] text-stone-500 dark:text-stone-400">
                      {item.kind === "other"
                        ? OTHER_LIBRARY_NAME
                        : item.kind === "all"
                          ? ALL_LIBRARY_NAME
                          : formatProgrammeName(item.programme.programmeName)}
                    </span>
                  </span>
                </button>
                {!isDefault && !isLibraryItem && (
                  <button
                    type="button"
                    aria-label={`Programme actions for ${programmeCode}`}
                    aria-expanded={actionOpen}
                    disabled={pending}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActionProgrammeCode((current) =>
                        current === programmeCode ? null : programmeCode,
                      );
                    }}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-stone-200/70 hover:text-stone-800 disabled:cursor-progress disabled:opacity-50 dark:text-stone-500 dark:hover:bg-stone-700 dark:hover:text-stone-100"
                  >
                    <MoreVerticalIcon size={14} />
                  </button>
                )}
                {actionOpen && (
                  <div className="absolute right-1 top-9 z-10 w-36 rounded-md border border-stone-200 bg-white p-1 shadow-lg dark:border-stone-800 dark:bg-stone-950">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={async (event) => {
                        event.stopPropagation();
                        if (!auth.isAuthenticated) {
                          auth.promptSignIn({
                            reason:
                              "Sign in to save your default programme across sessions.",
                          });
                          return;
                        }

                        setPendingDefaultCode(programmeCode);
                        setActionProgrammeCode(null);
                        onSelectProgramme(programmeCode);
                        try {
                          await setDefaultProgramme({
                            programmeCode,
                          });
                        } finally {
                          setPendingDefaultCode(null);
                        }
                      }}
                      className="flex w-full items-center rounded px-2 py-1.5 text-left text-[12.5px] text-stone-700 hover:bg-stone-100 disabled:cursor-progress disabled:opacity-60 dark:text-stone-200 dark:hover:bg-stone-800"
                    >
                      Set as default
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

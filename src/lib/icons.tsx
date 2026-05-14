import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function svg({ size = 16, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

export function BookmarkIcon(props: IconProps) {
  return (
    <svg {...svg(props)} aria-hidden="true">
      <path d="M6 4.5c0-.55.45-1 1-1h10c.55 0 1 .45 1 1V21l-6-3.5L6 21V4.5Z" />
    </svg>
  );
}

export function BookmarkFilledIcon(props: IconProps) {
  return (
    <svg {...svg(props)} fill="currentColor" stroke="none" aria-hidden="true">
      <path d="M6 4.5c0-.55.45-1 1-1h10c.55 0 1 .45 1 1V21l-6-3.5L6 21V4.5Z" />
    </svg>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <svg {...svg(props)} aria-hidden="true">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...svg(props)} aria-hidden="true">
      <path d="M4 12.5 9 17.5l11-11" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...svg(props)} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ArchiveBoxIcon(props: IconProps) {
  return (
    <svg {...svg(props)} aria-hidden="true">
      <path d="M4 7.5h16M6 7.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7.5" />
      <path d="M5 4h14a1 1 0 0 1 1 1v2.5H4V5a1 1 0 0 1 1-1Z" />
      <path d="M9.5 11h5" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...svg(props)} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...svg(props)} aria-hidden="true">
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}

export function ExternalIcon(props: IconProps) {
  return (
    <svg {...svg(props)} aria-hidden="true">
      <path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...svg(props)} aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...svg(props)} aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function MoreVerticalIcon(props: IconProps) {
  return (
    <svg {...svg(props)} aria-hidden="true">
      <circle cx="12" cy="5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...svg(props)} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function BooksIcon(props: IconProps) {
  return (
    <svg {...svg(props)} aria-hidden="true">
      <path d="M4 5a1 1 0 0 1 1-1h5v17H5a1 1 0 0 1-1-1V5ZM10 4h5a1 1 0 0 1 1 1v16h-6V4ZM16 8l4 .8L18 21l-3.8-.8" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...svg(props)} aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...svg(props)} aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" />
      <circle cx="17" cy="6.5" r="2.5" />
      <path d="M16 13c3.5.2 6 2.6 6 6" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...svg(props)} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg {...svg(props)} aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a1 1 0 0 1 1-1h10" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...svg(props)} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg {...svg(props)} aria-hidden="true">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </svg>
  );
}

export function MonitorIcon(props: IconProps) {
  return (
    <svg {...svg(props)} aria-hidden="true">
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

export function ChatBubbleIcon(props: IconProps) {
  return (
    <svg {...svg(props)} aria-hidden="true">
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H10l-4.5 3.5V16H5.5A1.5 1.5 0 0 1 4 14.5v-9Z" />
    </svg>
  );
}

export function GoogleMark(props: IconProps) {
  const { size = 16, ...rest } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      aria-hidden="true"
      {...rest}
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.46-.8 5.95-2.18l-2.92-2.26c-.8.54-1.83.86-3.03.86-2.33 0-4.3-1.57-5.01-3.69H.95v2.32A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.99 10.73c-.18-.54-.28-1.12-.28-1.73 0-.6.1-1.19.28-1.73V4.95H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.05l3.04-2.32Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.43 1.35l2.58-2.59C13.46.88 11.43 0 9 0A9 9 0 0 0 .95 4.95l3.04 2.32C4.7 5.15 6.67 3.58 9 3.58Z"
      />
    </svg>
  );
}

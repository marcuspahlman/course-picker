const requiredClientEnv = {
  VITE_CONVEX_URL: import.meta.env.VITE_CONVEX_URL,
  VITE_CONVEX_SITE_URL: import.meta.env.VITE_CONVEX_SITE_URL,
} as const;

export type ClientEnv = {
  [Key in keyof typeof requiredClientEnv]: string;
};

export function getClientEnv(): ClientEnv | null {
  const missing = getMissingClientEnv();

  if (missing.length > 0) {
    return null;
  }

  return requiredClientEnv as ClientEnv;
}

export function getMissingClientEnv() {
  return Object.entries(requiredClientEnv)
    .filter(([, value]) => typeof value !== "string" || value.length === 0)
    .map(([key]) => key);
}

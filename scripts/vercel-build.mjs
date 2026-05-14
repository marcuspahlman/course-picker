import { spawnSync } from "node:child_process";

const args = [
  "convex",
  "deploy",
  "--cmd",
  "npm run build:frontend",
  "--preview-run",
  "internal.previewSeed.seed",
];

if (process.env.VERCEL_ENV === "preview") {
  const previewName = process.env.VERCEL_GIT_COMMIT_REF;
  if (!previewName) {
    throw new Error("VERCEL_GIT_COMMIT_REF is required for preview builds.");
  }
  args.splice(2, 0, "--preview-create", previewName);
}

const result = spawnSync("npx", args, {
  stdio: "inherit",
});

process.exit(result.status ?? 1);

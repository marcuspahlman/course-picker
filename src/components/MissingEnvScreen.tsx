export function MissingEnvScreen({ missing }: { missing: string[] }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-10 text-stone-800 dark:bg-stone-950 dark:text-stone-100">
      <section className="w-full max-w-xl rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
          Deployment configuration required
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Convex is not configured for this build.
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-300">
          Add the missing public environment variables to Vercel, then redeploy
          the site so Vite can include them in the production bundle.
        </p>
        <ul className="mt-4 space-y-2 font-mono text-sm text-stone-900 dark:text-stone-100">
          {missing.map((name) => (
            <li
              key={name}
              className="rounded-md bg-stone-100 px-3 py-2 dark:bg-stone-800"
            >
              {name}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

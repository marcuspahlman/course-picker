# Course Picker

Choose KTH courses with your friends.

## Environment

Copy `.env.example` to `.env.local` for local development and fill in the
Convex deployment URLs.

For Vercel production builds, add these variables in the project settings for
the Production environment and redeploy:

- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`

The production Convex deployment values for Vercel are:

```sh
VITE_CONVEX_URL=https://dashing-hound-882.eu-west-1.convex.cloud
VITE_CONVEX_SITE_URL=https://dashing-hound-882.eu-west-1.convex.site
```

Vite embeds `VITE_*` variables at build time. If Vercel builds without these
values, the browser bundle cannot initialize `ConvexReactClient`.

## Preview Deployments

Convex preview deployments can be seeded from the checked-in production
snapshot with:

```sh
npm run convex:deploy -- --preview-create="my-preview-deployment-name"
```

For Vercel builds, set `CONVEX_DEPLOY_KEY` to a Convex deploy key and use
`npm run build:vercel` as the build command. Preview builds should use a Convex
preview deploy key, and production builds should use the production deploy key.
Preview builds recreate the branch preview deployment before building the
frontend, so the seed function runs and the generated `VITE_CONVEX_URL` and
`VITE_CONVEX_SITE_URL` point at the seeded preview deployment.

## Development

```sh
npm install
npm run dev
```

Run Convex in another terminal when working locally:

```sh
npx convex dev
```

## Build

```sh
npm run build
```

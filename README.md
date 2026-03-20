# RunTracker

RunTracker is a Next.js application for logging runs, reviewing training history, and tracking pace-based metrics. The UI uses the App Router, the backend uses API routes plus a Better Auth route handler, and persistence uses Netlify DB / Neon when a database URL is configured.

Live demo: [https://runtracker-by-jdr.netlify.app/](https://runtracker-by-jdr.netlify.app/)

## What Changed

The app no longer uses a shared admin token.

Authentication is now handled by Better Auth with Google OAuth, and run data is scoped to the signed-in user. In production, access is restricted by `ALLOWED_USER_EMAILS`, so a Google login is not enough by itself unless the email is on the allowlist.

## Tech Stack

- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Better Auth](https://better-auth.com/)
- [Netlify DB](https://docs.netlify.com/build/data-and-storage/netlify-db/)
- [Neon](https://neon.com/)
- [pg](https://www.npmjs.com/package/pg)
- [uuid](https://www.npmjs.com/package/uuid)
- [ESLint](https://eslint.org/)

## Architecture Overview

The project is split into four layers:

1. client UI
2. auth
3. API routes
4. persistence

### Client UI

The main dashboard is rendered by `src/app/RunTrackerApp.js`.

- It uses Better Auth's React client to read the current session.
- It starts Google sign-in from the browser.
- It loads runs from `GET /api/runs` after a valid session exists.
- It posts new runs to `POST /api/runs`.
- It deletes runs through `DELETE /api/runs`.
- It computes display-only stats from the current in-memory run list.

Important client files:

- `src/app/RunTrackerApp.js`
- `src/app/AuthPanel.js`
- `src/app/LogRunForm.js`
- `src/app/RunList.js`
- `src/app/ClientLayout.js`
- `src/lib/auth-client.js`
- `src/lib/runs.js`

### Auth Layer

Better Auth is configured in `src/lib/auth.js`.

- The auth route handler lives at `src/app/api/auth/[...all]/route.js`.
- Google OAuth is enabled when `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `BETTER_AUTH_SECRET` are present.
- The backend uses `auth.api.getSession()` to resolve the signed-in user inside `src/pages/api/runs.js` and `src/pages/api/health.js`.
- Production access is restricted by `ALLOWED_USER_EMAILS`.

If no database URL is present, Better Auth falls back to an in-memory adapter so local builds and basic local development still work. Production should always use a real database.

### API Layer

The app has two custom API routes in `src/pages/api`:

- `src/pages/api/runs.js`
- `src/pages/api/health.js`

And one Better Auth route tree:

- `src/app/api/auth/[...all]/route.js`

`/api/runs` validates input, applies rate limiting, requires an authenticated and authorized user, and stores/fetches only that user's runs.

`/api/health` is also authenticated and returns a minimal database health response.

### Persistence Layer

The run storage abstraction is in `src/lib/runStore.js`.

- If `NETLIFY_DATABASE_URL` or `DATABASE_URL` is present, run data uses Postgres.
- If not, run data falls back to `data/runs.json`.
- Stored runs now include an internal `userId` owner field.
- Existing legacy rows with `user_id IS NULL` are still readable by authenticated allowed users until you migrate them to a specific user.

## Authentication Flow

1. The user opens the app.
2. `RunTrackerApp` reads the Better Auth session with `authClient.useSession()`.
3. If no session exists, the app shows a Google sign-in button.
4. The button calls Better Auth social sign-in for `google`.
5. After the OAuth callback, Better Auth creates the session and stores the auth data in the database.
6. The app then loads runs through `/api/runs`.
7. The backend checks both authentication and the `ALLOWED_USER_EMAILS` allowlist before returning data.

## Run Data Ownership

Run records are now user-scoped.

- New runs are written with the current session user's ID.
- Reads only return runs owned by the current user, plus legacy rows without an owner.
- Deletes only remove runs owned by the current user, plus legacy rows without an owner.

That change is what turns auth into actual authorization for the data set.

## API Reference

### `GET /api/runs`

Returns the current authenticated user's runs in reverse chronological order.

### `POST /api/runs`

Accepts:

```json
{
  "date": "2026-03-20",
  "distance": 8.5,
  "durationMinutes": 46,
  "notes": "Optional note"
}
```

Returns the saved run with generated `id` and `createdAt`.

### `DELETE /api/runs`

Accepts:

```json
{
  "id": "abc123"
}
```

Returns:

```json
{
  "id": "abc123"
}
```

### `GET /api/health`

Returns a minimal authenticated health payload, including storage mode and database health when a DB connection is configured.

### `/api/auth/*`

This route tree is handled by Better Auth.

Important behavior:

- session lookup
- OAuth sign-in start
- OAuth callback handling
- sign-out

You do not need to create manual handlers for those endpoints.

## Environment Variables

### Required for production auth

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ALLOWED_USER_EMAILS`

### Required for production persistence

- `NETLIFY_DATABASE_URL`

### Example local `.env.local`

```bash
BETTER_AUTH_SECRET="replace-this-with-a-long-random-secret"
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
ALLOWED_USER_EMAILS="you@example.com"
NETLIFY_DATABASE_URL="postgresql://..."
```

Notes:

- In production, `ALLOWED_USER_EMAILS` should be set. The app intentionally treats a missing allowlist as a misconfiguration outside development.
- `BETTER_AUTH_URL` should match the deployed site origin, for example `https://runtracker-by-jdr.netlify.app`.
- `RUNTRACKER_ADMIN_TOKEN` is no longer used.

## Database Schema And Migrations

The repo now has two migration files:

- `db/migrations/001_create_runs.sql`
- `db/migrations/002_add_auth_and_run_ownership.sql`

`002_add_auth_and_run_ownership.sql` adds:

- Better Auth tables: `user`, `session`, `account`, `verification`
- run ownership: `runs.user_id`
- supporting indexes for auth and run queries

Apply migrations with:

```bash
npm run db:migrate
```

## Importing Existing Runs

Import the local JSON seed file into Postgres with:

```bash
npm run db:import
```

Imported runs are inserted with `user_id = NULL`, which preserves old data but does not automatically assign ownership to a specific account. If you want those runs permanently tied to your user, update them in the database after your first login.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Set the environment variables in `.env.local`.

3. Apply migrations if you are using a database:

```bash
npm run db:migrate
```

4. Start the app:

```bash
npm run dev
```

## Deployment On Netlify

1. Connect the repo to Netlify.
2. Set `NETLIFY_DATABASE_URL`.
3. Set `BETTER_AUTH_SECRET`.
4. Set `BETTER_AUTH_URL`.
5. Set `GOOGLE_CLIENT_ID`.
6. Set `GOOGLE_CLIENT_SECRET`.
7. Set `ALLOWED_USER_EMAILS`.
8. Deploy.
9. Run `npm run db:migrate` against the database if the schema has not been applied yet.

## Troubleshooting

### Google sign-in works but `/api/runs` returns `403`

Cause:

- the Google account email is not listed in `ALLOWED_USER_EMAILS`

Fix:

- add the email to `ALLOWED_USER_EMAILS`
- redeploy

### Auth routes fail in production

Cause:

- one or more auth env vars are missing

Fix:

- verify `BETTER_AUTH_SECRET`
- verify `BETTER_AUTH_URL`
- verify `GOOGLE_CLIENT_ID`
- verify `GOOGLE_CLIENT_SECRET`

### Existing runs do not show up after auth migration

Cause:

- they may exist as legacy rows with `user_id = NULL`
- or they may not have been imported into the current database

Fix:

- run `npm run db:import` if needed
- inspect the `runs` table and assign `user_id` values if you want strict ownership

### `EROFS: read-only file system, open '/var/task/data/runs.json'`

Cause:

- the deployment is trying to write without a configured database

Fix:

- set `NETLIFY_DATABASE_URL`
- redeploy

## Verification

Current verification commands:

```bash
npm run lint
npm run build
npm audit --json
```

## Future Improvements

- automatically migrate legacy `runs.user_id IS NULL` rows to a chosen account
- add edit and update support for runs
- add per-user admin tooling
- add a dedicated SQL script for assigning old runs to a specific Better Auth user

Tracks which SQL migration files have already been applied.

## Database Scripts

### `npm run db:migrate`

Runs `scripts/apply-migrations.mjs`.

What it does:

1. checks that `NETLIFY_DATABASE_URL` exists
2. reads SQL files from `db/migrations`
3. creates `schema_migrations` if needed
4. skips files already recorded in `schema_migrations`
5. applies each pending SQL file
6. records the migration filename after success

Use it like:

```bash
NETLIFY_DATABASE_URL="postgres://..." npm run db:migrate
```

### `npm run db:import`

Runs `scripts/import-runs.mjs`.

What it does:

1. checks that `NETLIFY_DATABASE_URL` exists
2. reads `data/runs.json` by default
3. inserts runs into the `runs` table
4. skips duplicates using `ON CONFLICT (id) DO NOTHING`

Use it like:

```bash
NETLIFY_DATABASE_URL="postgres://..." npm run db:import
```

Custom import file:

```bash
NETLIFY_DATABASE_URL="postgres://..." npm run db:import -- ./path/to/runs.json
```

## Project Structure

```text
.
├── data/
│   └── runs.json
├── db/
│   └── migrations/
│       └── 001_create_runs.sql
├── scripts/
│   ├── apply-migrations.mjs
│   └── import-runs.mjs
├── src/
│   ├── app/
│   │   ├── AuthPanel.js
│   │   ├── ClientLayout.js
│   │   ├── LogRunForm.js
│   │   ├── RunList.js
│   │   ├── RunTrackerApp.js
│   │   ├── globals.css
│   │   ├── layout.js
│   │   └── page.js
│   ├── lib/
│   │   ├── auth.js
│   │   ├── rateLimit.js
│   │   ├── runStore.js
│   │   └── runs.js
│   └── pages/
│       └── api/
│           ├── health.js
│           ├── runs.js
│           └── session.js
├── next.config.mjs
├── package.json
└── README.md
```

## Environment Variables

### Required In Production

- `NETLIFY_DATABASE_URL`
- `RUNTRACKER_ADMIN_TOKEN`

`NETLIFY_DATABASE_URL` is the main connection string used by `@netlify/neon`.

`RUNTRACKER_ADMIN_TOKEN` is the shared secret used to sign in to the dashboard and authorize protected API access.

### Present In Netlify DB Setups

- `NETLIFY_DATABASE_URL`
- `NETLIFY_DATABASE_URL_UNPOOLED`

This app currently uses `NETLIFY_DATABASE_URL`.

## Setup And Run Locally

### Option 1: Local JSON File Only

This is the simplest local setup.

```bash
git clone <your-repo-url>
cd runtracker
npm install
export RUNTRACKER_ADMIN_TOKEN="choose-a-strong-token"
npm run dev
```

Then open:

- [http://localhost:3000](http://localhost:3000)

In this mode, data is stored in `data/runs.json`.

### Option 2: Local App Against Netlify DB

If you want to test the database-backed path locally:

```bash
export NETLIFY_DATABASE_URL="postgres://..."
export RUNTRACKER_ADMIN_TOKEN="choose-a-strong-token"
npm run db:migrate
npm run dev
```

If you also want to import the current local seed data:

```bash
export NETLIFY_DATABASE_URL="postgres://..."
npm run db:import
```

## Deploying On Netlify

1. Connect the repo to Netlify
2. Ensure the site has `NETLIFY_DATABASE_URL`
3. Ensure the site has `RUNTRACKER_ADMIN_TOKEN`
4. Deploy the site
5. Optionally run migrations explicitly with `npm run db:migrate`
6. Check the health endpoint after deploy

Recommended post-deploy checks:

- sign in successfully
- open `/api/health`
- create a run
- refresh the page and confirm the run persists
- delete a run and confirm the deletion persists

## Useful Commands

```bash
npm run dev
npm run build
npm run lint
npm run start
npm run db:migrate
npm run db:import
```

## Notes And Operational Behavior

- The frontend uses the App Router, but the backend endpoints are still implemented with API routes under `src/pages/api`
- The app sorts runs by `date` descending, then `createdAt` descending
- `next.config.mjs` sets `outputFileTracingRoot` to the repo root to avoid incorrect workspace-root detection
- In a deployed Netlify runtime, writes should go to the database, not the bundled filesystem
- If `NETLIFY_DATABASE_URL` is missing in a Netlify runtime, create and delete operations will fail by design
- Protected routes return generic errors to clients and log detailed failures server-side
- State-changing routes enforce same-origin checks when an `Origin` header is present
- Rate limiting is in-memory and best-effort, which helps but is not a distributed anti-abuse system

## Future Improvements

- add structured SQL migration versioning beyond a single base migration
- add edit/update support for runs
- add pagination or filtering for larger histories
- add authentication and per-user run ownership
- move timestamps to real Postgres timestamp columns if stricter querying is needed

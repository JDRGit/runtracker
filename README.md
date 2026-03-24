# RunTracker

RunTracker is a Next.js app for logging runs, tracking pace, and reviewing training history. It is deployed on Netlify, stores run data in Neon Postgres through Netlify DB, and uses Neon Auth for user authentication.

Live demo: [https://runtracker-by-jdr.netlify.app/](https://runtracker-by-jdr.netlify.app/)

## Stack

- Next.js App Router
- React
- Tailwind CSS
- Netlify hosting
- Netlify DB / Neon Postgres for run storage
- Neon Auth for sign-in and session handling
- ESLint

## How the app is organized

The codebase has four main layers:

1. UI
2. auth
3. API
4. persistence

### UI

The dashboard is rendered by [src/app/RunTrackerApp.js](/Users/jwho/Documents/next/runtracker/src/app/RunTrackerApp.js). It:

- reads the current auth session with the Neon Auth client
- loads runs from `/api/runs` after a valid session exists
- posts new runs to `/api/runs`
- deletes runs through `/api/runs`
- computes dashboard stats in memory from the fetched runs

Related UI files:

- [src/app/RunTrackerApp.js](/Users/jwho/Documents/next/runtracker/src/app/RunTrackerApp.js)
- [src/app/AuthPanel.js](/Users/jwho/Documents/next/runtracker/src/app/AuthPanel.js)
- [src/app/ClientLayout.js](/Users/jwho/Documents/next/runtracker/src/app/ClientLayout.js)
- [src/app/LogRunForm.js](/Users/jwho/Documents/next/runtracker/src/app/LogRunForm.js)
- [src/app/RunList.js](/Users/jwho/Documents/next/runtracker/src/app/RunList.js)
- [src/lib/runs.js](/Users/jwho/Documents/next/runtracker/src/lib/runs.js)

### Auth

Neon Auth is configured in [src/lib/auth.js](/Users/jwho/Documents/next/runtracker/src/lib/auth.js).

The project uses three auth-specific entry points:

- [src/lib/auth.js](/Users/jwho/Documents/next/runtracker/src/lib/auth.js)
  Creates the Neon Auth server instance, enforces optional email allowlisting, and provides same-origin validation for state-changing requests.
- [src/lib/auth-client.js](/Users/jwho/Documents/next/runtracker/src/lib/auth-client.js)
  Creates the browser auth client used by `useSession()` and `signOut()`.
- [src/app/api/auth/[...path]/route.js](/Users/jwho/Documents/next/runtracker/src/app/api/auth/[...path]/route.js)
  Proxies `/api/auth/*` requests to your Neon Auth endpoint through the official Next.js handler.

The sign-in UI route is [src/app/auth/[path]/page.js](/Users/jwho/Documents/next/runtracker/src/app/auth/[path]/page.js). It renders Neon Auth’s hosted UI components under `/auth/sign-in`, `/auth/sign-up`, and related auth paths.

The global UI provider is mounted in [src/app/layout.js](/Users/jwho/Documents/next/runtracker/src/app/layout.js) through [src/app/NeonAuthProvider.js](/Users/jwho/Documents/next/runtracker/src/app/NeonAuthProvider.js).

### API

The app uses App Router route handlers, not `pages/api`.

- [src/app/api/runs/route.js](/Users/jwho/Documents/next/runtracker/src/app/api/runs/route.js)
- [src/app/api/health/route.js](/Users/jwho/Documents/next/runtracker/src/app/api/health/route.js)
- [src/app/api/auth/[...path]/route.js](/Users/jwho/Documents/next/runtracker/src/app/api/auth/[...path]/route.js)

`/api/runs`:

- requires an authenticated Neon Auth session
- optionally enforces `ALLOWED_USER_EMAILS`
- rate limits reads and writes
- checks same-origin on `POST` and `DELETE`
- validates run input before writing

`/api/health`:

- requires an authenticated session
- rate limits requests
- verifies database connectivity when `NETLIFY_DATABASE_URL` is present

### Persistence

Run storage is implemented in [src/lib/runStore.js](/Users/jwho/Documents/next/runtracker/src/lib/runStore.js).

Behavior:

- if `NETLIFY_DATABASE_URL` is present, runs are stored in Postgres
- if no database URL is present, local development can still fall back to [data/runs.json](/Users/jwho/Documents/next/runtracker/data/runs.json)
- each stored run includes an internal `userId` owner field
- older rows with `user_id IS NULL` are still readable and deletable by the signed-in user until you explicitly reassign them

## Request flow

### Initial page load

1. The browser loads `/`.
2. [src/app/RunTrackerApp.js](/Users/jwho/Documents/next/runtracker/src/app/RunTrackerApp.js) calls `authClient.useSession()`.
3. If there is no session, the app shows [src/app/AuthPanel.js](/Users/jwho/Documents/next/runtracker/src/app/AuthPanel.js) with a link into `/auth/sign-in`.
4. If a session exists, the app fetches `/api/runs`.
5. [src/app/api/runs/route.js](/Users/jwho/Documents/next/runtracker/src/app/api/runs/route.js) checks auth, applies rate limiting, and returns only that user’s visible runs.

### Sign-in flow

1. The user opens `/auth/sign-in`.
2. [src/app/auth/[path]/page.js](/Users/jwho/Documents/next/runtracker/src/app/auth/[path]/page.js) renders Neon Auth UI components.
3. The UI talks to `/api/auth/*`.
4. [src/app/api/auth/[...path]/route.js](/Users/jwho/Documents/next/runtracker/src/app/api/auth/[...path]/route.js) proxies the request to your Neon Auth base URL.
5. Neon Auth completes the provider flow and sets session cookies.
6. The client session hook starts returning the signed-in user.

### Creating a run

1. [src/app/LogRunForm.js](/Users/jwho/Documents/next/runtracker/src/app/LogRunForm.js) submits JSON to `POST /api/runs`.
2. The API validates origin, session, allowlist, and body shape.
3. [src/lib/runStore.js](/Users/jwho/Documents/next/runtracker/src/lib/runStore.js) writes the row with the current `userId`.
4. The saved run is returned to the client and merged into the local run list.

### Deleting a run

1. [src/app/RunList.js](/Users/jwho/Documents/next/runtracker/src/app/RunList.js) submits `DELETE /api/runs` with the run ID.
2. The API validates origin and auth.
3. The store deletes only rows visible to that user.

## Data model

The public run shape used in the UI is:

```json
{
  "id": "uuid",
  "date": "2026-03-20",
  "distance": 8.5,
  "durationMinutes": 46,
  "notes": "Optional note",
  "createdAt": "2026-03-20T14:30:00.000Z"
}
```

In Postgres, the `runs` table stores:

- `id`
- `user_id`
- `run_date`
- `distance_km`
- `duration_minutes`
- `notes`
- `created_at`

The `user_id` column is the app-level ownership link between Neon Auth users and run rows.

## API reference

### `GET /api/runs`

Returns the authenticated user’s runs in reverse chronological order.

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

Returns a minimal authenticated health payload including:

- current account email
- storage mode
- current timestamp
- database health when a DB connection is configured

## Environment variables

### Required for Neon Auth

- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_COOKIE_SECRET`

### Required for deployed persistence

- `NETLIFY_DATABASE_URL`

### Optional

- `ALLOWED_USER_EMAILS`

`ALLOWED_USER_EMAILS` is a comma-separated allowlist. If it is set, only those email addresses can use the app even if Neon Auth itself allows them to sign in.

### Example `.env.local`

```bash
NEON_AUTH_BASE_URL="https://your-neon-auth-endpoint.neonauth.us-east-1.aws.neon.tech"
NEON_AUTH_COOKIE_SECRET="replace-this-with-a-random-secret-at-least-32-characters-long"
NETLIFY_DATABASE_URL="postgresql://..."
ALLOWED_USER_EMAILS="you@example.com"
```

Notes:

- `NEON_AUTH_BASE_URL` should be the Neon Auth endpoint, not your site URL
- `NEON_AUTH_COOKIE_SECRET` must be at least 32 characters
- if `ALLOWED_USER_EMAILS` is omitted, any user allowed by Neon Auth can access the app
- old auth envs like `BETTER_AUTH_*`, `GOOGLE_CLIENT_*`, `RUNTRACKER_ADMIN_TOKEN`, and Supabase env vars are no longer used

## Database setup

The repo ships with these migration files:

- [db/migrations/001_create_runs.sql](/Users/jwho/Documents/next/runtracker/db/migrations/001_create_runs.sql)
- [db/migrations/002_add_auth_and_run_ownership.sql](/Users/jwho/Documents/next/runtracker/db/migrations/002_add_auth_and_run_ownership.sql)

These migrations only manage the app-owned schema for runs and migration tracking.

Neon Auth manages its own auth schema inside Neon. This repo does not create or migrate Neon Auth tables directly.

Apply migrations with:

```bash
npm run db:migrate
```

## Importing existing runs

Import the local JSON seed file into Postgres with:

```bash
npm run db:import
```

Imported runs are inserted with `user_id = NULL`. That keeps old data accessible, but it does not automatically assign those runs to a specific user account.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Set the Neon Auth and database environment variables in `.env.local`.

3. Apply migrations if you are using the database:

```bash
npm run db:migrate
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000).

## Netlify deployment

1. Connect the repo to Netlify.
2. Set `NETLIFY_DATABASE_URL`.
3. Set `NEON_AUTH_BASE_URL`.
4. Set `NEON_AUTH_COOKIE_SECRET`.
5. Optionally set `ALLOWED_USER_EMAILS`.
6. Deploy.
7. If the database schema is not present yet, run `npm run db:migrate` against the same database.

## Security model

The current backend protections are:

- authenticated access for `/api/runs` and `/api/health`
- optional email allowlisting
- same-origin checks on state-changing run requests
- in-memory rate limiting
- generic client-facing error responses
- security headers from [next.config.mjs](/Users/jwho/Documents/next/runtracker/next.config.mjs)

Current limits:

- rate limiting is still per-process memory, not globally shared across serverless instances
- run ownership is app-enforced by `user_id`, not database RLS
- if you want multi-user roles or direct database access from the client, that is a larger architecture change

## Troubleshooting

### `/api/auth/get-session` returns `500`

Check:

- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_COOKIE_SECRET`
- that the cookie secret is at least 32 characters
- that Netlify has the same env vars as local

### `EROFS: read-only file system, open '/var/task/data/runs.json'`

That means the deployed runtime is trying to write to the local filesystem. The deployed app should use `NETLIFY_DATABASE_URL` so writes go to Postgres instead.

### Sign-in UI loads but access is denied

If the auth flow succeeds but the app still returns `403`, check `ALLOWED_USER_EMAILS`.

### Old auth tables still exist in the database

If you previously ran the older self-hosted auth setup, leftover tables may still exist. The current app does not use them. Remove them only after confirming nothing else depends on them.

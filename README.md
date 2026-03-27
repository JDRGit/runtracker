# RunTracker

RunTracker is a Next.js App Router application for logging runs, tracking pace, and reviewing training history behind authenticated access. The app is hosted on Netlify, stores run data in Neon Postgres through Netlify DB, and uses Neon Auth for account creation, sign-in, session management, and optional OAuth providers.

Live demo: [https://runtracker-by-jdr.netlify.app/](https://runtracker-by-jdr.netlify.app/)

## Contents

- Overview
- Core capabilities
- Technology stack
- Repository layout
- Application architecture
- Page routes
- API routes
- Request lifecycle
- Run data model
- Validation and formatting rules
- Authentication model
- Persistence model
- Database schema and migrations
- Scripts
- Environment variables
- Local development
- Netlify deployment
- Neon configuration
- Security model
- Operational notes

## Overview

The app is designed around a simple private workflow:

1. A user signs in through Neon Auth.
2. The client loads that user session with the Neon Auth browser client.
3. The dashboard fetches the user-visible run list from a protected API route.
4. New runs are submitted to the same protected API and persisted to Postgres.
5. The client computes summary cards, pace statistics, and run-history presentation from the returned run list.

The repository intentionally keeps the architecture small:

- UI is built in the Next.js `app` directory.
- Auth is handled with the Neon Auth Next.js SDK.
- Data storage is isolated in one store module.
- Validation and formatting logic are centralized in one utility module.
- Database schema changes are tracked in SQL migration files.

## Core Capabilities

- Authenticated sign-in and sign-up with Neon Auth
- Optional Google OAuth through Neon Auth
- Optional access restriction by allowlisted email addresses
- Run creation, listing, and deletion
- Dashboard summary metrics for total distance, total time, best pace, longest run, and most recent run
- Local development fallback to `data/runs.json` when a database URL is not configured
- Netlify deployment with Neon-backed persistence
- Basic API hardening through auth checks, origin checks, rate limiting, and generic error responses

## Technology Stack

- Next.js `16.2.1`
- React `19.2.0`
- App Router route handlers
- Tailwind CSS
- `@neondatabase/auth` for Neon Auth server and UI integration
- `@netlify/neon` for Neon Postgres access inside the app and scripts
- PostgreSQL / Netlify DB / Neon
- ESLint

## Repository Layout

The main code lives in `src`, with SQL migrations in `db/migrations` and supporting scripts in `scripts`.

```text
.
|-- data/
|   `-- runs.json
|-- db/
|   `-- migrations/
|       |-- 001_create_runs.sql
|       `-- 002_add_auth_and_run_ownership.sql
|-- scripts/
|   |-- apply-migrations.mjs
|   `-- import-runs.mjs
|-- src/
|   |-- app/
|   |   |-- api/
|   |   |   |-- auth/[...path]/route.js
|   |   |   |-- health/route.js
|   |   |   `-- runs/route.js
|   |   |-- auth/
|   |   |   |-- [path]/page.js
|   |   |   `-- page.js
|   |   |-- AuthConfigurationNotice.js
|   |   |-- AuthPanel.js
|   |   |-- ClientLayout.js
|   |   |-- LogRunForm.js
|   |   |-- NeonAuthProvider.js
|   |   |-- RunList.js
|   |   |-- RunTrackerApp.js
|   |   |-- globals.css
|   |   |-- layout.js
|   |   `-- page.js
|   `-- lib/
|       |-- auth-client.js
|       |-- auth.js
|       |-- rateLimit.js
|       |-- requestLogger.js
|       |-- runStore.js
|       `-- runs.js
|-- next.config.mjs
`-- package.json
```

## Application Architecture

The app is split into five practical layers:

1. layout and bootstrapping
2. auth
3. dashboard UI
4. API handlers
5. persistence and utilities

### Layout And Bootstrapping

`src/app/layout.js` is the root layout. It:

- imports Neon Auth UI styles
- imports the app global stylesheet
- wraps the entire application in `NeonAuthProvider`
- defines the site metadata used by Next.js

`src/app/page.js` is the dashboard entry page. It:

- checks whether Neon Auth is configured
- renders `AuthConfigurationNotice` when auth env vars are missing
- renders `RunTrackerApp` when auth is configured

`src/app/AuthConfigurationNotice.js` exists so a missing Netlify or local setup produces a clear on-page configuration message instead of immediately booting a broken session flow.

### Auth

Auth is centered in `src/lib/auth.js`. That module:

- creates the Neon Auth server instance with `createNeonAuth`
- reads `NEON_AUTH_BASE_URL`
- reads `NEON_AUTH_COOKIE_SECRET`
- exposes `isNeonAuthConfigured()`
- implements `requireAuth(request)` for protected APIs
- optionally restricts access to `ALLOWED_USER_EMAILS`
- enforces same-origin checks for state-changing requests

`src/lib/auth-client.js` creates the browser auth client used by client components.

`src/app/NeonAuthProvider.js` wraps the app in `NeonAuthUIProvider`, which allows Neon Auth UI components and hooks to work across the app.

`src/app/api/auth/[...path]/route.js` forwards `/api/auth/*` requests into the Neon Auth handler. This is the bridge between your Next.js app and the Neon Auth service.

`src/app/auth/[path]/page.js` renders Neon Auth UI views like:

- `/auth/sign-in`
- `/auth/sign-up`
- `/auth/forgot-password`

`src/app/auth/page.js` simply redirects `/auth` to `/auth/sign-in`.

### Dashboard UI

`src/app/RunTrackerApp.js` is the main client-side application. It is responsible for:

- loading the current session through `authClient.useSession()`
- redirecting users to the sign-in screen when no session exists
- fetching runs from `/api/runs`
- handling run creation and deletion
- tracking UI loading, auth, authorization, and list error states
- computing dashboard stat cards from fetched runs

The main presentational pieces are:

- `src/app/AuthPanel.js`
  Used when the user is signed out or signed in but blocked by allowlist rules.
- `src/app/ClientLayout.js`
  Provides the shared shell styling for the dashboard and auth states.
- `src/app/LogRunForm.js`
  Collects run date, distance, duration, and notes, and submits them to the API.
- `src/app/RunList.js`
  Displays the run history and delete controls.

### API Handlers

The app uses App Router route handlers instead of `pages/api`.

`src/app/api/runs/route.js` handles:

- `GET /api/runs`
- `POST /api/runs`
- `DELETE /api/runs`

It performs:

- per-route rate limiting
- auth verification through `requireAuth()`
- same-origin enforcement for write and delete operations
- request-body parsing
- run input validation
- generic error handling with server-side logging

`src/app/api/health/route.js` handles:

- `GET /api/health`

It performs:

- rate limiting
- auth verification
- a minimal database health check when `NETLIFY_DATABASE_URL` is present

### Persistence And Shared Utilities

`src/lib/runStore.js` is the persistence layer. It hides whether data is coming from:

- Postgres through `@netlify/neon`
- or the local JSON file fallback in `data/runs.json`

`src/lib/runs.js` centralizes:

- run validation
- run normalization
- run sorting
- pace calculations
- dashboard statistics
- date, distance, duration, and pace formatting helpers

`src/lib/rateLimit.js` implements a small in-memory IP-based rate limiter for API routes.

`src/lib/requestLogger.js` emits structured security and API error logs to the server console.

## Page Routes

### `/`

The home page is the main dashboard entry point.

Behavior:

- if auth env vars are missing, it renders the configuration notice
- if auth env vars are present, it mounts the dashboard app

### `/auth`

Redirects to `/auth/sign-in`.

### `/auth/sign-in`

Renders Neon Auth’s sign-in UI.

### `/auth/sign-up`

Renders Neon Auth’s sign-up UI.

### Other `/auth/*` paths

Handled by the same `src/app/auth/[path]/page.js` dynamic route and rendered through Neon Auth’s `AuthView`.

## API Routes

### `GET /api/runs`

Purpose:

- returns runs visible to the authenticated user

Requirements:

- valid session
- within the read rate limit

Behavior:

- returns runs sorted newest first
- includes legacy rows with `user_id IS NULL`
- returns `401` if no session
- returns `403` if the signed-in email is not on the allowlist
- returns `429` when rate limited

Rate limit:

- 60 requests per minute per IP

### `POST /api/runs`

Purpose:

- creates a new run

Requirements:

- valid session
- same-origin request
- valid JSON body
- within the write rate limit

Accepted body:

```json
{
  "date": "2026-03-20",
  "distance": 8.5,
  "durationMinutes": 46,
  "notes": "Optional note"
}
```

Behavior:

- validates input with `validateRunInput()`
- generates a UUID
- stamps `createdAt` on the server
- writes the row with the authenticated user ID as owner
- returns `201` with the saved run payload

Rate limit:

- 20 requests per minute per IP

### `DELETE /api/runs`

Purpose:

- deletes a run by ID

Requirements:

- valid session
- same-origin request
- valid JSON body containing an `id`
- within the delete rate limit

Accepted body:

```json
{
  "id": "abc123"
}
```

Behavior:

- deletes only rows visible to the authenticated user
- returns `404` if the run is not found
- returns the deleted ID on success

Rate limit:

- 20 requests per minute per IP

### `GET /api/health`

Purpose:

- returns a small authenticated health payload

Requirements:

- valid session
- within the health-check rate limit

Response includes:

- signed-in account email
- `status`
- storage mode
- current timestamp
- database health when a DB URL is configured

Rate limit:

- 10 requests per minute per IP

### Method Handling

Unsupported methods return `405 Method Not Allowed` and set `Allow` headers where appropriate.

## Request Lifecycle

### Initial Page Load

1. The browser opens `/`.
2. `src/app/page.js` checks whether Neon Auth is configured.
3. If auth is not configured, the user sees `AuthConfigurationNotice`.
4. If auth is configured, `RunTrackerApp` mounts.
5. `RunTrackerApp` calls `authClient.useSession()`.
6. If there is no session, the user sees `AuthPanel` and can navigate to `/auth/sign-in`.
7. If a session exists, the client requests `GET /api/runs`.
8. The API validates auth and returns the visible run list.
9. The client computes stat cards from the returned runs.

### Sign-In Flow

1. The user opens `/auth/sign-in`.
2. `src/app/auth/[path]/page.js` renders Neon Auth’s `AuthView`.
3. The UI sends auth requests to `/api/auth/*`.
4. `src/app/api/auth/[...path]/route.js` forwards those requests to Neon Auth.
5. Neon Auth performs sign-in, sign-up, password reset, or provider flow logic.
6. On success, session cookies are written.
7. `authClient.useSession()` begins returning the authenticated user.

### Run Creation Flow

1. `LogRunForm` collects form input.
2. The client posts JSON to `/api/runs`.
3. The route handler checks rate limits.
4. The route handler validates same-origin.
5. The route handler validates the user session.
6. The route handler validates the input payload.
7. The route handler creates a UUID and timestamp.
8. `runStore.createRun()` writes the row.
9. The saved run is returned to the browser.
10. The client inserts the new run into local state and recomputes dashboard stats.

### Run Deletion Flow

1. `RunList` submits `DELETE /api/runs`.
2. The route handler checks rate limits.
3. The route handler validates same-origin.
4. The route handler validates the user session.
5. `runStore.deleteRunById()` deletes the row if the current user is allowed to see it.
6. The client removes the deleted run from local state.

## Run Data Model

The public run shape returned to the client is:

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

Internal ownership is added at the persistence layer through `userId` or `user_id`, but that owner field is stripped before responses are sent back to the client.

### Postgres Columns

The `runs` table uses:

- `id TEXT PRIMARY KEY`
- `user_id TEXT`
- `run_date TEXT NOT NULL`
- `distance_km DOUBLE PRECISION NOT NULL`
- `duration_minutes INTEGER NOT NULL`
- `notes TEXT`
- `created_at TEXT NOT NULL`

### Notes About The Model

- `run_date` is stored as text in ISO `YYYY-MM-DD` form
- `created_at` is stored as text, not as a Postgres timestamp column
- `user_id` is the application-level ownership link between Neon Auth sessions and run rows
- legacy rows with `user_id IS NULL` remain visible to signed-in users

## Validation And Formatting Rules

Validation rules live in `src/lib/runs.js`.

### Input Limits

- date must match `YYYY-MM-DD`
- distance must be between `0.1` and `200` km
- duration must be between `1` and `1440` minutes
- notes must be at most `160` characters

### Normalization Rules

- distance is rounded to one decimal place
- duration is rounded to the nearest whole minute
- empty notes are omitted from the normalized run value

### Derived Metrics

The app computes:

- total run count
- total distance
- total duration
- average pace
- best pace
- longest distance
- most recent run date

### Formatting Helpers

Formatting helpers produce:

- readable run dates like `Mar 20, 2026`
- readable durations like `46m` or `1h 12m`
- readable distances like `8.5 km`
- readable pace strings like `5:24 /km`

## Authentication Model

The app uses Neon Auth as the authentication backend and session authority.

### What The App Expects From Neon

- a valid Neon Auth base URL
- a cookie secret for the Next.js integration
- one or more enabled sign-in methods
- trusted domain entries that include the deployed site origin

### Allowed Sign-In Methods

The current app can work with:

- email sign-up and sign-in
- Google OAuth through Neon Auth

The UI does not implement custom auth screens beyond rendering Neon Auth’s provided views, so provider and email behavior are controlled mostly in the Neon console.

### Optional Access Restriction

If `ALLOWED_USER_EMAILS` is set, the app adds an application-level access gate after a successful Neon Auth sign-in.

That means:

- Neon Auth can successfully authenticate the user
- but the app can still return `403` if the signed-in email is not on the allowlist

This is useful when sign-up is enabled in Neon but app access should remain restricted.

## Persistence Model

Run persistence lives in `src/lib/runStore.js`.

### Database Mode

If `NETLIFY_DATABASE_URL` is present:

- the app uses `@netlify/neon`
- the app writes and reads runs from Postgres
- the store lazily ensures the `runs` table and supporting index exist
- the store can seed an empty database from `data/runs.json`

### Local File Mode

If `NETLIFY_DATABASE_URL` is missing:

- the store falls back to `data/runs.json`
- the fallback is mainly for local development or bootstrap scenarios
- deployed writes should not rely on this mode

### Ownership Behavior

Rows written by the current app receive the signed-in user’s ID as `user_id`.

Rows with `user_id IS NULL` remain readable and deletable by signed-in users. This preserves previously imported or pre-auth data, but it also means those legacy rows are not isolated by user until they are explicitly reassigned or rewritten.

### Runtime Schema Guard

Even though the repo includes SQL migrations, the store also performs `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, and index creation on demand. That gives the app a safer startup path when the database exists but schema state is behind.

## Database Schema And Migrations

### Migration Files

The repo currently ships with:

- `db/migrations/001_create_runs.sql`
- `db/migrations/002_add_auth_and_run_ownership.sql`

### What They Do

`001_create_runs.sql` creates:

- `runs`
- `schema_migrations`

`002_add_auth_and_run_ownership.sql` adds:

- `user_id` to `runs`
- the `runs_user_id_run_date_created_at_idx` index

### Migration Tracking

The migration runner stores applied filenames in the `schema_migrations` table.

That means:

- migration order is the lexicographic order of the `.sql` filenames
- each migration is applied once
- the applied file name becomes the migration ID

### Applying Migrations

Run:

```bash
npm run db:migrate
```

Requirements:

- `NETLIFY_DATABASE_URL` must be set

Behavior:

- loads all `.sql` files from `db/migrations`
- skips files already recorded in `schema_migrations`
- applies each unapplied migration inside a transaction

### Importing Seed Runs

Run:

```bash
npm run db:import
```

Or import a specific file:

```bash
npm run db:import -- ./path/to/runs.json
```

Behavior:

- requires `NETLIFY_DATABASE_URL`
- reads a JSON array of runs
- creates the `runs` table if needed
- inserts runs with `user_id = NULL`
- ignores duplicate IDs through `ON CONFLICT DO NOTHING`

## Scripts

Defined in `package.json`:

- `npm run dev`
  Starts the local Next.js development server.
- `npm run build`
  Builds the production app with `next build --webpack`.
- `npm run start`
  Starts the production server locally after a build.
- `npm run lint`
  Runs ESLint against the repository.
- `npm run db:migrate`
  Applies SQL migrations to the configured Netlify DB / Neon database.
- `npm run db:import`
  Imports runs from JSON into the configured database.

## Environment Variables

### Required

#### `NEON_AUTH_BASE_URL`

Used by the Neon Auth Next.js server integration.

Expected value:

- the Neon Auth endpoint for your branch
- not your site URL

Example:

```bash
NEON_AUTH_BASE_URL="https://ep-example.neonauth.us-east-1.aws.neon.tech/neondb/auth"
```

#### `NEON_AUTH_COOKIE_SECRET`

Used to sign or protect auth cookies in the app’s Neon Auth integration.

Requirements:

- at least 32 characters
- stable across deployments unless you intentionally want to invalidate sessions

Example:

```bash
NEON_AUTH_COOKIE_SECRET="replace-this-with-a-random-secret-at-least-32-characters-long"
```

#### `NETLIFY_DATABASE_URL`

Used by `@netlify/neon` for application persistence and migration scripts.

If this variable is not present:

- the app can still fall back to the local JSON file store
- but deployed write behavior should not rely on that path

### Optional

#### `ALLOWED_USER_EMAILS`

Comma-separated list of emails allowed to access the app after successful authentication.

Example:

```bash
ALLOWED_USER_EMAILS="you@example.com,teammate@example.com"
```

### Variables You May See In Netlify But The App Does Not Use Directly

- `NETLIFY_DATABASE_URL_UNPOOLED`

Netlify can provide it, but the current code uses `NETLIFY_DATABASE_URL`.

### Example `.env.local`

```bash
NEON_AUTH_BASE_URL="https://your-neon-auth-endpoint.neonauth.us-east-1.aws.neon.tech/neondb/auth"
NEON_AUTH_COOKIE_SECRET="replace-this-with-a-random-secret-at-least-32-characters-long"
NETLIFY_DATABASE_URL="postgresql://..."
ALLOWED_USER_EMAILS="you@example.com"
```

## Local Development

### Prerequisites

- Node.js
- npm
- a Neon Auth branch URL
- a Neon or Netlify DB connection string if you want database-backed local development

### Recommended Local Setup

1. Install dependencies.

```bash
npm install
```

2. Create or update `.env.local`.

```bash
NEON_AUTH_BASE_URL="https://your-neon-auth-endpoint.neonauth.us-east-1.aws.neon.tech/neondb/auth"
NEON_AUTH_COOKIE_SECRET="replace-this-with-a-random-secret-at-least-32-characters-long"
NETLIFY_DATABASE_URL="postgresql://..."
ALLOWED_USER_EMAILS="you@example.com"
```

3. Apply migrations if you are using the database.

```bash
npm run db:migrate
```

4. Start the dev server.

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000).

### Localhost Auth Note

If you want Neon Auth to accept local browser requests, enable localhost in the Neon Auth settings or explicitly allow `http://localhost:3000` in trusted domains.

## Netlify Deployment

### Required Netlify Environment Variables

Set these in Netlify before deploying:

- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_COOKIE_SECRET`
- `NETLIFY_DATABASE_URL`

Optionally set:

- `ALLOWED_USER_EMAILS`

### Deployment Process

1. Connect the GitHub repository to Netlify.
2. Add the environment variables listed above.
3. Deploy the site.
4. Confirm the deployed origin matches one of the trusted domains in Neon Auth.
5. Apply database migrations if needed.
6. Test sign-up, sign-in, run creation, run listing, and run deletion.

### Build-Time Behavior

If the app deploys without the required Neon Auth env vars, the homepage renders a configuration notice instead of initializing the session flow. This makes misconfiguration visible without crashing the initial page experience.

## Neon Configuration

The app assumes Neon Auth is configured for the same branch or environment as the database the app uses.

### Trusted Domains

Your Neon Auth trusted domains should include at least:

- `https://runtracker-by-jdr.netlify.app`
- `http://localhost:3000` for local development if you use it

If you add a custom domain, add that too.

### Authentication Methods

At least one sign-in method must be enabled in Neon Auth. The current app has been used with:

- Email sign-up and sign-in
- Google OAuth

### Email Provider

If you use email-based auth, Neon’s shared email provider is sufficient for initial testing. A custom provider is optional and depends on your email deliverability requirements.

## Security Model

The backend includes a small but deliberate security layer.

### Auth Protection

Protected APIs require a valid Neon Auth session:

- `/api/runs`
- `/api/health`

### Optional Authorization Layer

`ALLOWED_USER_EMAILS` adds a second gate beyond successful authentication.

### Same-Origin Protection

`POST /api/runs` and `DELETE /api/runs` must pass same-origin validation.

### Rate Limiting

Current per-IP limits are:

- `GET /api/runs`: 60 requests per minute
- `POST /api/runs`: 20 requests per minute
- `DELETE /api/runs`: 20 requests per minute
- `GET /api/health`: 10 requests per minute

### Response Hygiene

- client-facing server errors are generic
- internal errors are logged on the server
- security-relevant events are logged with IP, path, method, timestamp, and user agent when available

### Security Headers

`next.config.mjs` applies:

- Content Security Policy
- HSTS in non-development builds
- frame blocking
- `nosniff`
- referrer policy
- permissions policy
- cross-origin opener and resource policies

### Important Limits

The current security model is intentionally modest and has boundaries:

- rate limiting is in-memory and not shared across all serverless instances
- ownership enforcement is application-level through `user_id`, not Postgres row-level security
- legacy `NULL user_id` rows are not fully isolated per user
- the app is still a single-tenant-style private app, not a full multi-tenant platform

## Operational Notes

### Missing Auth Configuration

If the auth env vars are missing, `/` renders the configuration notice and the auth API returns configuration errors until the environment is fixed.

### Legacy Data Visibility

Imported or historical rows with `user_id IS NULL` stay visible to signed-in users. That is intentional for backward compatibility, but it is worth understanding before treating the app as a strict per-user datastore.

### Unused Or Transitional Dependencies

The repository includes some packages that are not core to the current runtime path. The current production architecture is the combination of:

- Next.js
- Neon Auth
- Netlify DB / Neon Postgres
- the app code in `src/app` and `src/lib`

### Build And Runtime Assumption

This app assumes:

- Next.js App Router
- Netlify hosting
- Neon Auth handling authentication
- Neon Postgres handling run persistence

That is the intended architecture documented by this README and reflected in the current codebase.

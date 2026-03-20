# RunTracker

RunTracker is a Next.js application for logging runs, reviewing training history, and tracking simple pace-based metrics. The frontend uses the App Router, the API is implemented with Next.js API routes, and persistence works in two modes:

- local development: `data/runs.json`
- deployed environments: Netlify DB via Neon using `NETLIFY_DATABASE_URL`

Live demo: [https://runtracker-by-jdr.netlify.app/](https://runtracker-by-jdr.netlify.app/)

## What The App Does

- lets a user log a run with date, distance, duration, and optional notes
- calculates pace automatically
- shows dashboard summaries like total distance, total time, average pace, best pace, and longest run
- lists saved runs in reverse chronological order
- allows deleting runs
- exposes a health endpoint for application and database checks

## Tech Stack

- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Netlify DB](https://docs.netlify.com/build/data-and-storage/netlify-db/)
- [Neon](https://neon.com/)
- [uuid](https://www.npmjs.com/package/uuid)
- [ESLint](https://eslint.org/)

## Architecture Overview

The project is split into three main layers:

1. client UI
2. API routes
3. persistence/storage

### Client UI

The main dashboard is rendered by `src/app/RunTrackerApp.js`.

- On first load, it requests `GET /api/runs`
- It keeps the current run list in client state
- It posts new runs to `POST /api/runs`
- It deletes runs through `DELETE /api/runs`
- It computes display-only stats from the current in-memory run list

The key UI files are:

- `src/app/RunTrackerApp.js`: dashboard container and request orchestration
- `src/app/LogRunForm.js`: run entry form, pace preview, submit state, error state
- `src/app/RunList.js`: list UI, empty state, delete action, per-run display
- `src/app/ClientLayout.js`: page shell
- `src/lib/runs.js`: validation, sorting, formatting, stats, pace calculations

### API Layer

The backend uses two API routes in `src/pages/api`:

- `src/pages/api/runs.js`
- `src/pages/api/health.js`

`/api/runs` validates input, generates IDs and timestamps, and delegates actual persistence to the storage layer in `src/lib/runStore.js`.

`/api/health` reports whether the app is running in local-file mode or database mode and, when a database connection exists, executes a simple SQL query to verify connectivity.

### Storage Layer

The storage abstraction lives in `src/lib/runStore.js`.

It decides which backend to use:

- If `NETLIFY_DATABASE_URL` is present, it uses Netlify DB through `@netlify/neon`
- If not, it falls back to the local JSON file at `data/runs.json`

This keeps local development simple while making deployed writes safe on Netlify, where the bundled filesystem is read-only.

## Request Flow

### Loading Runs

1. `RunTrackerApp` calls `fetch("/api/runs")`
2. `src/pages/api/runs.js` calls `getRuns()`
3. `src/lib/runStore.js` reads from:
   - Netlify DB if `NETLIFY_DATABASE_URL` exists
   - `data/runs.json` otherwise
4. The API returns a normalized, sorted run array
5. The client stores that array in state and computes dashboard stats

### Creating a Run

1. The user fills out `LogRunForm`
2. The form submits a JSON payload to `POST /api/runs`
3. The API validates the payload with `validateRunInput()` from `src/lib/runs.js`
4. The API creates:
   - `id`
   - `createdAt`
   - normalized numeric values
5. `createRun()` persists the new run
6. The saved run is returned to the client
7. The client prepends it to local state and re-sorts

### Deleting a Run

1. The user clicks delete in `RunList`
2. The client sends `DELETE /api/runs` with `{ id }`
3. The API validates the ID and calls `deleteRunById()`
4. Storage deletes the row or local JSON record
5. The API returns `{ id }`
6. The client removes the run from local state

## Storage Modes

### Local JSON File Mode

If `NETLIFY_DATABASE_URL` is not set and the app is not running as a deployed Netlify function, the app uses:

- file: `data/runs.json`

Behavior:

- `GET /api/runs` reads from the file
- `POST /api/runs` writes to the file
- `DELETE /api/runs` rewrites the file without the deleted run

The file is created automatically if it does not exist.

In a deployed Netlify runtime without `NETLIFY_DATABASE_URL`, write operations are intentionally blocked with an explicit error instead of silently attempting to write to the read-only bundle.

### Database Mode

If `NETLIFY_DATABASE_URL` is set, the app uses Netlify DB via Neon.

Behavior:

- the app creates the `runs` table if it does not already exist
- the app seeds the database from `data/runs.json` if the table is empty
- future reads and writes use SQL instead of the local file

This logic is handled in `src/lib/runStore.js`.

## Data Model

The application works with a run object shaped like this:

```json
{
  "id": "string",
  "date": "YYYY-MM-DD",
  "distance": 8.5,
  "durationMinutes": 46,
  "notes": "optional string",
  "createdAt": "2026-03-20T12:34:56.000Z"
}
```

### Validation Rules

Validation is implemented in `src/lib/runs.js`.

- `date` must be a valid ISO-style date string: `YYYY-MM-DD`
- `distance` must be between `0.1` and `200` km
- `durationMinutes` must be between `1` and `1440`
- `notes` must be `160` characters or fewer

### Derived Metrics

Also in `src/lib/runs.js`:

- pace = `durationMinutes / distance`
- total distance = sum of all runs
- total duration = sum of all run durations
- average pace = total duration / total distance
- best pace = lowest pace value
- longest run = greatest distance value

## API Reference

### `GET /api/runs`

Returns all runs in reverse chronological order.

Example response:

```json
[
  {
    "id": "abc123",
    "date": "2026-03-20",
    "distance": 8.5,
    "durationMinutes": 46,
    "notes": "Easy effort",
    "createdAt": "2026-03-20T10:00:00.000Z"
  }
]
```

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

Returns the saved run with `id` and `createdAt`.

Validation failures return `400` with:

```json
{
  "error": "Human readable validation message"
}
```

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

If the run does not exist, the API returns `404`.

### `GET /api/health`

Returns a simple status payload.

Local-file mode example:

```json
{
  "status": "ok",
  "storage": "local-file",
  "timestamp": "2026-03-20T12:00:00.000Z"
}
```

Database mode example:

```json
{
  "status": "ok",
  "storage": "database",
  "timestamp": "2026-03-20T12:00:00.000Z",
  "database": {
    "healthy": true,
    "time": "2026-03-20 12:00:00+00"
  }
}
```

If the database check fails, it returns `503`.

## Database Schema

The base schema is in `db/migrations/001_create_runs.sql`.

It creates:

- `runs`
- `schema_migrations`

### `runs`

Columns:

- `id TEXT PRIMARY KEY`
- `run_date TEXT NOT NULL`
- `distance_km DOUBLE PRECISION NOT NULL`
- `duration_minutes INTEGER NOT NULL`
- `notes TEXT`
- `created_at TEXT NOT NULL`

### `schema_migrations`

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
│   │   ├── ClientLayout.js
│   │   ├── LogRunForm.js
│   │   ├── RunList.js
│   │   ├── RunTrackerApp.js
│   │   ├── globals.css
│   │   ├── layout.js
│   │   └── page.js
│   ├── lib/
│   │   ├── runStore.js
│   │   └── runs.js
│   └── pages/
│       └── api/
│           ├── health.js
│           └── runs.js
├── next.config.mjs
├── package.json
└── README.md
```

## Environment Variables

### Required In Production

- `NETLIFY_DATABASE_URL`

This is the main connection string used by `@netlify/neon`.

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
npm run dev
```

Then open:

- [http://localhost:3000](http://localhost:3000)

In this mode, data is stored in `data/runs.json`.

### Option 2: Local App Against Netlify DB

If you want to test the database-backed path locally:

```bash
export NETLIFY_DATABASE_URL="postgres://..."
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
3. Deploy the site
4. Optionally run migrations explicitly with `npm run db:migrate`
5. Check the health endpoint after deploy

Recommended post-deploy checks:

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

## Troubleshooting

### `EROFS: read-only file system, open '/var/task/data/runs.json'`

Cause:

- the deployed function is trying to write to the bundled filesystem

Fix:

- ensure the site has `NETLIFY_DATABASE_URL`
- redeploy with the current codebase

### `NETLIFY_DATABASE_URL is required for deployed write access`

Cause:

- the application is running in a Netlify environment without a DB connection string

Fix:

- verify the Netlify DB integration is connected
- verify the environment variable exists for the deployed site
- redeploy after the env var is available

### Database health check returns `503`

Cause:

- the app could not connect to Neon

Check:

- `NETLIFY_DATABASE_URL`
- database availability in Netlify / Neon
- whether the schema or tables exist

## Future Improvements

- add structured SQL migration versioning beyond a single base migration
- add edit/update support for runs
- add pagination or filtering for larger histories
- add authentication and per-user run ownership
- move timestamps to real Postgres timestamp columns if stricter querying is needed

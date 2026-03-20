# RunTracker

RunTracker is a small Next.js app for logging runs and reviewing your training history. It stores run entries in `data/runs.json` during local development, uses Netlify DB backed by Neon in production through `NETLIFY_DATABASE_URL`, calculates pace automatically, and surfaces useful summary stats on the dashboard.

## Live Demo

[https://runtracker-by-jdr.netlify.app/](https://runtracker-by-jdr.netlify.app/)

## Features

- Log runs with date, distance, duration, and optional notes.
- Review total distance, total time, average pace, best pace, and longest run.
- View a sorted run history with per-run pace.
- Delete saved runs from the dashboard.
- Validate run input in both the UI and the API.
- Persist deployed run data in Netlify DB instead of the read-only function filesystem.
- Expose a small `/api/health` endpoint for storage connectivity checks.
- Lint the project with ESLint and `next/core-web-vitals`.

## Technologies Used

- [Next.js](https://nextjs.org/)
- [Netlify DB](https://docs.netlify.com/build/data-and-storage/netlify-db/)
- [Neon](https://neon.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [uuid](https://www.npmjs.com/package/uuid)
- [ESLint](https://eslint.org/)


## Getting Started

### Prerequisites

- Node.js 18.18 or newer
- npm 9 or newer

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd runtracker
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## Available Scripts

```bash
npm run dev
npm run build
npm run db:import
npm run db:migrate
npm run start
npm run lint
```

## Database Utilities

- `GET /api/health` returns a basic application and database health payload.
- `npm run db:migrate` applies SQL files from `db/migrations` using `NETLIFY_DATABASE_URL`.
- `npm run db:import` imports `data/runs.json` into the `runs` table. You can also pass a custom JSON path: `npm run db:import -- ./path/to/runs.json`.

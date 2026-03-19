# RunTracker

RunTracker is a small Next.js app for logging runs and reviewing your training history. It stores run entries in `data/runs.json`, calculates pace automatically, and surfaces useful summary stats on the dashboard.

## Features

- Log runs with date, distance, duration, and optional notes.
- Review total distance, total time, average pace, best pace, and longest run.
- View a sorted run history with per-run pace.
- Delete saved runs from the dashboard.
- Validate run input in both the UI and the API.
- Lint the project with ESLint and `next/core-web-vitals`.

## Technologies Used

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [uuid](https://www.npmjs.com/package/uuid)
- [ESLint](https://eslint.org/)


## Getting Started

### Prerequisites

- Node.js 18.17 or newer
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
npm run start
npm run lint
```

import { neon } from "@netlify/neon";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { normalizeStoredRun, sortRunsByDate } from "./runs";

const localFilePath = path.resolve(process.cwd(), "data", "runs.json");
const localDirectoryPath = path.dirname(localFilePath);

let hasEnsuredDatabaseSchema = false;
let hasPreparedDatabase = false;

function isNetlifyRuntime() {
  return process.env.NETLIFY === "true";
}

function hasDatabaseConnection() {
  return typeof process.env.NETLIFY_DATABASE_URL === "string" &&
    process.env.NETLIFY_DATABASE_URL.trim() !== "";
}

function getDatabaseClient() {
  return neon();
}

function normalizeRuns(rawRuns) {
  const parsedRuns = Array.isArray(rawRuns) ? rawRuns : [];

  return sortRunsByDate(parsedRuns.map(normalizeStoredRun).filter(Boolean));
}

async function ensureLocalDataFile() {
  await mkdir(localDirectoryPath, { recursive: true });

  try {
    await readFile(localFilePath, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }

    await writeFile(localFilePath, "[]");
  }
}

async function readLocalRuns() {
  await ensureLocalDataFile();

  const jsonData = await readFile(localFilePath, "utf8");
  return normalizeRuns(JSON.parse(jsonData));
}

async function writeLocalRuns(runs) {
  await ensureLocalDataFile();
  await writeFile(localFilePath, JSON.stringify(sortRunsByDate(runs), null, 2));
}

async function ensureDatabaseSchema() {
  if (hasEnsuredDatabaseSchema) {
    return;
  }

  const sql = getDatabaseClient();

  await sql`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      run_date TEXT NOT NULL,
      distance_km DOUBLE PRECISION NOT NULL,
      duration_minutes INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    )
  `;

  hasEnsuredDatabaseSchema = true;
}

async function seedDatabaseIfEmpty() {
  const sql = getDatabaseClient();
  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM runs`;

  if (count > 0) {
    return;
  }

  const seedRuns = await readLocalRuns();

  for (const run of seedRuns) {
    await sql`
      INSERT INTO runs (id, run_date, distance_km, duration_minutes, notes, created_at)
      VALUES (
        ${run.id},
        ${run.date},
        ${run.distance},
        ${run.durationMinutes},
        ${run.notes ?? null},
        ${run.createdAt}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

async function ensureDatabaseReady() {
  if (hasPreparedDatabase) {
    return;
  }

  await ensureDatabaseSchema();
  await seedDatabaseIfEmpty();
  hasPreparedDatabase = true;
}

async function readDatabaseRuns() {
  await ensureDatabaseReady();

  const sql = getDatabaseClient();
  const rows = await sql`
    SELECT
      id,
      run_date AS date,
      distance_km AS distance,
      duration_minutes AS "durationMinutes",
      notes,
      created_at AS "createdAt"
    FROM runs
    ORDER BY run_date DESC, created_at DESC
  `;

  return normalizeRuns(rows);
}

async function writeDatabaseRun(run) {
  await ensureDatabaseReady();

  const sql = getDatabaseClient();

  await sql`
    INSERT INTO runs (id, run_date, distance_km, duration_minutes, notes, created_at)
    VALUES (
      ${run.id},
      ${run.date},
      ${run.distance},
      ${run.durationMinutes},
      ${run.notes ?? null},
      ${run.createdAt}
    )
  `;
}

async function deleteDatabaseRunById(id) {
  await ensureDatabaseReady();

  const sql = getDatabaseClient();
  const deletedRows = await sql`
    DELETE FROM runs
    WHERE id = ${id}
    RETURNING id
  `;

  return deletedRows.length > 0;
}

function assertProductionStorageConfigured() {
  if (isNetlifyRuntime() && !hasDatabaseConnection()) {
    throw new Error("NETLIFY_DATABASE_URL is required for deployed write access.");
  }
}

export async function getRuns() {
  if (hasDatabaseConnection()) {
    return readDatabaseRuns();
  }

  return readLocalRuns();
}

export async function createRun(run) {
  if (hasDatabaseConnection()) {
    await writeDatabaseRun(run);
    return run;
  }

  assertProductionStorageConfigured();

  const runs = await readLocalRuns();
  await writeLocalRuns([run, ...runs]);

  return run;
}

export async function deleteRunById(id) {
  if (hasDatabaseConnection()) {
    return deleteDatabaseRunById(id);
  }

  assertProductionStorageConfigured();

  const runs = await readLocalRuns();
  const nextRuns = runs.filter((run) => run.id !== id);
  const deleted = nextRuns.length !== runs.length;

  if (deleted) {
    await writeLocalRuns(nextRuns);
  }

  return deleted;
}

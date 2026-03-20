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

function normalizeRunRecord(run) {
  const normalizedRun = normalizeStoredRun(run);

  if (!normalizedRun) {
    return null;
  }

  return {
    ...normalizedRun,
    userId: typeof run?.userId === "string" ? run.userId.trim() : "",
  };
}

function isRunVisibleToUser(run, userId) {
  return run.userId === "" || run.userId === userId;
}

function stripRunOwner(run) {
  const { userId: _userId, ...publicRun } = run;
  return publicRun;
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
  const parsedJson = JSON.parse(jsonData);
  const parsedRuns = Array.isArray(parsedJson) ? parsedJson : [];

  return parsedRuns.map(normalizeRunRecord).filter(Boolean);
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
      user_id TEXT,
      run_date TEXT NOT NULL,
      distance_km DOUBLE PRECISION NOT NULL,
      duration_minutes INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    )
  `;

  await sql`ALTER TABLE runs ADD COLUMN IF NOT EXISTS user_id TEXT`;
  await sql`
    CREATE INDEX IF NOT EXISTS runs_user_id_run_date_created_at_idx
    ON runs (user_id, run_date DESC, created_at DESC)
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
      INSERT INTO runs (id, user_id, run_date, distance_km, duration_minutes, notes, created_at)
      VALUES (
        ${run.id},
        ${null},
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

async function readDatabaseRuns(userId) {
  await ensureDatabaseReady();

  const sql = getDatabaseClient();
  const rows = await sql`
    SELECT
      id,
      user_id AS "userId",
      run_date AS date,
      distance_km AS distance,
      duration_minutes AS "durationMinutes",
      notes,
      created_at AS "createdAt"
    FROM runs
    WHERE user_id = ${userId} OR user_id IS NULL
    ORDER BY run_date DESC, created_at DESC
  `;

  return rows.map(normalizeRunRecord).filter(Boolean).map(stripRunOwner);
}

async function writeDatabaseRun(userId, run) {
  await ensureDatabaseReady();

  const sql = getDatabaseClient();

  await sql`
    INSERT INTO runs (id, user_id, run_date, distance_km, duration_minutes, notes, created_at)
    VALUES (
      ${run.id},
      ${userId},
      ${run.date},
      ${run.distance},
      ${run.durationMinutes},
      ${run.notes ?? null},
      ${run.createdAt}
    )
  `;
}

async function deleteDatabaseRunById(userId, id) {
  await ensureDatabaseReady();

  const sql = getDatabaseClient();
  const deletedRows = await sql`
    DELETE FROM runs
    WHERE id = ${id}
      AND (user_id = ${userId} OR user_id IS NULL)
    RETURNING id
  `;

  return deletedRows.length > 0;
}

function assertProductionStorageConfigured() {
  if (isNetlifyRuntime() && !hasDatabaseConnection()) {
    throw new Error("NETLIFY_DATABASE_URL is required for deployed write access.");
  }
}

export async function getRuns(userId) {
  if (hasDatabaseConnection()) {
    return readDatabaseRuns(userId);
  }

  const runs = await readLocalRuns();
  return sortRunsByDate(runs.filter((run) => isRunVisibleToUser(run, userId)).map(stripRunOwner));
}

export async function createRun(userId, run) {
  if (hasDatabaseConnection()) {
    await writeDatabaseRun(userId, run);
    return run;
  }

  assertProductionStorageConfigured();

  const runs = await readLocalRuns();
  await writeLocalRuns([{ ...run, userId }, ...runs]);

  return run;
}

export async function deleteRunById(userId, id) {
  if (hasDatabaseConnection()) {
    return deleteDatabaseRunById(userId, id);
  }

  assertProductionStorageConfigured();

  const runs = await readLocalRuns();
  const nextRuns = runs.filter((run) => !(run.id === id && isRunVisibleToUser(run, userId)));
  const deleted = nextRuns.length !== runs.length;

  if (deleted) {
    await writeLocalRuns(nextRuns);
  }

  return deleted;
}

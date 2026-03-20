import { neon } from "@netlify/neon";
import { readdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDirectory = path.resolve(__dirname, "..", "db", "migrations");

async function getMigrationFiles() {
  const entries = await readdir(migrationsDirectory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
}

async function ensureMigrationTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function getAppliedMigrationIds(sql) {
  const rows = await sql`SELECT id FROM schema_migrations ORDER BY id`;
  return new Set(rows.map((row) => row.id));
}

async function main() {
  if (!process.env.NETLIFY_DATABASE_URL) {
    throw new Error("NETLIFY_DATABASE_URL is required to apply migrations.");
  }

  const sql = neon();
  const files = await getMigrationFiles();

  if (files.length === 0) {
    console.log("No migration files found.");
    return;
  }

  await ensureMigrationTable(sql);
  const appliedMigrationIds = await getAppliedMigrationIds(sql);

  for (const file of files) {
    if (appliedMigrationIds.has(file)) {
      console.log(`Skipping ${file} (already applied).`);
      continue;
    }

    const filePath = path.join(migrationsDirectory, file);
    const migrationSql = await readFile(filePath, "utf8");

    await sql.transaction((txn) => [
      txn(migrationSql),
      txn`INSERT INTO schema_migrations (id) VALUES (${file})`,
    ]);

    console.log(`Applied ${file}.`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});

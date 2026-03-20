import { neon } from "@netlify/neon";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultInputPath = path.resolve(__dirname, "..", "data", "runs.json");

async function main() {
  if (!process.env.NETLIFY_DATABASE_URL) {
    throw new Error("NETLIFY_DATABASE_URL is required to import runs into Netlify DB.");
  }

  const inputPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : defaultInputPath;

  const jsonData = await readFile(inputPath, "utf8");
  const runs = JSON.parse(jsonData);

  if (!Array.isArray(runs)) {
    throw new Error("The import file must contain a JSON array of runs.");
  }

  const sql = neon();

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

  let importedCount = 0;

  for (const run of runs) {
    if (!run?.id || !run?.date) {
      continue;
    }

    const durationMinutes = Number(run.durationMinutes ?? run.time);

    const insertedRows = await sql`
      INSERT INTO runs (id, run_date, distance_km, duration_minutes, notes, created_at)
      VALUES (
        ${run.id},
        ${run.date},
        ${Number(run.distance)},
        ${Math.round(durationMinutes)},
        ${run.notes ?? null},
        ${run.createdAt ?? new Date().toISOString()}
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `;

    importedCount += insertedRows.length;
  }

  console.log(`Imported ${importedCount} runs from ${inputPath}.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});

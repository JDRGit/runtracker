import { neon } from "@netlify/neon";

function hasDatabaseConnection() {
  return typeof process.env.NETLIFY_DATABASE_URL === "string" &&
    process.env.NETLIFY_DATABASE_URL.trim() !== "";
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    res.status(405).json({ error: `Method ${req.method} not allowed.` });
    return;
  }

  const payload = {
    status: "ok",
    storage: hasDatabaseConnection() ? "database" : "local-file",
    timestamp: new Date().toISOString(),
  };

  if (!hasDatabaseConnection()) {
    res.status(200).json(payload);
    return;
  }

  try {
    const sql = neon();
    const [result] = await sql`SELECT NOW()::text AS database_time, 1 AS healthy`;

    res.status(200).json({
      ...payload,
      database: {
        healthy: result?.healthy === 1,
        time: result?.database_time ?? null,
      },
    });
  } catch (error) {
    res.status(503).json({
      ...payload,
      status: "error",
      error: error.message || "Database health check failed.",
    });
  }
}

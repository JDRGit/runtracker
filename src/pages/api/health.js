import { neon } from "@netlify/neon";
import { requireAuth } from "../../lib/auth";
import { logApiError } from "../../lib/requestLogger";
import { applyRateLimit } from "../../lib/rateLimit";

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

  if (!applyRateLimit(req, res, { limit: 10, scope: "health:get", windowMs: 60_000 })) {
    return;
  }

  const session = await requireAuth(req, res);

  if (!session) {
    return;
  }

  const payload = {
    account: {
      email: session.user.email ?? null,
    },
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
      },
    });
  } catch (error) {
    logApiError(req, "health.error", error);
    res.status(503).json({
      ...payload,
      status: "error",
      error: "Database health check failed.",
    });
  }
}

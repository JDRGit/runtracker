import { neon } from "@netlify/neon";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { logApiError } from "@/lib/requestLogger";
import { appendRateLimitHeaders, applyRateLimit } from "@/lib/rateLimit";

function hasDatabaseConnection() {
  return typeof process.env.NETLIFY_DATABASE_URL === "string" &&
    process.env.NETLIFY_DATABASE_URL.trim() !== "";
}

export async function GET(request) {
  const rateLimit = applyRateLimit(request, { limit: 10, scope: "health:get", windowMs: 60_000 });

  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  try {
    const { response, session } = await requireAuth(request);

    if (response) {
      return appendRateLimitHeaders(response, rateLimit.headers);
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
      return appendRateLimitHeaders(NextResponse.json(payload), rateLimit.headers);
    }

    const sql = neon();
    const [result] = await sql`SELECT 1 AS healthy`;

    return appendRateLimitHeaders(
      NextResponse.json({
        ...payload,
        database: {
          healthy: result?.healthy === 1,
        },
      }),
      rateLimit.headers,
    );
  } catch (error) {
    logApiError(request, "health.error", error);
    return appendRateLimitHeaders(
      NextResponse.json(
        {
          error: "Database health check failed.",
          status: "error",
          timestamp: new Date().toISOString(),
        },
        { status: 503 },
      ),
      rateLimit.headers,
    );
  }
}

export function POST() {
  const response = NextResponse.json({ error: "Method POST not allowed." }, { status: 405 });
  response.headers.set("Allow", "GET");
  return response;
}

export const PUT = POST;
export const PATCH = POST;
export const DELETE = POST;

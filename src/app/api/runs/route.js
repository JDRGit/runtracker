import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { enforceSameOrigin, requireAuth } from "@/lib/auth";
import { logApiError } from "@/lib/requestLogger";
import { appendRateLimitHeaders, applyRateLimit } from "@/lib/rateLimit";
import { validateRunInput } from "@/lib/runs";
import { createRun, deleteRunById, getRuns } from "@/lib/runStore";

function methodNotAllowed(method) {
  return NextResponse.json({ error: `Method ${method} not allowed.` }, { status: 405 });
}

async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function GET(request) {
  const rateLimit = applyRateLimit(request, { limit: 60, scope: "runs:get", windowMs: 60_000 });

  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  try {
    const { response, session } = await requireAuth(request);

    if (response) {
      return appendRateLimitHeaders(response, rateLimit.headers);
    }

    return appendRateLimitHeaders(NextResponse.json(await getRuns(session.user.id)), rateLimit.headers);
  } catch (error) {
    logApiError(request, "runs.error", error);
    return appendRateLimitHeaders(
      NextResponse.json({ error: "Unexpected server error." }, { status: 500 }),
      rateLimit.headers,
    );
  }
}

export async function POST(request) {
  const rateLimit = applyRateLimit(request, { limit: 20, scope: "runs:post", windowMs: 60_000 });

  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  const originError = enforceSameOrigin(request);

  if (originError) {
    return appendRateLimitHeaders(originError, rateLimit.headers);
  }

  try {
    const { response, session } = await requireAuth(request);

    if (response) {
      return appendRateLimitHeaders(response, rateLimit.headers);
    }

    const validation = validateRunInput(await parseJsonBody(request));

    if (!validation.isValid) {
      return appendRateLimitHeaders(
        NextResponse.json({ error: validation.errors[0] }, { status: 400 }),
        rateLimit.headers,
      );
    }

    const newRun = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      ...validation.value,
    };

    return appendRateLimitHeaders(
      NextResponse.json(await createRun(session.user.id, newRun), { status: 201 }),
      rateLimit.headers,
    );
  } catch (error) {
    logApiError(request, "runs.error", error);
    return appendRateLimitHeaders(
      NextResponse.json({ error: "Unexpected server error." }, { status: 500 }),
      rateLimit.headers,
    );
  }
}

export async function DELETE(request) {
  const rateLimit = applyRateLimit(request, { limit: 20, scope: "runs:delete", windowMs: 60_000 });

  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  const originError = enforceSameOrigin(request);

  if (originError) {
    return appendRateLimitHeaders(originError, rateLimit.headers);
  }

  try {
    const { response, session } = await requireAuth(request);

    if (response) {
      return appendRateLimitHeaders(response, rateLimit.headers);
    }

    const payload = await parseJsonBody(request);
    const id = typeof payload?.id === "string" ? payload.id.trim() : "";

    if (!id) {
      return appendRateLimitHeaders(
        NextResponse.json({ error: "Run id is required." }, { status: 400 }),
        rateLimit.headers,
      );
    }

    const deleted = await deleteRunById(session.user.id, id);

    if (!deleted) {
      return appendRateLimitHeaders(
        NextResponse.json({ error: "Run not found." }, { status: 404 }),
        rateLimit.headers,
      );
    }

    return appendRateLimitHeaders(NextResponse.json({ id }), rateLimit.headers);
  } catch (error) {
    logApiError(request, "runs.error", error);
    return appendRateLimitHeaders(
      NextResponse.json({ error: "Unexpected server error." }, { status: 500 }),
      rateLimit.headers,
    );
  }
}

export function PUT(request) {
  const response = methodNotAllowed(request.method);
  response.headers.set("Allow", "GET, POST, DELETE");
  return response;
}

export function PATCH(request) {
  const response = methodNotAllowed(request.method);
  response.headers.set("Allow", "GET, POST, DELETE");
  return response;
}

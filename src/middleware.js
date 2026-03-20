import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "development" ? "runtracker_session" : "__Host-runtracker_session";

function hasAuthSignal(request) {
  return Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value) ||
    Boolean(request.headers.get("authorization"));
}

export function middleware(request) {
  if (hasAuthSignal(request)) {
    return NextResponse.next();
  }

  return NextResponse.json(
    { error: "Authentication required." },
    {
      headers: {
        "Cache-Control": "no-store",
      },
      status: 401,
    },
  );
}

export const config = {
  matcher: ["/api/runs", "/api/health"],
};

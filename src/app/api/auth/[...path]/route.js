import { NextResponse } from "next/server";
import { auth, isNeonAuthConfigured } from "@/lib/auth";

const handlers = auth.handler();

function getConfigurationErrorResponse() {
  return NextResponse.json(
    {
      error: "Neon Auth is not configured. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET.",
    },
    { status: 500 },
  );
}

async function runHandler(method, request, context) {
  if (!isNeonAuthConfigured()) {
    return getConfigurationErrorResponse();
  }

  return method(request, context);
}

export async function GET(request, context) {
  return runHandler(handlers.GET, request, context);
}

export async function POST(request, context) {
  return runHandler(handlers.POST, request, context);
}

export async function PUT(request, context) {
  return runHandler(handlers.PUT, request, context);
}

export async function PATCH(request, context) {
  return runHandler(handlers.PATCH, request, context);
}

export async function DELETE(request, context) {
  return runHandler(handlers.DELETE, request, context);
}

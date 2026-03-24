import { createNeonAuth } from "@neondatabase/auth/next/server";
import { NextResponse } from "next/server";
import { logSecurityEvent } from "./requestLogger";

const FALLBACK_AUTH_BASE_URL = "https://example.invalid";
const FALLBACK_COOKIE_SECRET = "runtracker-neon-auth-cookie-secret-build-only-123456";

function getEnv(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function getConfiguredAuthBaseUrl() {
  return getEnv("NEON_AUTH_BASE_URL") || FALLBACK_AUTH_BASE_URL;
}

function getConfiguredCookieSecret() {
  const configuredSecret = getEnv("NEON_AUTH_COOKIE_SECRET");

  if (configuredSecret.length >= 32) {
    return configuredSecret;
  }

  return FALLBACK_COOKIE_SECRET;
}

function getAllowedUserEmails() {
  return new Set(
    getEnv("ALLOWED_USER_EMAILS")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isAllowedSession(session) {
  const allowedEmails = getAllowedUserEmails();

  if (allowedEmails.size === 0) {
    return true;
  }

  const email = typeof session?.user?.email === "string" ? session.user.email.trim().toLowerCase() : "";
  return email !== "" && allowedEmails.has(email);
}

export function isNeonAuthConfigured() {
  return getEnv("NEON_AUTH_BASE_URL") !== "" && getEnv("NEON_AUTH_COOKIE_SECRET").length >= 32;
}

export const auth = createNeonAuth({
  baseUrl: getConfiguredAuthBaseUrl(),
  cookies: {
    secret: getConfiguredCookieSecret(),
    sessionDataTtl: 300,
  },
});

function getAuthenticationConfigurationError() {
  if (getEnv("NEON_AUTH_BASE_URL") === "") {
    return "NEON_AUTH_BASE_URL is not configured.";
  }

  if (getEnv("NEON_AUTH_COOKIE_SECRET").length < 32) {
    return "NEON_AUTH_COOKIE_SECRET must be at least 32 characters.";
  }

  return "Server authentication is not configured.";
}

export async function requireAuth(request) {
  if (!isNeonAuthConfigured()) {
    const error = getAuthenticationConfigurationError();
    logSecurityEvent(request, "auth.misconfigured", { error });

    return {
      response: NextResponse.json({ error }, { status: 500 }),
      session: null,
    };
  }

  const { data: session, error } = await auth.getSession();

  if (error) {
    logSecurityEvent(request, "auth.session_error", {
      error: error.message || "Unknown session error",
    });

    return {
      response: NextResponse.json({ error: "Could not verify your session." }, { status: 500 }),
      session: null,
    };
  }

  if (!session?.user?.id) {
    logSecurityEvent(request, "auth.required");

    return {
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
      session: null,
    };
  }

  if (!isAllowedSession(session)) {
    logSecurityEvent(request, "auth.forbidden", {
      email: typeof session.user.email === "string" ? session.user.email : "",
    });

    return {
      response: NextResponse.json(
        { error: "Your account is signed in, but it is not allowed to access this app." },
        { status: 403 },
      ),
      session: null,
    };
  }

  return {
    response: null,
    session,
  };
}

function getRequestProtocol(request) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto");

  if (forwardedProtocol) {
    return forwardedProtocol.split(",")[0].trim();
  }

  return process.env.NODE_ENV === "development" ? "http" : "https";
}

export function enforceSameOrigin(request) {
  const requestOrigin = request.headers.get("origin");

  if (!requestOrigin) {
    return null;
  }

  const requestHost = request.headers.get("host");

  if (!requestHost) {
    logSecurityEvent(request, "origin.invalid", { reason: "missing-host" });
    return NextResponse.json({ error: "Origin validation failed." }, { status: 403 });
  }

  const expectedOrigin = `${getRequestProtocol(request)}://${requestHost}`;

  if (requestOrigin !== expectedOrigin) {
    logSecurityEvent(request, "origin.invalid", { expectedOrigin, requestOrigin });
    return NextResponse.json({ error: "Origin validation failed." }, { status: 403 });
  }

  return null;
}

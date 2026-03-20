import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { nextCookies } from "better-auth/next-js";
import { logSecurityEvent } from "./requestLogger";

const FALLBACK_AUTH_SECRET = "runtracker-build-secret-change-me";
const FALLBACK_AUTH_URL = "http://localhost:3000";
const FALLBACK_DATABASE_URL = "postgresql://runtracker:runtracker@127.0.0.1:5432/runtracker";

function getEnv(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function getConfiguredAuthUrl() {
  return getEnv("BETTER_AUTH_URL") || getEnv("URL") || FALLBACK_AUTH_URL;
}

function getConfiguredAuthUrlObject() {
  try {
    return new URL(getConfiguredAuthUrl());
  } catch {
    return new URL(FALLBACK_AUTH_URL);
  }
}

function getConfiguredAuthBaseUrl() {
  return getConfiguredAuthUrlObject().origin;
}

function getDatabaseUrl() {
  return getEnv("NETLIFY_DATABASE_URL") || getEnv("DATABASE_URL") || FALLBACK_DATABASE_URL;
}

function hasDatabaseUrl() {
  return Boolean(getEnv("NETLIFY_DATABASE_URL") || getEnv("DATABASE_URL"));
}

function hasConfiguredAuthSecret() {
  return getEnv("BETTER_AUTH_SECRET") !== "";
}

function getAuthSecret() {
  return getEnv("BETTER_AUTH_SECRET") || FALLBACK_AUTH_SECRET;
}

function getGoogleProviderConfig() {
  const clientId = getEnv("GOOGLE_CLIENT_ID");
  const clientSecret = getEnv("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret || !hasConfiguredAuthSecret()) {
    return {};
  }

  return {
    google: {
      clientId,
      clientSecret,
      prompt: "select_account",
    },
  };
}

function getAllowedUserEmails() {
  return new Set(
    getEnv("ALLOWED_USER_EMAILS")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function hasConfiguredAllowedEmails() {
  return getAllowedUserEmails().size > 0;
}

function getMemoryDatabase() {
  if (!globalThis.__runtrackerBetterAuthMemoryDb) {
    globalThis.__runtrackerBetterAuthMemoryDb = {};
  }

  return globalThis.__runtrackerBetterAuthMemoryDb;
}

function getAuthDatabase() {
  if (hasDatabaseUrl()) {
    return {
      provider: "postgres",
      url: getDatabaseUrl(),
    };
  }

  return memoryAdapter(getMemoryDatabase());
}

let authInstance = null;

function createAuth() {
  const authUrl = getConfiguredAuthUrlObject();

  return betterAuth({
    advanced: {
      cookiePrefix: "runtracker",
    },
    basePath: "/api/auth",
    baseURL: getConfiguredAuthBaseUrl(),
    database: getAuthDatabase(),
    plugins: [
      nextCookies(),
      passkey({
        advanced: {
          webAuthnChallengeCookie: "runtracker-passkey",
        },
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
        },
        origin: authUrl.origin,
        rpID: authUrl.hostname,
        rpName: "RunTracker",
      }),
    ],
    secret: getAuthSecret(),
    socialProviders: getGoogleProviderConfig(),
  });
}

export function getAuth() {
  if (!authInstance) {
    authInstance = createAuth();
  }

  return authInstance;
}

export function isGoogleAuthConfigured() {
  return Boolean(getEnv("GOOGLE_CLIENT_ID") && getEnv("GOOGLE_CLIENT_SECRET") && hasConfiguredAuthSecret());
}

export function getRequestHeaders(req) {
  const headers = new Headers();

  for (const [name, value] of Object.entries(req.headers ?? {})) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
      continue;
    }

    if (typeof value === "string") {
      headers.set(name, value);
    }
  }

  return headers;
}

export async function getSessionFromRequest(req) {
  return getAuth().api.getSession({
    headers: getRequestHeaders(req),
  });
}

function isAllowedSession(session) {
  const allowedEmails = getAllowedUserEmails();

  if (allowedEmails.size === 0) {
    return true;
  }

  const email = typeof session?.user?.email === "string" ? session.user.email.trim().toLowerCase() : "";
  return email !== "" && allowedEmails.has(email);
}

export async function requireAuth(req, res) {
  if (!hasConfiguredAuthSecret()) {
    logSecurityEvent(req, "auth.misconfigured", { reason: "missing-better-auth-secret" });
    res.status(500).json({ error: "Server authentication is not configured." });
    return null;
  }

  if (process.env.NODE_ENV !== "development" && !hasConfiguredAllowedEmails()) {
    logSecurityEvent(req, "auth.misconfigured", { reason: "missing-allowed-user-emails" });
    res.status(500).json({ error: "Authorized user emails are not configured for this deployment." });
    return null;
  }

  const session = await getSessionFromRequest(req);

  if (!session?.user?.id) {
    logSecurityEvent(req, "auth.required");
    res.status(401).json({ error: "Authentication required." });
    return null;
  }

  if (!isAllowedSession(session)) {
    logSecurityEvent(req, "auth.forbidden", {
      email: typeof session.user.email === "string" ? session.user.email : "",
    });
    res
      .status(403)
      .json({ error: "Your account is signed in, but it is not allowed to access this app." });
    return null;
  }

  return session;
}

function getRequestProtocol(req) {
  const forwardedProtocol = req.headers["x-forwarded-proto"];

  if (typeof forwardedProtocol === "string" && forwardedProtocol.trim() !== "") {
    return forwardedProtocol.split(",")[0].trim();
  }

  return process.env.NODE_ENV === "development" ? "http" : "https";
}

export function enforceSameOrigin(req, res) {
  const requestOrigin = req.headers.origin;

  if (!requestOrigin) {
    return true;
  }

  const requestHost = req.headers.host;

  if (!requestHost) {
    logSecurityEvent(req, "origin.invalid", { reason: "missing-host" });
    res.status(403).json({ error: "Origin validation failed." });
    return false;
  }

  const expectedOrigin = `${getRequestProtocol(req)}://${requestHost}`;

  if (requestOrigin !== expectedOrigin) {
    logSecurityEvent(req, "origin.invalid", { expectedOrigin, requestOrigin });
    res.status(403).json({ error: "Origin validation failed." });
    return false;
  }

  return true;
}

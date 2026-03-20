import crypto from "crypto";
import { logSecurityEvent } from "./requestLogger";

const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "development" ? "runtracker_session" : "__Host-runtracker_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function getAdminToken() {
  return typeof process.env.RUNTRACKER_ADMIN_TOKEN === "string"
    ? process.env.RUNTRACKER_ADMIN_TOKEN.trim()
    : "";
}

function parseCookies(cookieHeader) {
  if (typeof cookieHeader !== "string" || cookieHeader.trim() === "") {
    return {};
  }

  return cookieHeader.split(";").reduce((cookies, entry) => {
    const [rawName, ...rawValueParts] = entry.trim().split("=");

    if (!rawName) {
      return cookies;
    }

    cookies[rawName] = decodeURIComponent(rawValueParts.join("="));
    return cookies;
  }, {});
}

function areEqualStrings(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getExpectedSessionValue() {
  const adminToken = getAdminToken();

  if (!adminToken) {
    return "";
  }

  return crypto.createHmac("sha256", adminToken).update("runtracker-session").digest("hex");
}

function getRequestProtocol(req) {
  const forwardedProtocol = req.headers["x-forwarded-proto"];

  if (typeof forwardedProtocol === "string" && forwardedProtocol.trim() !== "") {
    return forwardedProtocol.split(",")[0].trim();
  }

  return process.env.NODE_ENV === "development" ? "http" : "https";
}

export function hasAuthConfigured() {
  return getAdminToken() !== "";
}

export function getRequestSessionValue(req) {
  const cookies = parseCookies(req.headers.cookie);
  return typeof cookies[SESSION_COOKIE_NAME] === "string" ? cookies[SESSION_COOKIE_NAME] : "";
}

export function isValidAdminToken(token) {
  const adminToken = getAdminToken();

  if (!adminToken || typeof token !== "string" || token.trim() === "") {
    return false;
  }

  return areEqualStrings(adminToken, token.trim());
}

export function isAuthenticatedRequest(req) {
  if (!hasAuthConfigured()) {
    return false;
  }

  const authorizationHeader = req.headers.authorization;

  if (typeof authorizationHeader === "string" && authorizationHeader.startsWith("Bearer ")) {
    return isValidAdminToken(authorizationHeader.slice("Bearer ".length));
  }

  const sessionValue = getRequestSessionValue(req);
  const expectedSessionValue = getExpectedSessionValue();

  if (!sessionValue || !expectedSessionValue) {
    return false;
  }

  return areEqualStrings(sessionValue, expectedSessionValue);
}

export function requireAuth(req, res) {
  if (!hasAuthConfigured()) {
    logSecurityEvent(req, "auth.misconfigured");
    res.status(500).json({ error: "Server authentication is not configured." });
    return false;
  }

  if (!isAuthenticatedRequest(req)) {
    logSecurityEvent(req, "auth.required");
    res.status(401).json({ error: "Authentication required." });
    return false;
  }

  return true;
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

export function createSessionCookie() {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(getExpectedSessionValue())}`,
    "HttpOnly",
    "Path=/",
    "Priority=High",
    "SameSite=Strict",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ];

  if (process.env.NODE_ENV !== "development") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function clearSessionCookie() {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "HttpOnly",
    "Path=/",
    "Priority=High",
    "SameSite=Strict",
    "Max-Age=0",
  ];

  if (process.env.NODE_ENV !== "development") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

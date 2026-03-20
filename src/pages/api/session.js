import {
  clearSessionCookie,
  createSessionCookie,
  enforceSameOrigin,
  hasAuthConfigured,
  isAuthenticatedRequest,
  isValidAdminToken,
} from "../../lib/auth";
import { logSecurityEvent } from "../../lib/requestLogger";
import { applyRateLimit } from "../../lib/rateLimit";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    if (!applyRateLimit(req, res, { limit: 60, scope: "session:get", windowMs: 60_000 })) {
      return;
    }

    res.status(200).json({
      authenticated: hasAuthConfigured() && isAuthenticatedRequest(req),
    });
    return;
  }

  if (req.method === "POST") {
    if (!applyRateLimit(req, res, { limit: 5, scope: "session:post", windowMs: 10 * 60_000 })) {
      return;
    }

    if (!enforceSameOrigin(req, res)) {
      return;
    }

    if (!hasAuthConfigured()) {
      logSecurityEvent(req, "session.misconfigured");
      res.status(500).json({ error: "Server authentication is not configured." });
      return;
    }

    const token = typeof req.body?.token === "string" ? req.body.token : "";

    if (!isValidAdminToken(token)) {
      logSecurityEvent(req, "session.invalid_token");
      res.status(401).json({ error: "Invalid token." });
      return;
    }

    logSecurityEvent(req, "session.created");
    res.setHeader("Set-Cookie", createSessionCookie());
    res.status(204).end();
    return;
  }

  if (req.method === "DELETE") {
    if (!applyRateLimit(req, res, { limit: 20, scope: "session:delete", windowMs: 60_000 })) {
      return;
    }

    if (!enforceSameOrigin(req, res)) {
      return;
    }

    logSecurityEvent(req, "session.cleared");
    res.setHeader("Set-Cookie", clearSessionCookie());
    res.status(204).end();
    return;
  }

  res.setHeader("Allow", ["GET", "POST", "DELETE"]);
  res.status(405).json({ error: `Method ${req.method} not allowed.` });
}

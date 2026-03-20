function getHeaderValue(headers, name) {
  const value = headers?.[name];
  return typeof value === "string" ? value : "";
}

export function getRequestIp(req) {
  const forwardedFor = getHeaderValue(req.headers, "x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.socket?.remoteAddress || "unknown";
}

export function getRequestPath(req) {
  return typeof req.url === "string" ? req.url : "unknown";
}

function getRequestContext(req) {
  return {
    ip: getRequestIp(req),
    method: req.method || "UNKNOWN",
    path: getRequestPath(req),
    timestamp: new Date().toISOString(),
    userAgent: getHeaderValue(req.headers, "user-agent"),
  };
}

export function logSecurityEvent(req, event, details = {}) {
  console.warn(
    `[security] ${event}`,
    JSON.stringify({
      ...getRequestContext(req),
      ...details,
    }),
  );
}

export function logApiError(req, label, error, details = {}) {
  console.error(
    `[api] ${label}`,
    JSON.stringify({
      ...getRequestContext(req),
      ...details,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
}

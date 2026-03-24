function getHeaders(request) {
  if (request?.headers instanceof Headers) {
    return request.headers;
  }

  return new Headers(request?.headers ?? {});
}

function getHeaderValue(request, name) {
  return getHeaders(request).get(name) || "";
}

export function getRequestIp(request) {
  const forwardedFor = getHeaderValue(request, "x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return "unknown";
}

export function getRequestPath(request) {
  if (request?.nextUrl?.pathname) {
    return request.nextUrl.pathname;
  }

  if (typeof request?.url === "string") {
    try {
      return new URL(request.url).pathname;
    } catch {
      return request.url;
    }
  }

  return "unknown";
}

function getRequestContext(request) {
  return {
    ip: getRequestIp(request),
    method: request?.method || "UNKNOWN",
    path: getRequestPath(request),
    timestamp: new Date().toISOString(),
    userAgent: getHeaderValue(request, "user-agent"),
  };
}

export function logSecurityEvent(request, event, details = {}) {
  console.warn(
    `[security] ${event}`,
    JSON.stringify({
      ...getRequestContext(request),
      ...details,
    }),
  );
}

export function logApiError(request, label, error, details = {}) {
  console.error(
    `[api] ${label}`,
    JSON.stringify({
      ...getRequestContext(request),
      ...details,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
}

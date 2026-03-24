import { NextResponse } from "next/server";
import { getRequestIp, logSecurityEvent } from "./requestLogger";

const buckets = new Map();

function getBucketKey(request, scope) {
  return `${scope}:${getRequestIp(request)}`;
}

function cleanupExpiredBuckets(now) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function buildRateLimitHeaders(bucket, limit) {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(Math.max(limit - bucket.count, 0)),
    "X-RateLimit-Reset": String(Math.ceil(bucket.resetAt / 1000)),
  };
}

export function appendRateLimitHeaders(response, rateLimitHeaders) {
  for (const [name, value] of Object.entries(rateLimitHeaders)) {
    response.headers.set(name, value);
  }

  return response;
}

export function applyRateLimit(request, { limit, scope, windowMs }) {
  const now = Date.now();
  cleanupExpiredBuckets(now);

  const bucketKey = getBucketKey(request, scope);
  const existingBucket = buckets.get(bucketKey);
  const bucket =
    existingBucket && existingBucket.resetAt > now
      ? existingBucket
      : {
          count: 0,
          resetAt: now + windowMs,
        };

  bucket.count += 1;
  buckets.set(bucketKey, bucket);

  const headers = buildRateLimitHeaders(bucket, limit);

  if (bucket.count <= limit) {
    return {
      allowed: true,
      headers,
      response: null,
    };
  }

  logSecurityEvent(request, "rate_limit.exceeded", { limit, scope, windowMs });

  const response = NextResponse.json({ error: "Too many requests. Please retry later." }, { status: 429 });
  appendRateLimitHeaders(response, headers);
  response.headers.set("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));

  return {
    allowed: false,
    headers,
    response,
  };
}

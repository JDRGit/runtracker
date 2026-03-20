import { getRequestIp, logSecurityEvent } from "./requestLogger";

const buckets = new Map();

function getBucketKey(req, scope) {
  return `${scope}:${getRequestIp(req)}`;
}

function cleanupExpiredBuckets(now) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function applyRateLimit(req, res, { limit, scope, windowMs }) {
  const now = Date.now();
  cleanupExpiredBuckets(now);

  const bucketKey = getBucketKey(req, scope);
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

  res.setHeader("X-RateLimit-Limit", String(limit));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(limit - bucket.count, 0)));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count <= limit) {
    return true;
  }

  logSecurityEvent(req, "rate_limit.exceeded", { limit, scope, windowMs });
  res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
  res.status(429).json({ error: "Too many requests. Please retry later." });
  return false;
}

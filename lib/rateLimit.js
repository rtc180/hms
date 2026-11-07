// A simple in-memory rate limiter used to slow down password guessing.
// NOTE: memory is per server instance. If you run several servers, use Redis instead.
const buckets = new Map(); // key -> { count, resetAt }

export function rateLimit(key, limit, windowMs) {
  const now = Date.now();

  // Tidy up old entries now and then so the map cannot grow forever
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
  }

  const bucket = buckets.get(key);

  // First request, or the previous window has ended: start a fresh window
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  // Count this request
  bucket.count += 1;

  // Too many requests inside the window
  if (bucket.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true };
}

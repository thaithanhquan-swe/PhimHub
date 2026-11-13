/**
 * In-memory sliding window rate limiter for Express.
 * Protects against DDoS, request flooding, and brute-force attacks.
 */
export function createRateLimiter({
  windowMs = 60 * 1000,
  max = 60,
  message = "Quá nhiều yêu cầu từ địa chỉ IP này. Vui lòng thử lại sau.",
  keyGenerator = (req) => req.ip ?? req.socket.remoteAddress ?? "unknown",
} = {}) {
  const hits = new Map();

  // Periodic cleanup every 5 minutes to prevent memory leak
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return function rateLimiterMiddleware(req, res, next) {
    const key = keyGenerator(req);
    const now = Date.now();

    let record = hits.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      hits.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetSeconds);

    if (record.count > max) {
      res.setHeader("Retry-After", resetSeconds);
      return res.status(429).json({
        message,
        retryAfter: resetSeconds,
      });
    }

    return next();
  };
}

// 1. General API rate limiter: 120 req/min
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: "Tần suất gửi yêu cầu quá cao. Vui lòng thử lại sau ít phút.",
});

// 2. Telemetry rate limiter: 40 req/min (anti-DDoS for telemetry endpoints)
export const telemetryRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 40,
  message: "Hệ thống ghi nhận quá nhiều tín hiệu telemetry từ IP này.",
});

// 3. Auth rate limiter: 5 attempts / 15 minutes (brute-force defense)
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Đã thử đăng nhập sai quá nhiều lần. Vui lòng đợi 15 phút.",
});

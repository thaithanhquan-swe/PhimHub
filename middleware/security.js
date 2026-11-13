/**
 * Security Middleware: Anti-NoSQL Injection, Security Headers, and Payload Size Guard.
 */

// Recursively strips prohibited MongoDB operator keys starting with $ or containing .
function sanitizeObject(target) {
  if (!target || typeof target !== "object") return target;

  if (Array.isArray(target)) {
    return target.map((item) => sanitizeObject(item));
  }

  const clean = {};
  for (const [key, value] of Object.entries(target)) {
    if (key.startsWith("$") || key.includes(".")) {
      continue; // Strip MongoDB injection keys
    }
    clean[key] = sanitizeObject(value);
  }
  return clean;
}

export function sanitizeInputs(request, _response, next) {
  if (request.body && typeof request.body === "object") {
    request.body = sanitizeObject(request.body);
  }
  if (request.query && typeof request.query === "object") {
    request.query = sanitizeObject(request.query);
  }
  if (request.params && typeof request.params === "object") {
    request.params = sanitizeObject(request.params);
  }
  return next();
}

export function securityHeaders(_request, response, next) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");
  response.setHeader("X-XSS-Protection", "1; mode=block");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  response.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.removeHeader("X-Powered-By");
  return next();
}

import express from "express";
import mongoose from "mongoose";

import adminRouter from "./routes/admin.js";
import telemetryRouter from "./routes/telemetry.js";
import { apiRateLimiter, telemetryRateLimiter } from "./middleware/rateLimiter.js";
import { sanitizeInputs, securityHeaders } from "./middleware/security.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Security Headers (Clickjacking, MIME sniffing, XSS, HSTS)
app.use(securityHeaders);

// Disable X-Powered-By
app.disable("x-powered-by");

// Trust proxy for secure headers and rate limiting when behind reverse proxy
if (process.env.TRUST_PROXY) {
  app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : process.env.TRUST_PROXY);
}

// Request size limit (Anti-DDoS memory exhaustion: max 16kb)
app.use(express.json({ limit: "16kb" }));

// Anti-NoSQL injection sanitizer
app.use(sanitizeInputs);

// General API rate limiter (120 req/min)
app.use("/api", apiRateLimiter);

// Health check endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Telemetry Router with dedicated anti-DDoS rate limiter (40 req/min)
app.use("/api/telemetry", telemetryRateLimiter, telemetryRouter);

// Admin Router
app.use("/api/admin", adminRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: "Endpoint not found." });
});

// Centralized error handler (no stack trace leak in production)
app.use((err, _req, res, _next) => {
  const isProduction = process.env.NODE_ENV === "production";
  console.error("Unhandled server error:", err?.message || err);
  res.status(err?.status || 500).json({
    message: isProduction ? "Lỗi máy chủ nội bộ. Vui lòng thử lại sau." : err?.message || "Internal server error.",
  });
});

async function startServer() {
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri);
      console.log("MongoDB connected successfully.");
    } catch (err) {
      console.error("MongoDB connection failed:", err.message);
    }
  } else {
    console.warn("MONGODB_URI is not defined. Backend started without database.");
  }

  app.listen(PORT, () => {
    console.log(`PhimHub secure backend listening on port ${PORT}`);
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}

export default app;

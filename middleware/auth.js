import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import User from "../models/User.js";

export async function authenticateToken(request, response, next) {
  const authorization = request.get("authorization") ?? "";
  const [scheme, token, ...extraParts] = authorization.split(" ");

  if (scheme !== "Bearer" || !token || extraParts.length > 0) {
    return response.status(401).json({ message: "Bearer token is required." });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return response.status(500).json({ message: "Authentication is not configured." });
  }

  let claims;
  try {
    claims = jwt.verify(token, secret, { algorithms: ["HS256"] });
  } catch {
    return response.status(401).json({ message: "Bearer token is invalid or expired." });
  }

  if (
    !claims ||
    typeof claims !== "object" ||
    typeof claims.sub !== "string" ||
    !mongoose.isValidObjectId(claims.sub)
  ) {
    return response.status(401).json({ message: "Bearer token has invalid claims." });
  }

  try {
    const user = await User.findById(claims.sub).select("_id username email role").lean();
    if (!user) {
      return response.status(401).json({ message: "The account for this token no longer exists." });
    }

    request.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

export function authenticateOptional(request, response, next) {
  if (!request.get("authorization")) {
    request.user = null;
    return next();
  }

  return authenticateToken(request, response, next);
}

export function requireAdmin(request, response, next) {
  if (request.user?.role !== "admin") {
    return response.status(403).json({ message: "Administrator access is required." });
  }

  return next();
}

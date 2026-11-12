import { Router } from "express";
import mongoose from "mongoose";

import SearchLog from "../models/SearchLog.js";
import User from "../models/User.js";
import Visitor from "../models/Visitor.js";
import WatchHistory from "../models/WatchHistory.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/visitors", authenticateToken, requireAdmin, async (request, response, next) => {
  const page = Number(request.query.page ?? 1);
  const pageSize = Number(request.query.pageSize ?? 20);
  const query = typeof request.query.q === "string" ? request.query.q.trim().toLowerCase() : "";

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100 ||
    query.length > 64 ||
    (query && !/^[a-f0-9]+$/.test(query))
  ) {
    return response.status(400).json({ message: "Visitor list query parameters are invalid." });
  }

  const filter = query ? { visitorHash: { $regex: `^${query}` } } : {};

  try {
    const [visitors, total] = await Promise.all([
      Visitor.find(filter)
        .sort({ lastSeenAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Visitor.countDocuments(filter),
    ]);

    return response.status(200).json({ visitors, total, page, pageSize });
  } catch (error) {
    return next(error);
  }
});

router.get(
  "/visitors/:visitorHash/details",
  authenticateToken,
  requireAdmin,
  async (request, response, next) => {
    const { visitorHash } = request.params;
    if (!/^[a-f0-9]{64}$/.test(visitorHash)) {
      return response.status(400).json({ message: "Visitor identifier is invalid." });
    }

    try {
      const visitor = await Visitor.findOne({ visitorHash }).lean();
      if (!visitor) {
        return response.status(404).json({ message: "Visitor was not found." });
      }

      const [watchHistory, searchLogs] = await Promise.all([
        WatchHistory.find({ visitorHash }).sort({ timestamp: -1 }).lean(),
        SearchLog.find({ visitorHash }).sort({ timestamp: -1 }).lean(),
      ]);

      return response.status(200).json({ visitor, watchHistory, searchLogs });
    } catch (error) {
      return next(error);
    }
  },
);

router.get("/users", authenticateToken, requireAdmin, async (request, response, next) => {
  const page = Number(request.query.page ?? 1);
  const pageSize = Number(request.query.pageSize ?? 20);
  const query = typeof request.query.q === "string" ? request.query.q.trim() : "";

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100 ||
    query.length > 100
  ) {
    return response.status(400).json({ message: "User list query parameters are invalid." });
  }

  const filter = query
    ? {
        $or: [
          { username: { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
          { email: { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
        ],
      }
    : {};

  try {
    const [users, total] = await Promise.all([
      User.find(filter)
        .select("_id username email role createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      User.countDocuments(filter),
    ]);

    return response.status(200).json({ users, total, page, pageSize });
  } catch (error) {
    return next(error);
  }
});

router.get(
  "/users/:userId/details",
  authenticateToken,
  requireAdmin,
  async (request, response, next) => {
    const { userId } = request.params;

    if (!mongoose.isValidObjectId(userId)) {
      return response.status(400).json({ message: "User ID is invalid." });
    }

    try {
      const user = await User.findById(userId).select("-password -__v").lean();
      if (!user) {
        return response.status(404).json({ message: "User was not found." });
      }

      const [watchHistory, searchLogs] = await Promise.all([
        WatchHistory.find({ userId }).sort({ timestamp: -1 }).lean(),
        SearchLog.find({ userId }).sort({ timestamp: -1 }).lean(),
      ]);

      return response.status(200).json({
        user,
        watchHistory,
        searchLogs,
      });
    } catch (error) {
      return next(error);
    }
  },
);

export default router;

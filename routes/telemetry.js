import { createHmac } from "node:crypto";
import { Router } from "express";

import SearchLog from "../models/SearchLog.js";
import Visitor from "../models/Visitor.js";
import WatchHistory from "../models/WatchHistory.js";
import { authenticateOptional } from "../middleware/auth.js";

const router = Router();

function getTelemetryIdentity(request, response) {
  if (request.user) return { userId: request.user.id };

  const secret = process.env.IP_HASH_SECRET;
  if (!secret || secret.length < 32) {
    response.status(500).json({ message: "Anonymous telemetry is not configured." });
    return null;
  }

  const ipAddress = request.ip ?? request.socket.remoteAddress;
  if (!ipAddress) {
    response.status(400).json({ message: "Client network address is unavailable." });
    return null;
  }

  const normalizedAddress = ipAddress.replace(/^::ffff:/i, "").toLowerCase();
  const visitorHash = createHmac("sha256", secret)
    .update(`phimhub:visitor-ip:v1:${normalizedAddress}`)
    .digest("hex");
  return { visitorHash };
}

async function updateVisitorActivity(visitorHash, activity, timestamp) {
  if (!visitorHash) return;

  await Visitor.findOneAndUpdate(
    { visitorHash },
    {
      $set: { lastSeenAt: timestamp },
      $setOnInsert: { firstSeenAt: timestamp },
      $inc: { [activity]: 1 },
    },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
}

router.post("/watch-progress", authenticateOptional, async (request, response, next) => {
  const { movieId, movieTitle, progress, totalDuration } = request.body ?? {};

  if (
    typeof movieId !== "string" ||
    !movieId.trim() ||
    movieId.trim().length > 200 ||
    typeof movieTitle !== "string" ||
    !movieTitle.trim() ||
    movieTitle.trim().length > 300 ||
    typeof progress !== "number" ||
    !Number.isFinite(progress) ||
    typeof totalDuration !== "number" ||
    !Number.isFinite(totalDuration) ||
    totalDuration <= 0 ||
    totalDuration > 24 * 60 * 60 ||
    progress < 0 ||
    progress > totalDuration
  ) {
    return response.status(400).json({ message: "Watch progress payload is invalid." });
  }

  const identity = getTelemetryIdentity(request, response);
  if (!identity) return;

  try {
    const timestamp = new Date();
    const history = await WatchHistory.findOneAndUpdate(
      { ...identity, movieId: movieId.trim() },
      {
        $set: {
          movieTitle: movieTitle.trim(),
          progress,
          totalDuration,
          timestamp,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    await updateVisitorActivity(identity.visitorHash, "watchEvents", timestamp);

    return response.status(200).json({ watchHistory: history });
  } catch (error) {
    return next(error);
  }
});

router.post("/search-query", authenticateOptional, async (request, response, next) => {
  const query = request.body?.query;

  if (typeof query !== "string" || !query.trim() || query.trim().length > 200) {
    return response.status(400).json({ message: "Search query must contain 1 to 200 characters." });
  }

  const identity = getTelemetryIdentity(request, response);
  if (!identity) return;

  try {
    const timestamp = new Date();
    const searchLog = await SearchLog.create({
      ...identity,
      query: query.trim(),
      timestamp,
    });
    await updateVisitorActivity(identity.visitorHash, "searchEvents", timestamp);

    return response.status(201).json({ searchLog });
  } catch (error) {
    return next(error);
  }
});

export default router;

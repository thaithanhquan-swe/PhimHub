import mongoose from "mongoose";

const watchHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    visitorHash: {
      type: String,
      match: /^[a-f0-9]{64}$/,
      index: true,
    },
    movieId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    movieTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    progress: {
      type: Number,
      required: true,
      min: 0,
    },
    totalDuration: {
      type: Number,
      required: true,
      min: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { versionKey: false },
);

watchHistorySchema.index(
  { userId: 1, movieId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: "objectId" } } },
);
watchHistorySchema.index(
  { visitorHash: 1, movieId: 1 },
  { unique: true, partialFilterExpression: { visitorHash: { $type: "string" } } },
);
watchHistorySchema.index({ userId: 1, timestamp: -1 });
watchHistorySchema.index({ visitorHash: 1, timestamp: -1 });

const WatchHistory =
  mongoose.models.WatchHistory ?? mongoose.model("WatchHistory", watchHistorySchema);

export default WatchHistory;

import mongoose from "mongoose";

const searchLogSchema = new mongoose.Schema(
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
    query: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { versionKey: false },
);

searchLogSchema.index({ userId: 1, timestamp: -1 });
searchLogSchema.index({ visitorHash: 1, timestamp: -1 });

const SearchLog = mongoose.models.SearchLog ?? mongoose.model("SearchLog", searchLogSchema);

export default SearchLog;

import mongoose from "mongoose";

const visitorSchema = new mongoose.Schema(
  {
    visitorHash: {
      type: String,
      required: true,
      unique: true,
      match: /^[a-f0-9]{64}$/,
    },
    firstSeenAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastSeenAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    watchEvents: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    searchEvents: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { versionKey: false },
);

visitorSchema.index({ lastSeenAt: -1 });

const Visitor = mongoose.models.Visitor ?? mongoose.model("Visitor", visitorSchema);

export default Visitor;

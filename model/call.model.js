const mongoose = require("mongoose");

const callSchema = new mongoose.Schema(
  {
    caller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["initiated", "accepted", "ended"], default: "initiated" },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

const Call = mongoose.model("Call", callSchema);

module.exports = Call;

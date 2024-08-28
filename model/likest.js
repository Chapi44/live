const mongoose = require("mongoose");

const LikeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: true,
  },
  story: {
    type: mongoose.Types.ObjectId,
    ref: "Story",
    required: true,
  },
});

module.exports = mongoose.model("Likest", LikeSchema);

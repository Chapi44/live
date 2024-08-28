
const mongoose = require("mongoose");

const LikeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: true,
  },
  stories: {
    type: mongoose.Types.ObjectId,
    ref: "Reel",
    required: true,
  },
  replyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Reel.replies",
    required: true,
  },
});

module.exports = mongoose.model("LikeReel2", LikeSchema);

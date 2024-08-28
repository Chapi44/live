
const mongoose = require("mongoose");

const LikeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: true,
  },
  stories: {
    type: mongoose.Types.ObjectId,
    ref: "Story",
    required: true,
  },
  replyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Story.replies",
    required: true,
  },
});

module.exports = mongoose.model("Like2", LikeSchema);

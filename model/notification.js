const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["follow", "unfollow", "likePost", "replyToPost", "replyToReply", "likeOrUnlikeReply", "likeStory", "replyToStory", "unlikePost"],
    required: true,
  },
  message: { // New field for custom message
    type: String,
    required: true,
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Story",
  },
  seen: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Notification", NotificationSchema);

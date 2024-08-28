const mongoose = require("mongoose");

const StorySchema = new mongoose.Schema(
  {
    images: {
      type: [String],
      default: [],
    },
    seen: {
      type: Boolean,
      default: false,
    },
    user: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    replies: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
      },
    ],
    // expiresAt: {
    //   type: Date,
    //   default: Date.now() + 24 * 60 * 60 * 1000, // Automatically expires after 24 hours
    // },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

StorySchema.virtual("likes", {
  ref: "LikeReel",
  localField: "_id",
  foreignField: "story",
  justOne: false,
});

module.exports = mongoose.model("Story", StorySchema);

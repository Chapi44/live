const mongoose = require("mongoose");

const communityPostSchema = new mongoose.Schema(
    {
        communityId: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true },
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        title: { type: String, required: true },
        text: { type: String },
        img: {
            type: [String],
            default: [],
        },
        seen: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const CommunityPost = mongoose.model("CommunityPost", communityPostSchema);

module.exports = CommunityPost;

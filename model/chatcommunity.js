const mongoose = require("mongoose");

const communityMessageSchema = new mongoose.Schema(
    {
        communityId: { type: mongoose.Schema.Types.ObjectId, ref: "Community" },
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text: String,
        seen: {
            type: Boolean,
            default: false,
        },
        img: {
            type: [String],
            default: "",
        },
    },
    { timestamps: true }
);

const CommunityMessage = mongoose.model("CommunityMessage", communityMessageSchema);

module.exports = CommunityMessage;

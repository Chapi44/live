const mongoose = require("mongoose");

const roomMessageSchema = new mongoose.Schema(
    {
        roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text: String,
        img: {
            type: [String],
            default: "",
        },
    },
    { timestamps: true }
);

const RoomMessage = mongoose.model("RoomMessage", roomMessageSchema);

module.exports = RoomMessage;

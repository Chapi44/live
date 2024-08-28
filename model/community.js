const mongoose = require("mongoose");

const communitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    description: {
        type: String,
    },
    image:{
        type: [String],
        default: '',
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, { timestamps: true });

const Community = mongoose.model("Community", communitySchema);

module.exports = Community;

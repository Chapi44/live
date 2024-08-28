const mongoose = require("mongoose");
const { Schema } = mongoose;

const FollowingSchema = new Schema({
  following: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

module.exports = mongoose.model("Following", FollowingSchema);

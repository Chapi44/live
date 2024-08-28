const mongoose = require("mongoose");
const { Schema } = mongoose;

const FollowerSchema = new Schema({
  follower: {
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

module.exports = mongoose.model("Follower", FollowerSchema);

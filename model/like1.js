const mongoose = require("mongoose");

const LikeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: true,
  },
  product: {
    type: mongoose.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  replyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product.replies",
    required: true,
  },
});

module.exports = mongoose.model("Like1", LikeSchema);

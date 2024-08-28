const mongoose = require("mongoose");

const reelSchema = new mongoose.Schema(
  {
    images: {
      type: [String],
      default: [],
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
				pictures: {
					type:[ String],
				},
				username: {
					type: String,
				},
				likes: [
					{
					  type: mongoose.Schema.Types.ObjectId,
					  ref: "Like2",
					},
				  ],
          replies:[]
			},
		],
		numOfLikes: {
			type: Number,
			default: 0
		  }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

reelSchema.virtual("likes", {
  ref: "Likest",
  localField: "_id",
  foreignField: "story",
  justOne: false,
});

module.exports = mongoose.model("Reel", reelSchema);

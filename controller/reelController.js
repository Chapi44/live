const Story = require("../model/reel");
const Like = require("../model/likeReel");
const { StatusCodes } = require("http-status-codes");
const fs = require('fs');
const CustomError = require("../errors");
const path = require("path");
const baseURL = process.env.BASE_URL;

const createReel = async (req, res) => {
  try {

    const userId = req.userId;

    // Construct image paths with base URL
    const pictures = req.files.map(file => baseURL + "/uploads/reel/"  + file.filename);

    const newStory = await Story.create({
      images: pictures,
      user: userId,
    });

    // Check if userId is missing
    if (!userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "User ID is required" });
    }

    res.status(StatusCodes.CREATED).json({ story: newStory });
  } catch (error) {
    console.error('Error creating Reel:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
};

const getAllreels = async (req, res) => {
  try {
    const stories = await Story.find({})
      .populate({
        path: "user",
        select: "name username pictures"
      })
      .populate({
        path: "likes",
        populate: {
          path: "user",
          select: "username pictures"
        }
      })
      .populate({
        path: "replies",
        populate: {
          path: "user",
          select: "username pictures"
        }
      });

    // Calculate the number of likes and replies for each story
    const storiesWithCounts = stories.map(story => {
      const likesCount = story.likes.length;
      const repliesCount = story.replies.length;

      // Calculate the number of likes for each reply
      const repliesWithCounts = story.replies.map(reply => {
        const replyLikesCount = reply.likes.length;
        return { ...reply.toObject(), likesCount: replyLikesCount };
      });

      return {
        ...story.toObject(),
        likesCount,
        repliesCount,
        replies: repliesWithCounts
      };
    });

    res.status(StatusCodes.OK).json({ stories: storiesWithCounts });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};


const getSingleReel = async (req, res) => {
  try {
    const { id: storyId } = req.params;

    const story = await Story.findOne({ _id: storyId })
      .populate({
        path: "user",
        select: "name username pictures"
      })
      .populate({
        path: "likes",
        populate: {
          path: "user",
          select: "username pictures"
        }
      })
      .populate({
        path: "replies",
        populate: {
          path: "user",
          select: "username pictures"
        }
      });

    if (!story) {
      throw new CustomError.NotFoundError(`No story with id : ${storyId}`);
    }

    // Calculate the number of likes and replies for the single story
    const likesCount = story.likes.length;
    const repliesCount = story.replies.length;

    // Calculate the number of likes for each reply
    const repliesWithCounts = story.replies.map(reply => {
      const replyLikesCount = reply.likes.length;
      return { ...reply.toObject(), likesCount: replyLikesCount };
    });

    const storyWithCounts = {
      ...story.toObject(),
      likesCount,
      repliesCount,
      replies: repliesWithCounts
    };

    res.status(StatusCodes.OK).json({ story: storyWithCounts });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};


const updateReelById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    let updatedStory = await Story.findById(id);

    if (!updatedStory) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Reel not found" });
    }
    if (updatedStory.user.toString() !== userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "You are not authorized to update this story" });
    }
    // Update story properties if available
    if (req.body.images) {
      // Delete previous images if available
      if (updatedStory.images && updatedStory.images.length > 0) {
        updatedStory.images.forEach((image) => {
          const filename = image.split("/").pop();
          const imagePath = path.join(__dirname, "..", "uploads", "reel", filename);
          try {
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);
              console.log(`Deleted previous image: ${imagePath}`);
            } else {
              console.log(`Previous image not found: ${imagePath}`);
            }
          } catch (error) {
            console.error(`Error deleting previous image: ${imagePath}`, error);
          }
        });
      }

      // Save new images
      updatedStory.images = req.body.images.map(filename => baseURL + '/uploads/reel/' + filename);
    }

    // Handle image update if available
    if (req.files && req.files.length > 0) {
      // Delete previous images if available
      if (updatedStory.images && updatedStory.images.length > 0) {
        updatedStory.images.forEach((image) => {
          const filename = image.split("/").pop();
          const imagePath = path.join(__dirname, "..", "uploads", "reel", filename);
          try {
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);
              console.log(`Deleted previous image: ${imagePath}`);
            } else {
              console.log(`Previous image not found: ${imagePath}`);
            }
          } catch (error) {
            console.error(`Error deleting previous image: ${imagePath}`, error);
          }
        });
      }

      // Save new images
      updatedStory.images = req.files.map((file) => baseURL + '/uploads/reel/' + file.filename);
    }

    await updatedStory.save();

    res.status(StatusCodes.OK).json({ message: "Reel updated successfully", story: updatedStory });
  } catch (error) {
    console.error("Error updating story by ID:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

// Controller for deleting reel by ID
const deleteReelById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const deletedStory = await Story.findByIdAndDelete(id);

    if (!deletedStory) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Story not found" });
    }
    if (deletedStory.user.toString() !== userId) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "You are not allowed to delete this story", isCreator: false });
    }

    // Delete story images if available
    if (deletedStory.images && deletedStory.images.length > 0) {
      deletedStory.images.forEach((image) => {
        const filename = image.split("/").pop();
        const imagePath = path.join(__dirname, "..", "uploads", "reel", filename);
        try {
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log(`Deleted image: ${imagePath}`);
          } else {
            console.log(`Image not found: ${imagePath}`);
          }
        } catch (error) {
          console.error(`Error deleting image: ${imagePath}`, error);
        }
      });
    }

    res.status(StatusCodes.OK).json({ message: "Reel deleted successfully", isCreator: true });
  } catch (error) {
    console.error("Error deleting story by ID:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


const likeReel = async (req, res) => {
  try {
    const { id: storyId } = req.params;
    const userId = req.userId;

    // Check if the user has already liked the reel
    const existingLike = await Like.findOne({
      user: userId,
      story: storyId,
    });

    let totalLikes;

    if (existingLike) {
      // User has already liked the reel, so unlike it
      await Like.deleteOne({
        user: userId,
        story: storyId,
      });

      // Decrement the like count in the Story model
      const story = await Story.findByIdAndUpdate(
        storyId,
        { $inc: { numOfLikes: -1 } },
        { new: true }
      );

      if (!story) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: "Reel not found" });
      }

      // Ensure totalLikes is positive
      totalLikes = Math.max(0, story.numOfLikes);

      res
        .status(StatusCodes.OK)
        .json({ message: "Reel unliked successfully", numOfLikes: totalLikes });
    } else {
      // User hasn't liked the reel, so like it
      const like = new Like({ user: userId, story: storyId });
      await like.save();

      // Increment the like count in the Story model
      const story = await Story.findByIdAndUpdate(
        storyId,
        { $inc: { numOfLikes: 1 } },
        { new: true }
      );

      if (!story) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: "Reel not found" });
      }

      // Ensure totalLikes is positive
      totalLikes = Math.max(1, story.numOfLikes);

      res
        .status(StatusCodes.OK)
        .json({ message: "Reel liked successfully", numOfLikes: totalLikes });
    }
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};




const replyToreel = async (req, res) => {
  try {
    const { text } = req.body;
    const reelId = req.params.id;
    const userId = req.userId;
    const pictures = req.user.pictures;
    const username = req.user.username;

    if (!text) {
      return res.status(400).json({ error: "Text field is required" });
    }

    const reel = await Story.findById(reelId);
    if (!reel) {
      return res.status(404).json({ error: "Reel not found" });
    }

    // Create a reply object
    const reply = { userId, text, pictures, username };

    // Push the reply to the reel's replies array
    reel.replies.push(reply);

    // Save the updated reel
    await reel.save();

    res.status(200).json(reply);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const replyToReply = async (req, res) => {
  try {
    const { text, replyId, reelId } = req.body;
    const userId = req.userId;
    const pictures = req.user.pictures;
    const username = req.user.username;

    if (!text || !reelId) {
      return res.status(400).json({ error: "Text and reelId fields are required" });
    }

    const reel = await Story.findById(reelId);
    if (!reel) {
      return res.status(404).json({ error: "Reel not found" });
    }

    const parentReply = reel.replies.find(reply => reply._id.toString() === replyId);
    if (!parentReply) {
      return res.status(404).json({ error: "Parent reply not found" });
    }

    // Create a reply object
    const reply = { userId, text, pictures, username, replies: [] };

    // Push the reply to the parent reply's nested replies array
    parentReply.replies.push(reply);

    // Save the updated reel
    await reel.save();

    res.status(200).json(reply);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const likeOrUnlikeReply = async (req, res) => {
  try {
    const { reelId, replyId } = req.params;
    const userId = req.userId;

    // Find the reel by its ID
    const reel = await Story.findById(reelId);
    if (!reel) {
      throw new CustomError.NotFoundError('Reel not found');
    }

    // Find the reply within the reel's replies array
    const replyIndex = reel.replies.findIndex(reply => reply._id.toString() === replyId);
    if (replyIndex === -1) {
      throw new CustomError.NotFoundError('Reply not found');
    }

    const reply = reel.replies[replyIndex];

    // Check if the user has already liked the reply
    const existingLikeIndex = reply.likes.findIndex(like => like.toString() === userId);
    const userLikedReply = existingLikeIndex !== -1;

    if (userLikedReply) {
      // User has already liked the reply, so unlike it
      reply.likes.splice(existingLikeIndex, 1);
      await reel.save();

      // Calculate total number of likes for the reply
      const totalLikes = reply.likes.length;

      res.status(StatusCodes.OK).json({ message: 'Reply unliked successfully', totalLikes });
    } else {
      // User hasn't liked the reply, so like it
      reply.likes.push(userId);
      await reel.save();

      // Calculate total number of likes for the reply
      const totalLikes = reply.likes.length;

      res.status(StatusCodes.OK).json({ message: 'Reply liked successfully', totalLikes });
    }
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

const getSreelByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find all stories created by the user
    const userStories = await Story.find({ user: userId })
      .populate({
        path: "user",
        select: "name username pictures followers following name" // Include followers and following fields
      });

    // Check if any stories are found
    if (!userStories || userStories.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "No stories found for this user" });
    }

    res.status(StatusCodes.OK).json({ userStories });
  } catch (error) {
    console.error("Error fetching stories by user ID:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


  
module.exports = {
  createReel,
  getAllreels,
  getSingleReel,
  updateReelById,
  deleteReelById,
  likeReel,
  // replyToReel,
   likeOrUnlikeReply,
   replyToReply,
   replyToreel,
  getSreelByUserId

};

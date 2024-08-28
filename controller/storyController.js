const Story = require("../model/story");
const Like = require("../model/likest");
const User = require("../model/user");
const { StatusCodes } = require("http-status-codes");
const fs = require('fs');
const CustomError = require("../errors");
const path = require("path");
const Notification = require("../model/notification");
const baseURL = process.env.BASE_URL;
// const cron = require("node-cron");
const { getRecipientSocketId, io } = require("../socket/socket.js");

const createStory = async (req, res) => {
  try {
    const userId = req.userId;

    // Construct image paths with base URL
    const pictures = req.files.map(file => baseURL + "/uploads/stories/"  + file.filename);

    // Check if the user has an existing story
    const existingStory = await Story.findOne({ user: userId });

    if (existingStory) {
      // If the user has an existing story, update it by adding the new images
      existingStory.images.push(...pictures);
      await existingStory.save();
      return res.status(StatusCodes.OK).json({ message: "Story updated successfully", story: existingStory });
    } else {
      // If the user doesn't have an existing story, create a new story
      const newStory = await Story.create({
        images: pictures,
        user: userId,
      });
      return res.status(StatusCodes.CREATED).json({ message: "Story created successfully", story: newStory });
    }
  } catch (error) {
    console.error('Error creating/updating story:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
};

const getAllStories = async (req, res) => {
  try {
    const userId = req.userId; // Extract user ID from the request
    let stories;

    // Check if userId is provided to determine the sorting criteria
    if (userId) {
      // Fetch stories sorted by 'seen' field (false first)
      stories = await Story.find({})
        .sort({ seen: 1, createdAt: -1 }) // Sort by 'seen' in ascending order and 'createdAt' in descending order
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
        .lean(); // Convert Mongoose documents to plain JavaScript objects
    } else {
      // Fetch stories sorted only by 'createdAt' in descending order (latest stories first)
      stories = await Story.find({})
        .sort({ createdAt: -1 }) // Sort by 'createdAt' in descending order
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
        .lean(); // Convert Mongoose documents to plain JavaScript objects
    }

    // Filter out stories created by the user
    if (userId) {
      stories = stories.filter(story => story.user._id.toString() !== req.userId);
    }

    // Calculate the number of likes and replies for each story
    stories.forEach(story => {
      story.likesCount = story.likes.length;
      story.repliesCount = story.replies.length;
    });

    res.status(StatusCodes.OK).json({ stories });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};
const getSingleStory = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the story by its ID
    const story = await Story.findById(id)
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
      .lean();

    if (!story) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Story not found" });
    }

    // Calculate the number of likes and replies for the story
    story.likesCount = story.likes.length;
    story.repliesCount = story.replies.length;

    // Update 'seen' field to mark story as seen
    await Story.findByIdAndUpdate(id, { seen: true });

    res.status(StatusCodes.OK).json({ story });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};


const markStoryAsSeen = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Find the story by its ID and ensure it belongs to the user
    const story = await Story.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: { seen: true } },
      { new: true }
    );

    if (!story) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Story not found or does not belong to the user" });
    }

    res.status(StatusCodes.OK).json({ message: "Story marked as seen" });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};





const updateStoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    let updatedStory = await Story.findById(id);

    if (!updatedStory) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Story not found" });
    }

    // Check if the user is authorized to update the story
    if (updatedStory.user.toString() !== userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "You are not authorized to update this story" });
    }

    // Update story properties if available
    if (req.body.images) {
      // Delete previous images if available
      if (updatedStory.images && updatedStory.images.length > 0) {
        updatedStory.images.forEach((image) => {
          const filename = image.split("/").pop();
          const imagePath = path.join(__dirname, "..", "uploads", "stories", filename);
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
      updatedStory.images = req.body.images.map(filename => baseURL + '/uploads/stories/' + filename);
    }

    // Handle image update if available
    if (req.files && req.files.length > 0) {
      // Delete previous images if available
      if (updatedStory.images && updatedStory.images.length > 0) {
        updatedStory.images.forEach((image) => {
          const filename = image.split("/").pop();
          const imagePath = path.join(__dirname, "..", "uploads", "stories", filename);
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
      updatedStory.images = req.files.map((file) => baseURL + '/uploads/stories/' + file.filename);
    }

    await updatedStory.save();

    res.status(StatusCodes.OK).json({ message: "Story updated successfully", story: updatedStory });
  } catch (error) {
    console.error("Error updating story by ID:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


const deleteStoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId; // Extract user ID from the request

    // Find the story by ID
    const deletedStory = await Story.findById(id);

    // Check if the story exists
    if (!deletedStory) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Story not found" });
    }

    // Check if the user is the creator of the story
    if (deletedStory.user.toString() !== userId) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "You are not allowed to delete this story" });
    }

    // Delete the story
    await Story.findByIdAndDelete(id);

    // Delete story images if available
    if (deletedStory.images && deletedStory.images.length > 0) {
      deletedStory.images.forEach((image) => {
        const filename = image.split("/").pop();
        const imagePath = path.join(__dirname, "..", "uploads", "stories", filename);
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

    // Remove the deleted story from the user's stories array
    await User.findByIdAndUpdate(userId, { $pull: { stories: id } });

    res.status(StatusCodes.OK).json({ message: "Story deleted successfully" });
  } catch (error) {
    console.error("Error deleting story by ID:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};



// Function to delete expired stories
// const deleteExpiredStories = async () => {
//   try {
//     await Story.deleteMany({ expiresAt: { $lte: new Date() } });
//     console.log("Expired stories deleted successfully");
//   } catch (error) {
//     console.error("Error deleting expired stories:", error);
//   }
// };

// // Schedule the job to delete expired stories every 24 hours
// cron.schedule("0 0 * * *", deleteExpiredStories);

const likeStory = async (req, res) => {
  try {
      const { id: storyId } = req.params;
      const userId = req.userId;

      // Check if the user has already liked the story
      const existingLike = await Like.findOne({
          user: userId,
          story: storyId,
      });

      let totalLikes;

      if (existingLike) {
          // User has already liked the story, so unlike it
          await Like.deleteOne({
              user: userId,
              story: storyId,
          });

          // Decrement the like count in the Story model
          const story = await Story.findByIdAndUpdate(
              storyId,
              { $pull: { likes: existingLike._id } }, // Remove the like from the story's likes array
              { new: true }
          ).populate('likes'); // Populate the 'likes' field

          totalLikes = story.likes.length;

          res.status(StatusCodes.OK).json({ message: "Story unliked successfully", totalLikes });

          // Create notification for unliking story
          await Notification.create({
              sender: userId,
              receiver: story.user,
              type: "likeStory",
              storyId: story._id
          });
      } else {
          // User hasn't liked the story, so like it
          const like = new Like({ user: userId, story: storyId });
          await like.save();

          // Update the story's likes array
          const story = await Story.findByIdAndUpdate(
              storyId,
              { $push: { likes: like._id } }, // Add the like to the story's likes array
              { new: true }
          ).populate('likes'); // Populate the 'likes' field

          totalLikes = story.likes.length;

          res.status(StatusCodes.OK).json({ message: "Story liked successfully", totalLikes });

          // Create notification for liking story
          await Notification.create({
              sender: userId,
              receiver: story.user,
              type: "likeStory",
              storyId: story._id
          });
      }
  } catch (error) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

// const replyToStory = async (req, res) => {
//   try {
//       const { text } = req.body;
//       const storyId = req.params.id;
//       const userId = req.userId;
//       const pictures = req.user.pictures;
//       const username = req.user.username;

//       if (!text) {
//           return res.status(StatusCodes.BAD_REQUEST).json({ error: "Text field is required" });
//       }

//       const story = await Story.findById(storyId);
//       if (!story) {
//           return res.status(StatusCodes.NOT_FOUND).json({ error: "Story not found" });
//       }

//       const reply = { userId, text, pictures, username };

//       story.replies.push(reply);
//       await story.save();

//       res.status(StatusCodes.OK).json(reply);

//       // Create notification for replying to story
//       await Notification.create({
//           sender: userId,
//           receiver: story.user,
//           type: "replyToStory",
//           storyId: story._id
//       });
//   } catch (err) {
//       console.error("Error replying to story:", err);
//       res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
//   }
// };

const replyToStory = async (req, res) => {
  try {
      const { text } = req.body;
      const storyId = req.params.id;
      const userId = req.userId;
      const user = req.user;
      
      if (!text) {
          return res.status(StatusCodes.BAD_REQUEST).json({ error: "Text field is required" });
      }

      const story = await Story.findById(storyId);
      if (!story) {
          return res.status(StatusCodes.NOT_FOUND).json({ error: "Story not found" });
      }

      const reply = { userId, text, pictures: user.pictures, username: user.username };
      
      story.replies.push(reply);
      await story.save();

      // Emit reply to the story owner via Socket.IO
      const recipientSocketId = getRecipientSocketId(story.user);
      if (recipientSocketId) {
          io.to(recipientSocketId).emit("newReply", reply);
      }

      res.status(StatusCodes.OK).json(reply);

      // Create notification for replying to story
      await Notification.create({
          sender: userId,
          receiver: story.user,
          type: "replyToStory",
          storyId: story._id
      });
  } catch (err) {
      console.error("Error replying to story:", err);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


const getStoryByUserId = async (req, res) => {
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
  createStory,
  getAllStories,
  getSingleStory,
  updateStoryById,
   deleteStoryById,
  likeStory,
  replyToStory,
  getStoryByUserId,
  markStoryAsSeen

};

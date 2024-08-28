const Product = require("../model/post");
const Like = require("../model/like");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const path = require("path");
const fs = require('fs')
const baseURL = process.env.BASE_URL;
const Notification = require("../model/notification");
const { io, getRecipientSocketId } = require("../socket/socket");
const User = require("../model/user");



const createposts = async (req, res) => {
  try {
    const { name, description,catagory} = req.body;

    // Construct image paths with base URL
    const pictures = req.files.map(file => baseURL + "/uploads/posts/" + file.filename);

    // Use req.userId obtained from the decoded token
    const userId = req.userId;
    console.log(userId);

    const newPost = await Product.create({
      name,
      catagory,
      description,
      images: pictures,
      user: userId, // Assign userId to the user field
    
    });

    // Check if userId is missing
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    res.status(StatusCodes.CREATED).json({ post: newPost });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
};


const getAllposts = async (req, res) => {
  try {
    const products = await Product.find({}).sort({  createdAt: -1 }) 
      .populate({
        path: "user",
        select: "name username pictures" // Specify the fields you want to include
      })
      .populate({ 
        path: "likes", 
        populate: { 
          path: "user", 
          select: "username pictures" // Include username and pictures of the user who liked
        } 
      })
      .lean(); // Convert Mongoose documents to plain JavaScript objects

    // Calculate the number of replies and likes for each post
    products.forEach(post => {
      post.repliesCount = post.replies.length;
      post.likesCount = post.likes.length;

      // Calculate the number of likes for each reply
      post.replies.forEach(reply => {
        reply.likesCount = reply.likes.length;
      });
    });

    res.status(StatusCodes.OK).json({ products });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

const getSinglepost = async (req, res) => {
  try {
    const { id: productId } = req.params;

    const product = await Product.findOne({ _id: productId })
      .populate({
        path: "user",
        select: "name username pictures" // Specify the fields you want to include
      })
      .populate({ 
        path: "likes", 
        populate: { 
          path: "user", 
          select: "username pictures" // Include username and pictures of the user who liked
        } 
      })
      .lean(); // Convert Mongoose document to plain JavaScript object

    if (!product) {
      throw new CustomError.NotFoundError(`No product with id : ${productId}`);
    }

    // Calculate the number of replies and likes for the single post
    product.repliesCount = product.replies.length;
    product.likesCount = product.likes.length;

    // Calculate the number of likes for each reply
    product.replies.forEach(reply => {
      reply.likesCount = reply.likes.length;
    });

    res.status(StatusCodes.OK).json({ product });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};



const updatepostbyid = async (req, res) => {
  try {
    const { id: productId } = req.params;

    // Find the post by ID
    const updatedPost = await Product.findById(productId);

    if (!updatedPost) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Post not found" });
    }

    // Ensure that the user is the creator of the post
    if (updatedPost.user.toString() !== req.userId) {
      console.log(req.userId);
      return res.status(StatusCodes.FORBIDDEN).json({ error: "You are not authorized to update this post" });
    }

    // Update post properties if available
    if (req.body.name) {
      updatedPost.name = req.body.name;
    }
    if (req.body.description) {
      updatedPost.description = req.body.description;
    }
    if (req.body.category) {
      updatedPost.category = req.body.category;
    }

    // Handle image update if available
    if (req.files && req.files.length > 0) {
      // Delete previous images
      if (updatedPost.images && updatedPost.images.length > 0) {
        updatedPost.images.forEach((image) => {
          // Extract filename from the URL
          const filename = image.split("/").pop();
          const imagePath = path.join(__dirname, "..", "uploads", "posts", filename);
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
      updatedPost.images = req.files.map((file) => baseURL + "/uploads/posts/" + file.filename);
    }

    // Save the updated post
    await updatedPost.save();

    res.status(StatusCodes.OK).json({ message: "Post updated successfully", post: updatedPost });
  } catch (error) {
    console.error("Error updating post by ID:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const deletepostbyid = async (req, res) => {
  const productId = req.params.id;
  const userId = req.userId;

  try {
    // Find the product by ID
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Product not found" });
    }

    // Check if the user is the author of the post
    const isCreator = product.user.toString() === userId;

    if (!isCreator) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "You are not allowed to delete this post", isCreator: isCreator });
    }

    // Delete the post
    const result = await Product.deleteOne({ _id: productId });

    if (result.deletedCount === 0) {
      throw new CustomError.NotFoundError(`No product with id : ${productId}`);
    }

    res.status(StatusCodes.OK).json({ msg: "Success! Post is removed.", isCreator: isCreator });
  } catch (error) {
    console.error("Error deleting post by ID:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


const likeProduct = async (req, res) => {
  try {
    const { id: productId } = req.params;
    const userId = req.userId;

    const currentUser = await User.findById(userId); // Fetch the current user

    const existingLike = await Like.findOne({ user: userId, product: productId });

    let totalLikes;

    if (existingLike) {
      await Like.deleteOne({ user: userId, product: productId });

      const product = await Product.findByIdAndUpdate(productId, { $inc: { numOfLikes: -1 } }, { new: true });

      if (!product) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: "Product not found" });
      }

      totalLikes = Math.max(0, product.numOfLikes);

      const unlikeNotification = await Notification.create({
        sender: userId,
        receiver: product.user,
        type: "unlikePost",
        postId: productId,
        message: `${currentUser.username} unliked your post`,
      });

      const recipientSocketId = getRecipientSocketId(product.user);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("newNotification", unlikeNotification);
      }

      res.status(StatusCodes.OK).json({ message: "Post unliked successfully", numOfLikes: totalLikes });
    } else {
      const like = new Like({ user: userId, product: productId });
      await like.save();

      const product = await Product.findByIdAndUpdate(productId, { $inc: { numOfLikes: 1 } }, { new: true });

      if (!product) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: "Product not found" });
      }

      totalLikes = Math.max(0, product.numOfLikes);

      const likeNotification = await Notification.create({
        sender: userId,
        receiver: product.user,
        type: "likePost",
        postId: productId,
        message: `${currentUser.username} liked your post`,
      });

      const recipientSocketId = getRecipientSocketId(product.user);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("newNotification", likeNotification);
      }

      res.status(StatusCodes.OK).json({ message: "Post liked successfully", numOfLikes: totalLikes });
    }
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};


const replyToPost = async (req, res) => {
  try {
    const { text } = req.body;
    const postId = req.params.id;
    const userId = req.userId;

    if (!text) {
      return res.status(400).json({ error: "Text field is required" });
    }

    const post = await Product.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const currentUser = await User.findById(userId);

    // Create a reply object
    const reply = { userId, text, pictures: currentUser.pictures, username: currentUser.username };

    // Add the new reply to the beginning of the post's replies array
    post.replies.unshift(reply);

    // Save the updated post
    await post.save();

    const notification = await Notification.create({
      sender: userId,
      receiver: post.user,
      type: "replyToPost",
      postId,
      message: `${currentUser.username} replied to your post`,
    });

    const recipientSocketId = getRecipientSocketId(post.user);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("newNotification", notification);
    }

    // Get the updated post with replies
    const updatedPost = await Product.findById(postId).populate('replies.userId', 'username');

    // Extract only replies from the updated post
    const replies = updatedPost.replies;

    res.status(200).json({ replies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const replyToReply = async (req, res) => {
  try {
    const { text, replyId, postId } = req.body;
    const userId = req.userId;

    if (!text || !postId) {
      return res.status(400).json({ error: "Text and postId fields are required" });
    }

    const post = await Product.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const parentReply = post.replies.find(reply => reply._id.toString() === replyId);
    if (!parentReply) {
      return res.status(404).json({ error: "Parent reply not found" });
    }

    const currentUser = await User.findById(userId);

    // Create a reply object
    const reply = { userId, text, pictures: currentUser.pictures, username: currentUser.username, replies: [] };

    // Add the new reply to the beginning of the parent reply's nested replies array
    parentReply.replies.unshift(reply);

    // Save the updated post
    await post.save();

    const notification = await Notification.create({
      sender: userId,
      receiver: parentReply.userId,
      type: "replyToReply",
      postId,
      message: `${currentUser.username} replied to your comment`,
    });

    const recipientSocketId = getRecipientSocketId(parentReply.userId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("newNotification", notification);
    }

    // Get the updated post with replies
    const updatedPost = await Product.findById(postId).populate('replies.userId', 'username');

    // Respond with all replies related to the postId
    const allReplies = getAllReplies(updatedPost.replies);

    res.status(200).json({ replies: allReplies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Helper function to get all replies recursively
function getAllReplies(replies) {
  let allReplies = [];
  replies.forEach(reply => {
    allReplies.push({
      userId: { _id: reply.userId._id, username: reply.userId.username },
      text: reply.text,
      pictures: reply.pictures,
      username: reply.username,
      likes: reply.likes,
      replies: getAllReplies(reply.replies),
      _id: reply._id,
      id: reply._id // Assuming you need an "id" field same as "_id"
    });
  });
  return allReplies;
}

const likeOrUnlikeReply = async (req, res) => {
  try {
    const { productId, replyId } = req.params;
    const userId = req.userId;

    // Find the product by its ID
    const product = await Product.findById(productId);
    if (!product) {
      throw new CustomError.NotFoundError('Product not found');
    }

    // Find the reply within the product's replies array
    const replyIndex = product.replies.findIndex(reply => reply._id.toString() === replyId);
    if (replyIndex === -1) {
      throw new CustomError.NotFoundError('Reply not found');
    }

    const reply = product.replies[replyIndex];

    // Check if the user has already liked the reply
    const existingLikeIndex = reply.likes.findIndex(like => like.toString() === userId);
    const userLikedReply = existingLikeIndex !== -1;

    if (userLikedReply) {
      // User has already liked the reply, so unlike it
      reply.likes.splice(existingLikeIndex, 1);
      await product.save();
    } else {
      // User hasn't liked the reply, so like it
      if (!reply.likes) {
        reply.likes = [];
      }
      reply.likes.push(userId);
      await product.save();
    }

    // Get the updated product with all replies
    const updatedProduct = await Product.findById(productId).populate('replies.userId', 'username');

    // Respond with all replies related to the productId
    const allReplies = getAllReplies(updatedProduct.replies);

    res.status(StatusCodes.OK).json({ replies: allReplies });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

// Helper function to get all replies recursively
function getAllReplies(replies) {
  let allReplies = [];
  replies.forEach(reply => {
    const totalLikes = reply.likes ? reply.likes.length : 0; // Ensure reply.likes is initialized
    allReplies.push({
      userId: { _id: reply.userId._id, username: reply.userId.username },
      text: reply.text,
      pictures: reply.pictures,
      username: reply.username,
      likes: reply.likes,
      totalLikes: totalLikes,
      replies: getAllReplies(reply.replies),
      _id: reply._id,
      id: reply._id // Assuming you need an "id" field same as "_id"
    });
  });
  return allReplies;
}



// Helper function to get all replies recursively
// function getAllReplies(replies) {
//   let allReplies = [];
//   replies.forEach(reply => {
//     allReplies.push({
//       userId: { _id: reply.userId._id, username: reply.userId.username },
//       text: reply.text,
//       pictures: reply.pictures,
//       username: reply.username,
//       likes: reply.likes,
//       replies: getAllReplies(reply.replies),
//       _id: reply._id,
//       id: reply._id // Assuming you need an "id" field same as "_id"
//     });
//   });
//   return allReplies;
// }


const getPostsByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find all posts created by the user with image types other than MP4
    const userPosts = await Product.find({ 
      user: userId,
      "images": { $not: /\.mp4$/i } // Exclude posts with image types other than MP4
    })
      .populate({
        path: "user",
        select: "name username pictures followers following name" // Include username, pictures, followers, and following fields
      });

    // Check if any posts are found
    if (!userPosts || userPosts.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "No posts found for this user" });
    }

    res.status(StatusCodes.OK).json({ userPosts });
  } catch (error) {
    console.error("Error fetching posts by user ID:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


const getAllMp4Posts = async (req, res) => {
  try {
    // Find all posts with images ending with ".mp4"
    const mp4Posts = await Product.find({ "images": { $regex: /\.mp4$/i } })
      .populate({
        path: "user",
        select: "name username pictures" // Specify the fields you want to include
      })
      .populate({
        path: "likes",
        populate: {
          path: "user",
          select: "username pictures" // Include username and pictures of the user who liked
        }
      })
      .lean(); // Convert Mongoose documents to plain JavaScript objects

    // Check if any mp4 posts are found
    if (!mp4Posts || mp4Posts.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "No mp4 posts found" });
    }

    // Calculate the number of replies and likes for each mp4 post
    mp4Posts.forEach(post => {
      post.repliesCount = post.replies.length;
      post.likesCount = post.likes.length;

      // Calculate the number of likes for each reply
      post.replies.forEach(reply => {
        reply.likesCount = reply.likes.length;
      });
    });

    res.status(StatusCodes.OK).json({ mp4Posts });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};



const getPostsMp4ByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find all posts created by the user with images ending with ".mp4"
    const userMp4Posts = await Product.find({ user: userId, "images": { $regex: /\.mp4$/i } })
      .populate({
        path: "user",
        select: "name username pictures followers following name" // Include username, pictures, followers, and following fields
      });

    // Check if any mp4 posts are found
    if (!userMp4Posts || userMp4Posts.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "No mp4 posts found for this user" });
    }

    res.status(StatusCodes.OK).json({ userMp4Posts });
  } catch (error) {
    console.error("Error fetching mp4 posts by user ID:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


module.exports = {
  createposts,
  getAllposts,
  getSinglepost,
  updatepostbyid,
  deletepostbyid,
  likeProduct,
  replyToPost,
  likeOrUnlikeReply,
  getPostsByUserId,
  replyToReply,
  getAllMp4Posts,
  getPostsMp4ByUserId

};


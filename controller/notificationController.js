const Notification = require("../model/notification");
const { StatusCodes } = require("http-status-codes");

const getNotifications = async (req, res) => {
    try {
        const userId = req.userId;

        // Find notifications for the user
        const notifications = await Notification.find({ receiver: userId })
            .populate({
                path: 'sender',
                select: 'username pictures', // Include username and pictures fields
            })
            .populate('postId', 'name') // Assuming postId is for Product
            .populate('storyId', 'title') // Assuming storyId is for Story
            .sort({ createdAt: -1 });

        res.status(StatusCodes.OK).json({ notifications });
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
};



const markAsRead = async (req, res) => {
    try {
        const { id: notificationId } = req.params;
        const userId = req.userId;

        // Find the notification by ID and ensure it belongs to the user
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, receiver: userId },
            { $set: { seen: true } },
            { new: true }
        );

        if (!notification) {
            return res.status(StatusCodes.NOT_FOUND).json({ error: "Notification not found or does not belong to the user" });
        }

        res.status(StatusCodes.OK).json({ message: "Notification marked as read" });
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
};

module.exports = {
    getNotifications,
    markAsRead
};

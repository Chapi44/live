const Conversation = require("../model/conversation.model.js");
const User = require("../model/user");

const Message = require("../model/message.model.js");
const { getRecipientSocketId, io } = require("../socket/socket.js");
const { StatusCodes } = require("http-status-codes");
// const { cloudinary } = require("../config/cloudinary");

const baseURL = process.env.BASE_URL;


async function sendMessage(req, res) {
    try {
        const { recipientId, message } = req.body;
        const senderId = req.userId;

        let pictures = [];
        if (req.files) {
            pictures = req.files.map(file => baseURL + "/uploads/messages/" + file.filename);
        }

        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, recipientId] },
        });

        if (!conversation) {
            conversation = new Conversation({
                participants: [senderId, recipientId],
                lastMessage: {
                    text: message,
                    sender: senderId,
                },
            });
            await conversation.save();
        }

        const newMessage = new Message({
            conversationId: conversation._id,
            sender: senderId,
            text: message,
            img: pictures || "",
        });

        await Promise.all([
            newMessage.save(),
            conversation.updateOne({
                lastMessage: {
                    text: message,
                    sender: senderId,
                },
            }),
        ]);

        const senderData = await User.findById(senderId, 'name username pictures');

        const isSenderLoggedInUser = true; // Assuming sender is always logged in when sending a message

        const transformedMessage = {
            _id: newMessage._id,
            conversationId: newMessage.conversationId,
            text: newMessage.text,
            seen: newMessage.seen,
            img: newMessage.img,
            createdAt: newMessage.createdAt,
            updatedAt: newMessage.updatedAt,
            __v: newMessage.__v,
            isSenderLoggedInUser,
            senderowner: {
                _id: senderData._id,
                name: senderData.name,
                username: senderData.username,
                pictures: senderData.pictures
            }
        };

        // Emit new message to recipient
        const recipientSocketId = getRecipientSocketId(recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit("newMessage", transformedMessage);
        }

        res.status(StatusCodes.CREATED).json(transformedMessage);
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
}


// async function sendMessage(req, res) {
//     try {
//         const { recipientId, message } = req.body;
//         const senderId = req.userId;
        
//         let pictures = [];
//         if (req.files) {
//             pictures = req.files.map(file => baseURL + "/uploads/messages/" + file.filename);
//         }

//         let conversation = await Conversation.findOne({
//             participants: { $all: [senderId, recipientId] },
//         });

//         if (!conversation) {
//             conversation = new Conversation({
//                 participants: [senderId, recipientId],
//                 lastMessage: {
//                     text: message,
//                     sender: senderId,
//                 },
//             });
//             await conversation.save();
//         }

//         const newMessage = new Message({
//             conversationId: conversation._id,
//             sender: senderId,
//             text: message,
//             img: pictures || "",
//         });

//         await Promise.all([
//             newMessage.save(),
//             conversation.updateOne({
//                 lastMessage: {
//                     text: message,
//                     sender: senderId,
//                 },
//             }),
//         ]);

//         const recipientSocketId = getRecipientSocketId(recipientId);
//         if (recipientSocketId) {
//             io.to(recipientSocketId).emit("newMessage", newMessage);
//         }

//         res.status(201).json(newMessage);
//     } catch (error) {
//         console.error("Error sending message:", error);
//         res.status(500).json({ error: error.message });
//     }
// }




// async function getMessages(req, res) {
// 	const { otherUserId } = req.params;
// 	const userId = req.userId;
// 	console.log(userId);
// 	try {
// 		const conversation = await Conversation.findOne({
// 			participants: { $all: [userId, otherUserId] },
// 		});

// 		if (!conversation) {
// 			return res.status(404).json({ error: "Conversation not found" });
// 		}

// 		const messages = await Message.find({
// 			conversationId: conversation._id,
// 		})
// 		.populate({
// 			path: 'sender',
// 			select: 'username pictures name'
// 		})
// 		.sort({ createdAt: -1 });

// 		res.status(200).json(messages);
// 	} catch (error) {
// 		res.status(500).json({ error: error.message });
// 	}
// }


async function getMessages(req, res) {
    const { otherUserId } = req.params;
    const userId = req.userId;

    try {
        const conversation = await Conversation.findOne({
            participants: { $all: [userId, otherUserId] },
        });

        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found" });
        }

        const messages = await Message.find({
            conversationId: conversation._id,
        })
        .populate({
            path: 'sender',
            select: 'username pictures name'
        })
        .sort({ createdAt: -1 });

        const transformedMessages = messages.map(message => {
            const isSenderLoggedInUser = message.sender._id.toString() === userId;
            const senderKey = isSenderLoggedInUser ? 'senderowner' : 'sender';
            const transformedMessage = {
                _id: message._id,
                conversationId: message.conversationId,
                text: message.text,
                seen: message.seen,
                img: message.img,
                createdAt: message.createdAt,
                updatedAt: message.updatedAt,
                __v: message.__v,
                isSenderLoggedInUser
            };

            if (isSenderLoggedInUser) {
                transformedMessage.senderowner = {
                    _id: message.sender._id,
                    name: message.sender.name,
                    username: message.sender.username,
                    pictures: message.sender.pictures
                };
            } else {
                transformedMessage.sender = {
                    _id: message.sender._id,
                    name: message.sender.name,
                    pictures: message.sender.pictures
                };
            }

            return transformedMessage;
        });

        res.status(200).json(transformedMessages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}



async function getConversations(req, res) {
    const userId = req.userId;
    try {
        const conversations = await Conversation.find({ participants: userId })
            .populate({
                path: "participants",
                select: "username pictures name",
            })
            .populate({
                path: "lastMessage.sender",
                select: "username pictures name",
            })
            .sort({ createdAt: -1 }); // Sort by createdAt field in descending order

        conversations.forEach((conversation) => {
            // Extract sender details from lastMessage.sender
            const senderDetails = {
                _id: conversation.lastMessage.sender._id,
                name: conversation.lastMessage.sender.name,
                username: conversation.lastMessage.sender.username,
                pictures: conversation.lastMessage.sender.pictures,
            };

            // Remove the current user from the participants array
            conversation.participants = conversation.participants.filter(
                (participant) => participant._id.toString() !== userId.toString()
            );

            // Add senderDetails to participants array
            conversation.participants.push(senderDetails);
        });

        res.status(200).json(conversations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}


async function searchConversations(req, res) {
    const { query } = req.query;
    const userId = req.userId;
    
    try {
        const conversations = await Conversation.find({ 
            participants: userId,
            $or: [
                { "participants.name": { $regex: query, $options: 'i' } }, // Case-insensitive search by name
                { "participants.username": { $regex: query, $options: 'i' } } // Case-insensitive search by username
            ]
        })
        .populate({
            path: "participants",
            select: "username pictures name",
        })
        .populate({
            path: "lastMessage.sender",
            select: "username pictures name",
        })
        .sort({ createdAt: -1 }); // Sort by createdAt field in descending order

        // Remove the current user from the participants array
        conversations.forEach((conversation) => {
            conversation.participants = conversation.participants.filter(
                (participant) => participant._id.toString() !== userId.toString()
            );
        });

        res.status(200).json(conversations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}




module.exports = { sendMessage, getMessages, getConversations ,searchConversations};

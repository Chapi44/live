const Community = require("../model/community");
const CommunityMessage = require("../model/chatcommunity");
const { getRecipientSocketId, io } = require("../socket/socket.js");
const baseURL = process.env.BASE_URL;


async function createCommunity(req, res) {
    try {
        const { name, description } = req.body;
        const userId = req.userId;

        let images = [];
        if (req.files) {
            images = req.files.map(file => baseURL + "/uploads/communities/" + file.filename);
        }

        const community = new Community({
            name,
            description,
            image: images || [], // Save the image URLs in the 'image' field
            createdBy: userId,
            members: [userId],
        });

        await community.save();

        res.status(201).json(community);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}


async function getAllCommunities(req, res) {
    try {
        const userId = req.userId;
        console.log(userId)

        const communities = await Community.find()
            .populate('createdBy', 'username pictures name')
            .populate('members', 'username pictures name');

        // Add a boolean field 'isJoined' to each community object
        const communitiesWithJoinStatus = communities.map(community => {
            return {
                ...community.toObject(),
                isJoined: community.members.some(member => member._id.toString() === userId)
            };
        });

        res.status(200).json(communitiesWithJoinStatus);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function joinCommunity(req, res) {
    try {
        const { communityId } = req.body;
        const userId = req.userId;
        console.log(userId)

        const community = await Community.findById(communityId);

        if (!community) {
            return res.status(404).json({ error: "Community not found" });
        }

        if (!community.members.includes(userId)) {
            community.members.push(userId);
            await community.save();
        }

        res.status(200).json(community);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function sendCommunityMessage(req, res) {
    try {
        const { communityId, message } = req.body;
        const senderId = req.userId;

        let pictures = [];
        if (req.files) {
            pictures = req.files.map(file => baseURL + "/uploads/messages/" + file.filename);
        }

        const newMessage = new CommunityMessage({
            communityId,
            sender: senderId,
            text: message,
            img: pictures || "",
        });

        await newMessage.save();

        // Emit new message to all members in the community
        const community = await Community.findById(communityId).populate('members', '_id');
        community.members.forEach(member => {
            const recipientSocketId = getRecipientSocketId(member._id);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit("newCommunityMessage", newMessage);
            }
        });

        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getCommunityById(req, res) {
    try {
        const { communityId } = req.params;

        const community = await Community.findById(communityId)
            .populate('members', 'username pictures name');

        if (!community) {
            return res.status(404).json({ error: "Community not found" });
        }

        res.status(200).json(community);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function updateCommunityById(req, res) {
    try {
        const { communityId } = req.params;
        const { name, description } = req.body;
        const userId = req.userId;

        // Find the community and check if the current user is the creator
        const community = await Community.findById(communityId);

        if (!community) {
            return res.status(404).json({ error: "Community not found" });
        }

        if (community.createdBy.toString() !== userId) {
            return res.status(403).json({ error: "You do not have permission to update this community" });
        }

        let images = [];
        if (req.files) {
            images = req.files.map(file => baseURL + "/uploads/communities/" + file.filename);
        }

        community.name = name || community.name;
        community.description = description || community.description;
        if (images.length > 0) {
            community.image = images;
        }

        const updatedCommunity = await community.save();

        res.status(200).json(updatedCommunity);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function deleteCommunityById(req, res) {
    try {
        const { communityId } = req.params;
        const userId = req.userId;

        // Find the community and check if the current user is the creator
        const community = await Community.findById(communityId);

        if (!community) {
            return res.status(404).json({ error: "Community not found" });
        }

        if (community.createdBy.toString() !== userId) {
            return res.status(403).json({ error: "You do not have permission to delete this community" });
        }

        await community.deleteOne();

        res.status(200).json({ message: "Community deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}



async function getCommunityMessages(req, res) {
    try {
        const { communityId } = req.params;

        const messages = await CommunityMessage.find({ communityId })
            .populate({
                path: 'sender',
                select: 'username pictures name'
            })
            .sort({ createdAt: -1 });

        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}


async function getCommunityMessages(req, res) {
    try {
        const { communityId } = req.params;

        const messages = await CommunityMessage.find({ communityId })
            .populate({
                path: 'sender',
                select: 'username pictures name'
            })
            .sort({ createdAt: -1 });

        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}


async function getAllParticipants(req, res) {
    try {
        const { communityId } = req.params;

        const community = await Community.findById(communityId)
            .populate('members', 'username pictures name');

        if (!community) {
            return res.status(404).json({ error: "Community not found" });
        }

        res.status(200).json(community.members);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function leaveCommunity(req, res) {
    try {
        const { communityId } = req.body;
        const userId = req.userId;

        const community = await Community.findById(communityId);

        if (!community) {
            return res.status(404).json({ error: "Community not found" });
        }

        if (!community.members.includes(userId)) {
            return res.status(400).json({ error: "You are not a member of this community" });
        }

        community.members = community.members.filter(member => member.toString() !== userId);

        await community.save();

        res.status(200).json({ message: "You have left the community", community });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function editCommunityMessage(req, res) {
    try {
        const { communityId, messageId } = req.params;
        const { message } = req.body;
        const userId = req.userId;

        const communityMessage = await CommunityMessage.findOne({ _id: messageId, communityId });

        if (!communityMessage) {
            return res.status(404).json({ error: "Message not found" });
        }

        if (communityMessage.sender.toString() !== userId) {
            return res.status(403).json({ error: "You do not have permission to edit this message" });
        }

        // Handle uploaded files (if any)
        let pictures = communityMessage.img || [];
        if (req.files && req.files.length > 0) {
            pictures = req.files.map(file => baseURL + "/uploads/messages/" + file.filename);
        }

        communityMessage.text = message || communityMessage.text;
        communityMessage.img = pictures;

        const updatedMessage = await communityMessage.save();

        res.status(200).json(updatedMessage);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}



async function deleteCommunityMessage(req, res) {
    try {
        const { communityId, messageId } = req.params;
        const userId = req.userId;

        const communityMessage = await CommunityMessage.findOne({ _id: messageId, communityId });

        if (!communityMessage) {
            return res.status(404).json({ error: "Message not found" });
        }

        if (communityMessage.sender.toString() !== userId) {
            return res.status(403).json({ error: "You do not have permission to delete this message" });
        }

        await communityMessage.deleteOne();

        res.status(200).json({ message: "Message deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}


module.exports = { 
    createCommunity,
    joinCommunity,
    sendCommunityMessage, 
    getCommunityMessages ,
    getCommunityById,
    updateCommunityById,
    deleteCommunityById ,
    getAllCommunities,
    getAllParticipants,
    leaveCommunity,
    deleteCommunityMessage,
    editCommunityMessage

};

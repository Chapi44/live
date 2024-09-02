const Room = require("../model/room.model");
const { getRecipientSocketId, io } = require("../socket/socket");
const RoomMessage = require("../model/Roommessage")

const baseURL = process.env.BASE_URL;

// Create a new room
async function createRoom(req, res) {
  try {
    const { roomName } = req.body;
    const userId = req.userId;

    const room = new Room({
        name: roomName,
        createdBy: userId,
        members: [userId],
    });

    await room.save();

    // Emit room creation event
    io.emit("roomCreated", room);

    res.status(201).json(room);
} catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ error: error.message });
}
}

// Get all rooms
async function getAllRooms(req, res) {
  try {
    const rooms = await Room.find().populate('createdBy', 'username');
    res.status(200).json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Join a room
async function joinRoom(req, res) {
  try {
      const { roomId } = req.body;
      const userId = req.userId;

      const room = await Room.findById(roomId).populate('members', '_id');

      if (!room) {
          return res.status(404).json({ error: "Room not found" });
      }

      // Add the user to the room if they are not already a member
      if (!room.members.includes(userId)) {
          room.members.push(userId);
          await room.save();
      }

      // Emit an event to all members in the room that a new user has joined
      room.members.forEach(member => {
          const recipientSocketId = getRecipientSocketId(member._id);
          if (recipientSocketId) {
              io.to(recipientSocketId).emit("userJoinedRoom", { roomId, userId });
          }
      });

      res.status(200).json(room);
  } catch (error) {
      console.error("Error joining room:", error);
      res.status(500).json({ error: error.message });
  }
}


// Leave a room
async function leaveRoom(req, res) {
  try {
      const { roomId } = req.body;
      const userId = req.userId;

      const room = await Room.findById(roomId).populate('members', '_id');

      if (!room) {
          return res.status(404).json({ error: "Room not found" });
      }

      // Remove the user from the room's members list if they are a member
      const memberIndex = room.members.indexOf(userId);
      if (memberIndex !== -1) {
          room.members.splice(memberIndex, 1);
          await room.save();
      }

      // Emit an event to all remaining members in the room that a user has left
      room.members.forEach(member => {
          const recipientSocketId = getRecipientSocketId(member._id);
          if (recipientSocketId) {
              io.to(recipientSocketId).emit("userLeftRoom", { roomId, userId });
          }
      });

      res.status(200).json({ message: "User has left the room" });
  } catch (error) {
      console.error("Error leaving room:", error);
      res.status(500).json({ error: error.message });
  }
}

  
// Send a temporary message in a room
async function sendRoomMessage(req, res) {
    try {
        const { roomId, message } = req.body;
        const senderId = req.userId;

        let images = [];
        if (req.files) {
            images = req.files.map(file => baseURL + "/uploads/messages/" + file.filename);
        }

        const newMessage = new RoomMessage({
            roomId,
            sender: senderId,
            text: message,
            img: images || "",
        });

        await newMessage.save();

        // Emit the new message to all members in the room
        const room = await Room.findById(roomId).populate('members', '_id');
        room.members.forEach(member => {
            const recipientSocketId = getRecipientSocketId(member._id);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit("newRoomMessage", newMessage);
            }
        });

        res.status(201).json(newMessage);
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: error.message });
    }
}

// Start screen sharing
async function startScreenShare(req, res) {
  try {
      const { roomId } = req.body;
      const userId = req.userId;

      // Emit an event to all members in the room that screen sharing has started
      const room = await Room.findById(roomId).populate('members', '_id');
      room.members.forEach(member => {
          const recipientSocketId = getRecipientSocketId(member._id);
          if (recipientSocketId) {
              io.to(recipientSocketId).emit("screenShareStarted", { roomId, userId });
          }
      });

      res.status(200).json({ message: "Screen sharing started" });
  } catch (error) {
      console.error("Error starting screen share:", error);
      res.status(500).json({ error: error.message });
  }
}

// Stop screen sharing
async function stopScreenShare(req, res) {
  try {
      const { roomId } = req.body;
      const userId = req.userId;

      // Emit an event to all members in the room that screen sharing has stopped
      const room = await Room.findById(roomId).populate('members', '_id');
      room.members.forEach(member => {
          const recipientSocketId = getRecipientSocketId(member._id);
          if (recipientSocketId) {
              io.to(recipientSocketId).emit("screenShareStopped", { roomId, userId });
          }
      });

      res.status(200).json({ message: "Screen sharing stopped" });
  } catch (error) {
      console.error("Error stopping screen share:", error);
      res.status(500).json({ error: error.message });
  }
}


// Get all participants in a room
async function getAllParticipants(req, res) {
  try {
      const { roomId } = req.params;

      const room = await Room.findById(roomId).populate('members', 'username email');
      
      if (!room) {
          return res.status(404).json({ error: "Room not found" });
      }

      res.status(200).json(room.members);
  } catch (error) {
      console.error("Error getting participants:", error);
      res.status(500).json({ error: error.message });
  }
}

// Get all messages in a room
async function getRoomMessages(req, res) {
  try {
      const { roomId } = req.params;

      const messages = await RoomMessage.find({ roomId }).populate('sender', 'username');

      if (!messages) {
          return res.status(404).json({ error: "No messages found for this room" });
      }

      res.status(200).json(messages);
  } catch (error) {
      console.error("Error getting messages:", error);
      res.status(500).json({ error: error.message });
  }
}


module.exports = {
  createRoom,
  getAllRooms,
  joinRoom,
  leaveRoom,
  sendRoomMessage,
  getAllParticipants,
  getRoomMessages,
  sendRoomMessage,
  startScreenShare,
  stopScreenShare,
};
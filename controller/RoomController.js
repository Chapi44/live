const Room = require("../model/room.model");
const { getRecipientSocketId, io } = require("../socket/socket.js");

// Create a new room
async function createRoom(req, res) {
  try {
    const { roomName } = req.body;
    const userId = req.userId;
    console.log(userId)


    const room = new Room({
      roomName,
      createdBy: userId,
      participants: [userId],
    });

    await room.save();

    // Emit an event to the creator's socket
    const creatorSocketId = getRecipientSocketId(userId);
    if (creatorSocketId) {
      io.to(creatorSocketId).emit("roomCreated", room);
    }

    res.status(201).json(room);
  } catch (error) {
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
  
      const room = await Room.findById(roomId);
  
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
  
      if (!room.participants.includes(userId)) {
        room.participants.push(userId);
        await room.save();
        io.to(roomId).emit("userJoined", { userId, roomId });
        console.log(`User ${userId} joined room ${roomId}`); // Add logging
      }
  
      res.status(200).json(room);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  

// Leave a room
async function leaveRoom(req, res) {
    try {
      const { roomId } = req.body;
      const userId = req.userId;
  
      const room = await Room.findById(roomId);
  
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
  
      room.participants = room.participants.filter(id => id.toString() !== userId);
      await room.save();
  
      io.to(roomId).emit("userLeft", { userId, roomId });
      console.log(`User ${userId} left room ${roomId}`); // Add logging
  
      res.status(200).json(room);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
// Send a temporary message in a room
async function sendRoomMessage(req, res) {
  try {
    const { roomId, message } = req.body;
    const senderId = req.userId;

    const chatMessage = {
      roomId,
      sender: senderId,
      text: message,
      timestamp: new Date(),
    };

    io.to(roomId).emit("newMessage", chatMessage);
    console.log(`Message sent to room ${roomId}: ${message}`); // Add logging

    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createRoom,
  getAllRooms,
  joinRoom,
  leaveRoom,
  sendRoomMessage,
};

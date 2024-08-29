const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const Call = require("../model/call.model");
const Room = require("../model/room.model");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  },
});

const userSocketMap = {}; // userId: socketId

const getRecipientSocketId = (recipientId) => {
  return userSocketMap[recipientId];
};

io.on("connection", (socket) => {
  console.log("User connected", socket.id);
  const userId = socket.handshake.query.userId;

  if (userId !== "undefined") userSocketMap[userId] = socket.id;
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Voice Call Events
  socket.on("voiceCallRequest", async ({ recipientId }) => {
    const recipientSocketId = getRecipientSocketId(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("voiceCallRequest", { callerId: userId });
      await Call.create({ caller: userId, recipient: recipientId });
    }
  });

  socket.on("voiceCallAccepted", async ({ callerId }) => {
    const callerSocketId = getRecipientSocketId(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("voiceCallAccepted", { recipientId: userId });
      await Call.updateOne({ caller: callerId, recipient: userId, status: "initiated" }, { status: "accepted", startedAt: new Date() });
    }
  });

  socket.on("voiceCallRejected", async ({ callerId }) => {
    const callerSocketId = getRecipientSocketId(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("voiceCallRejected", { recipientId: userId });
      await Call.updateOne({ caller: callerId, recipient: userId, status: "initiated" }, { status: "rejected", rejectedAt: new Date() });
    }
  });

  socket.on("voiceCallEnded", async ({ peerId }) => {
    const peerSocketId = getRecipientSocketId(peerId);
    if (peerSocketId) {
      io.to(peerSocketId).emit("voiceCallEnded", { userId });
      await Call.updateOne({ $or: [{ caller: userId, recipient: peerId }, { caller: peerId, recipient: userId }], status: "accepted" }, { status: "ended", endedAt: new Date() });
    }
  });

  // Room-based Video Conferencing Events
  socket.on("createRoom", async ({ roomName }) => {
    console.log("hey")
    const room = new Room({
      roomName,
      createdBy: userId,
      participants: [userId],
    });
    await room.save();
    socket.join(room._id.toString());
    io.to(socket.id).emit("roomCreated", room);
  });

  socket.on("joinRoom", async ({ roomId }) => {
    const room = await Room.findById(roomId);
    if (room) {
      if (!room.participants.includes(userId)) {
        room.participants.push(userId);
        await room.save();
      }
      socket.join(roomId);
      io.to(roomId).emit("userJoined", { userId, roomId });
    } else {
      io.to(socket.id).emit("error", "Room not found");
    }
  });

  // Temporary chat messages
  socket.on("sendMessage", ({ roomId, message }) => {
    const chatMessage = {
      roomId,
      sender: userId,
      text: message,
      timestamp: new Date(),
    };

    // Emit the message to everyone in the room
    io.to(roomId).emit("newMessage", chatMessage);
  });

  // Screen sharing events
  socket.on("startScreenShare", ({ roomId }) => {
    io.to(roomId).emit("startScreenShare", { userId });
  });

  socket.on("stopScreenShare", ({ roomId }) => {
    io.to(roomId).emit("stopScreenShare", { userId });
  });

  // Handle leaving a room
  socket.on("leaveRoom", async ({ roomId }) => {
    socket.leave(roomId);
    const room = await Room.findById(roomId);
    if (room) {
      room.participants = room.participants.filter(id => id.toString() !== userId);
      await room.save();
      io.to(roomId).emit("userLeft", { userId, roomId });
    }
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected");
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

module.exports = { io, server, app, getRecipientSocketId };

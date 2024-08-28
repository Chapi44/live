const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const Call = require("../model/call.model");

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

  socket.on("disconnect", () => {
    console.log("User disconnected");
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

module.exports = { io, server, app, getRecipientSocketId };

const express = require( "express");
const router = express.Router();
const { io, getRecipientSocketId } = require("../socket/socket.js");
const Call = require("../model/call.model.js");
const User = require("../model/user");

router.post("/voiceCallRequest", async (req, res) => {
  const { callerId, recipientId } = req.body;

  const [caller, recipient] = await Promise.all([
    User.findById(callerId),
    User.findById(recipientId),
  ]);

  if (!caller || !recipient) {
    return res.status(404).json({ message: "Caller or recipient not found." });
  }

  const recipientSocketId = getRecipientSocketId(recipientId);
  if (recipientSocketId) {
    io.to(recipientSocketId).emit("voiceCallRequest", { callerId, callerName: caller.name, callerUsername: caller.username });
    await Call.create({ caller: callerId, recipient: recipientId });
    return res.status(200).json({
      message: "Voice call request sent.",
      caller: { id: caller._id, name: caller.name, username: caller.username },
      recipient: { id: recipient._id, name: recipient.name, username: recipient.username }
    });
  }
  return res.status(404).json({ message: "Recipient not found." });
});

router.post("/voiceCallAccepted", async (req, res) => {
  const { callerId, recipientId } = req.body;

  const [caller, recipient] = await Promise.all([
    User.findById(callerId),
    User.findById(recipientId),
  ]);

  if (!caller || !recipient) {
    return res.status(404).json({ message: "Caller or recipient not found." });
  }

  const callerSocketId = getRecipientSocketId(callerId);
  if (callerSocketId) {
    io.to(callerSocketId).emit("voiceCallAccepted", { recipientId, recipientName: recipient.name, recipientUsername: recipient.username });
    await Call.updateOne(
      { caller: callerId, recipient: recipientId, status: "initiated" },
      { status: "accepted", startedAt: new Date() }
    );
    return res.status(200).json({
      message: "Voice call accepted.",
      caller: { id: caller._id, name: caller.name, username: caller.username },
      recipient: { id: recipient._id, name: recipient.name, username: recipient.username }
    });
  }
  return res.status(404).json({ message: "Caller not found." });
});

router.post("/voiceCallEnded", async (req, res) => {
  const { userId, peerId } = req.body;

  const [user, peer] = await Promise.all([
    User.findById(userId),
    User.findById(peerId),
  ]);

  if (!user || !peer) {
    return res.status(404).json({ message: "User or peer not found." });
  }

  const peerSocketId = getRecipientSocketId(peerId);
  if (peerSocketId) {
    io.to(peerSocketId).emit("voiceCallEnded", { userId, userName: user.name, userUsername: user.username });
    await Call.updateOne(
      {
        $or: [
          { caller: userId, recipient: peerId },
          { caller: peerId, recipient: userId },
        ],
        status: "accepted",
      },
      { status: "ended", endedAt: new Date() }
    );
    return res.status(200).json({
      message: "Voice call ended.",
      user: { id: user._id, name: user.name, username: user.username },
      peer: { id: peer._id, name: peer.name, username: peer.username }
    });
  }
  return res.status(404).json({ message: "Peer not found." });
});



router.post("/voiceCallRejected", async (req, res) => {
  const { callerId, recipientId } = req.body;

  const [caller, recipient] = await Promise.all([
    User.findById(callerId),
    User.findById(recipientId),
  ]);

  if (!caller || !recipient) {
    return res.status(404).json({ message: "Caller or recipient not found." });
  }

  const callerSocketId = getRecipientSocketId(callerId);
  if (callerSocketId) {
    io.to(callerSocketId).emit("voiceCallRejected", { recipientId, recipientName: recipient.name, recipientUsername: recipient.username });
    await Call.updateOne(
      { caller: callerId, recipient: recipientId, status: "initiated" },
      { status: "rejected", rejectedAt: new Date() }
    );
    return res.status(200).json({
      message: "Voice call rejected.",
      caller: { id: caller._id, name: caller.name, username: caller.username },
      recipient: { id: recipient._id, name: recipient.name, username: recipient.username }
    });
  }
  return res.status(404).json({ message: "Caller not found." });
});

module.exports = router;

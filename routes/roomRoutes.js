const express = require("express");
const { createRoom, getAllRooms, joinRoom, leaveRoom, sendRoomMessage } = require("../controller/RoomController");

const { authAuthorization, authMiddleware } = require('../middelware/authMiddleware');


const router = express.Router();

// Route to create a new room
router.post("/rooms", authMiddleware, createRoom);

// Route to get all rooms
router.get("/rooms",  getAllRooms);

// Route to join a room
router.post("/rooms/join", authMiddleware,joinRoom);

// Route to leave a room
router.post("/rooms/leave",authMiddleware, leaveRoom);

// Route to send a temporary message in a room
router.post("/rooms/message", authMiddleware, sendRoomMessage);

module.exports = router;

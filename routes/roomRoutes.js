const express = require("express");
const { createRoom, getAllRooms, joinRoom, leaveRoom, sendRoomMessage,stopScreenShare, startScreenShare, getRoomMessages,getAllParticipants} = require("../controller/RoomController");
const path = require ('path')
const multer = require("multer");

const { authAuthorization, authMiddleware } = require('../middelware/authMiddleware');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/messages/');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });


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
router.post("/rooms/message", authMiddleware, upload.array("pictures"), sendRoomMessage);


router.get("/rooms/:roomId/participants", getAllParticipants);
router.get("/rooms/:roomId/messages", getRoomMessages);


router.post("/rooms/startScreenShare", startScreenShare);
router.post("/rooms/stopScreenShare", stopScreenShare);

module.exports = router;

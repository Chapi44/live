const express = require("express");
const router = express.Router();
const path = require('path');
const multer = require("multer");
const { sendMessage, getConversations, getMessages,searchConversations } = require("../controller/messageController");
const { authMiddleware } = require("../middelware/authMiddleware");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/messages/');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.get("/conversations", authMiddleware, getConversations);
router.post("/:otherUserId", authMiddleware, getMessages);
router.post("/", authMiddleware, upload.array('pictures', 6), sendMessage);

router.get('/search',authMiddleware, searchConversations);

module.exports = router;

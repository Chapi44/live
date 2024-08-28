const express = require("express");
const path = require ('path')

const {
    createCommunity,
    joinCommunity,
    sendCommunityMessage,
    getCommunityMessages,
    getCommunityById,
    updateCommunityById,
    deleteCommunityById,
    getAllCommunities,
    getAllParticipants,
    leaveCommunity,
    deleteCommunityMessage,
    editCommunityMessage
} = require("../controller/communityController");
const { authAuthorization, authMiddleware } = require('../middelware/authMiddleware');

const multer = require("multer");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/communities/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

const router = express.Router();

// Community routes
router.post("/community/create", authMiddleware, upload.array("images"), createCommunity);
router.get("/community/getallcomunities", authMiddleware, getAllCommunities)
router.post("/community/join", authMiddleware, joinCommunity);
router.get("/community/:communityId", authMiddleware, getCommunityById);
router.put("/community/:communityId/update", authMiddleware, upload.array("images"), updateCommunityById);
router.delete("/community/:communityId/delete", authMiddleware, deleteCommunityById);

// Community messages routes
router.post("/community/send-message", authMiddleware, upload.array("pictures"), sendCommunityMessage);

router.put("/community/:communityId/message/:messageId/edit", authMiddleware, upload.array("pictures"), editCommunityMessage);

router.get("/community/:communityId/messages", authMiddleware, getCommunityMessages);

router.get("/community/:communityId/participants", authMiddleware, getAllParticipants);

router.post("/community/leave", authMiddleware, leaveCommunity);

router.delete("/community/:communityId/message/:messageId/delete", authMiddleware, deleteCommunityMessage);


module.exports = router;

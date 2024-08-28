const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const {
    createStory,
    getAllStories,
    getSingleStory,
    // deleteStoryById,
    replyToStory,
    updateStoryById,
    likeStory,
    getStoryByUserId,
    markStoryAsSeen
} = require("../controller/storyController");

const {
    authMiddleware,
} = require("../middelware/authMiddleware");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/stories/');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

router.route("/")
    .post(authMiddleware, upload.array('images', 6), createStory)
router.get("/", authMiddleware,getAllStories);

router.route("/:id")
router.post("/:id",authMiddleware,getSingleStory)
// router.delete("/:id",authMiddleware, deleteStoryById);

router.put("/reply/:id", authMiddleware, replyToStory);

router.post("/like/:id", authMiddleware, likeStory);
router.put('/:id', authMiddleware, upload.array('images', 6), updateStoryById);

router.put('/:id/seen', authMiddleware, markStoryAsSeen)

router.get('/:userId/stories', getStoryByUserId);
module.exports = router;

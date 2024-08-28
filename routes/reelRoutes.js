const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const {
    createReel,
    getAllreels,
    getSingleReel,
    updateReelById,
    deleteReelById,
    likeReel,
    // replyToReel,
    likeOrUnlikeReply,
    replyToReply,
    replyToreel,
    getSreelByUserId,
    
} = require("../controller/reelController");

const {
    authMiddleware,
} = require("../middelware/authMiddleware");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/reel/');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

router.route("/")
    .post(authMiddleware, upload.array('images', 6), createReel)
    .get(getAllreels);

router.route("/:id")
    .get(getSingleReel)

router.delete("/:id",authMiddleware, deleteReelById);

// router.put("/reply/:id", authMiddleware, replyToReel);


router.post("/like/:id", authMiddleware, likeReel);

router.put("/reply/:id", authMiddleware, replyToreel);
router.post('/replytoreply', authMiddleware, replyToReply);
router.post('/products/:reelId/replies/:replyId/like', authMiddleware, likeOrUnlikeReply);

router.put('/:id', authMiddleware,upload.array('images', 6), updateReelById);

router.get('/:userId/reel', getSreelByUserId);

module.exports = router;

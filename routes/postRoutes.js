const express = require("express");
const router = express.Router();
const path = require ('path')
const multer = require("multer");
const {
    createposts,
    getAllposts,
    getSinglepost,
    updatepostbyid,
    deletepostbyid,
    replyToPost,
    likeOrUnlikeReply,
    likeProduct,
    getPostsByUserId,
    replyToReply,
    getAllMp4Posts,
    getPostsMp4ByUserId
    

  } = require("../controller/postController");

const {
  authAuthorization ,
  authMiddleware ,
} = require("../middelware/authMiddleware");


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/posts/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

router.route("/").post(
authMiddleware,
  upload.array('images', 6),
  createposts
  ).get(getAllposts);

router
  .route("/:id")
  .get(getSinglepost)
 router.delete("/:id",authMiddleware,deletepostbyid);

  router.put("/:id",authMiddleware, upload.array("images", 6), updatepostbyid);



router.put("/reply/:id", authMiddleware, replyToPost);
router.post('/replytoreply', authMiddleware, replyToReply);
router.post('/products/:productId/replies/:replyId/like', authMiddleware, likeOrUnlikeReply);


router.post("/like/:id", authMiddleware, likeProduct);


router.get('/:userId/posts', getPostsByUserId);

router.get('/posts/mp4', getAllMp4Posts);

router.get('/posts/mp4/:userId', getPostsMp4ByUserId);



module.exports = router;

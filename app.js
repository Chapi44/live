require("express-async-errors");

const cors = require("cors");
const express = require("express");

const { app, server } = require("./socket/socket.js");

const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const { v2: cloudinary } = require("cloudinary");

const dotenv = require("dotenv");
dotenv.config();

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});



const morgan = require("morgan");
const cookieParser = require("cookie-parser");



const connectDB = require("./db/connect.js");
const authRouter = require("./routes/authRouter");
const userRouter = require("./routes/userroutes.js");
const postRoutes = require("./routes/postRoutes.js");
const chatRoutes = require("./routes/chatRoutes");
const notificationsRoutes = require("./routes/notificationRoutes.js")
const storiesRoutes = require("./routes/storyRoutes.js")
const ReelRoutes = require("./routes/reelRoutes.js")
const messageRoutes = require("./routes/messageRoutes.js")
const callRoutes = require("./routes/callRoutes");
const communityRoutes = require("./routes/communitiesRoutes")
const roomRoutes = require("./routes/roomRoutes");
// Middleware
const notFoundMiddleware = require("./middelware/not-found.js");
const errorHandlerMiddleware = require("./middelware/error-handler.js");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Destination folder for uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Unique filename
  },
});

const upload = multer({ storage: storage });

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});


app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins
    callback(null, origin);
  },
  credentials: true
}));
app.use(morgan("tiny"));
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(cookieParser(process.env.JWT_SECRET));
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/post", postRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/notifications", notificationsRoutes);
app.use("/api/v1/stories", storiesRoutes);
app.use("/api/v1/reel", ReelRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/calls", callRoutes);
app.use("/api/v1/com", communityRoutes),
app.use("/api/v1/room", roomRoutes)



app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 5000;

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "/frontend/dist")));

  // react app
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
  });
}


const start = async () => {
  try {
    await connectDB(process.env.MONGO);
    server.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.log(error);
  }
};


start();

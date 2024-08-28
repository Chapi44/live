const express = require('express');
const router = express.Router();
const notificationController = require('../controller/notificationController');
const {
  authAuthorization ,
  authMiddleware ,
} = require("../middelware/authMiddleware");
// Get notifications
router.get('/', authMiddleware, notificationController.getNotifications);

// Mark notification as read
router.put('/:id', authMiddleware, notificationController.markAsRead);

module.exports = router;

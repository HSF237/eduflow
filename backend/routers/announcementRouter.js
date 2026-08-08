const express = require('express');
const router = express.Router();
const { createAnnouncement, getAnnouncementsByClass } = require('../controllers/announcementController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/', verifyToken, createAnnouncement);
router.get('/class/:classId', getAnnouncementsByClass);

module.exports = router;

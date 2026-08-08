const express = require('express');
const router = express.Router();
const { sendMessage, getMessagesByStudent } = require('../controllers/messageController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/', verifyToken, sendMessage);
router.get('/student/:studentId', getMessagesByStudent);

module.exports = router;

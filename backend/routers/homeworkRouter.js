const express = require('express');
const router = express.Router();
const { createHomework, getHomeworkByClass } = require('../controllers/homeworkController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/', verifyToken, createHomework);
router.get('/class/:classId', getHomeworkByClass);

module.exports = router;

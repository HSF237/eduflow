const express = require('express');
const router = express.Router();
const { createExam, getExamsByClass, submitBulkMarks, getStudentMarks } = require('../controllers/examController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/', verifyToken, createExam);
router.get('/class/:classId', getExamsByClass);
router.post('/marks/bulk', verifyToken, submitBulkMarks);
router.get('/marks/student/:studentId', getStudentMarks);

module.exports = router;

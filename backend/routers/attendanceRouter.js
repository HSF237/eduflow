const express = require('express');
const router = express.Router();
const { markBulkAttendance, getAttendanceByClassAndDate, getStudentAttendance } = require('../controllers/attendanceController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/bulk', verifyToken, markBulkAttendance);
router.get('/class', getAttendanceByClassAndDate);
router.get('/student/:studentId', getStudentAttendance);

module.exports = router;

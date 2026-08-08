const express = require('express');
const router = express.Router();
const { applyLeave, getLeaveRequestsByClass, updateLeaveStatus } = require('../controllers/leaveController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/', verifyToken, applyLeave);
router.get('/class/:classId', getLeaveRequestsByClass);
router.patch('/:id', verifyToken, updateLeaveStatus);

module.exports = router;

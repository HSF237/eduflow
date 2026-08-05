const express = require('express');
const router = express.Router();
const { getStudents, getStudentByParentCode, createStudent, updateStudent, deleteStudent } = require('../controllers/studentController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getStudents);
router.get('/parent-code/:code', getStudentByParentCode);
router.post('/', verifyToken, requireRole('ADMIN', 'TEACHER'), createStudent);
router.put('/:id', verifyToken, requireRole('ADMIN', 'TEACHER'), updateStudent);
router.delete('/:id', verifyToken, requireRole('ADMIN'), deleteStudent);

module.exports = router;

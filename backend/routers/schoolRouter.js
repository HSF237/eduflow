const express = require('express');
const router = express.Router();
const { getSchools, getSchoolById, getSchoolByCode, createSchool, updateSchool } = require('../controllers/schoolController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getSchools);
router.get('/code/:code', getSchoolByCode);
router.get('/:id', verifyToken, getSchoolById);
router.post('/', verifyToken, requireRole('ADMIN'), createSchool);
router.put('/:id', verifyToken, requireRole('ADMIN'), updateSchool);

module.exports = router;

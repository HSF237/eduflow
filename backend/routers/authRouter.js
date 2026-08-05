const express = require('express');
const router = express.Router();
const { signup, login, refreshToken, logout, getCurrentUser } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', verifyToken, getCurrentUser);

module.exports = router;

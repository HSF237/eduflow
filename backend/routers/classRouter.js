const express = require('express');
const router = express.Router();
const { getClasses, getClassById, createClass } = require('../controllers/classController');

router.get('/', getClasses);
router.get('/:id', getClassById);
router.post('/', createClass);

module.exports = router;

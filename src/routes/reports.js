const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const auth = require('../utils/authMiddleware');

router.use(auth);
router.get('/', reportsController.getReport);

module.exports = router;

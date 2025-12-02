const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../utils/authMiddleware');

router.use(auth);

router.get('/summary', dashboardController.summary);
router.get('/category-breakdown', dashboardController.categoryBreakdown);
router.get('/monthly-overview', dashboardController.monthlyOverview);
router.get('/accounts-overview', dashboardController.accountsOverview);

module.exports = router;

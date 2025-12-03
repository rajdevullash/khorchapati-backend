const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const auth = require('../utils/authMiddleware');

router.use(auth);

router.get('/csv', exportController.exportCSV);
router.get('/json', exportController.exportJSON);
router.get('/pdf', exportController.exportPDF);
router.get('/excel', exportController.exportExcel);
router.get('/monthly-statement', exportController.exportMonthlyStatement);
router.get('/category-report', exportController.exportCategoryReport);
router.post('/import', exportController.importTransactions);

module.exports = router;

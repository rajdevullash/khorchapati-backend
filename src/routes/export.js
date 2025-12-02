const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const auth = require('../utils/authMiddleware');

router.use(auth);

router.get('/csv', exportController.exportCSV);
router.get('/json', exportController.exportJSON);
router.post('/import', exportController.importTransactions);

module.exports = router;

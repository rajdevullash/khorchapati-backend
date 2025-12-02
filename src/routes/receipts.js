const express = require('express');
const router = express.Router();
const auth = require('../utils/authMiddleware');
const { upload } = require('../config/cloudinary');
const receiptsController = require('../controllers/receiptsController');

// All routes require authentication
router.use(auth);

// POST /api/receipts/scan - Upload and scan receipt
router.post('/scan', upload.single('receipt'), receiptsController.scanReceipt);

// DELETE /api/receipts/:publicId - Delete receipt from Cloudinary
router.delete('/:publicId', receiptsController.deleteReceipt);

// POST /api/receipts/parse - Manual text parsing (for testing)
router.post('/parse', receiptsController.parseText);

module.exports = router;

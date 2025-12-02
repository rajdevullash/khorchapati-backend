const receiptScannerService = require('../services/receiptScannerService');
const { cloudinary } = require('../config/cloudinary');

// Scan uploaded receipt
exports.scanReceipt = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No receipt image uploaded' });
    }

    console.log('Receipt uploaded:', req.file);

    // Get the Cloudinary URL
    const imageUrl = req.file.path;
    const publicId = req.file.filename;

    // Scan the receipt using OCR
    const scanResult = await receiptScannerService.scanReceipt(imageUrl);

    if (!scanResult.success) {
      return res.status(500).json({ 
        error: 'Failed to scan receipt',
        details: scanResult.error
      });
    }

    // Return the scan results along with image URL
    res.json({
      success: true,
      imageUrl: imageUrl,
      publicId: publicId,
      data: scanResult.data,
      confidence: scanResult.confidence,
      message: scanResult.confidence > 50 
        ? 'Receipt scanned successfully' 
        : 'Receipt scanned with low confidence. Please verify the extracted data.'
    });

  } catch (error) {
    console.error('Scan receipt error:', error);
    res.status(500).json({ error: 'Server error while scanning receipt' });
  }
};

// Delete receipt image from Cloudinary
exports.deleteReceipt = async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({ error: 'Public ID is required' });
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      res.json({ success: true, message: 'Receipt deleted successfully' });
    } else {
      res.status(404).json({ error: 'Receipt not found' });
    }

  } catch (error) {
    console.error('Delete receipt error:', error);
    res.status(500).json({ error: 'Server error while deleting receipt' });
  }
};

// Manual text parsing (for testing without image upload)
exports.parseText = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const data = receiptScannerService.parseReceiptData(text);

    res.json({
      success: true,
      data: data,
      confidence: receiptScannerService.calculateConfidence(data)
    });

  } catch (error) {
    console.error('Parse text error:', error);
    res.status(500).json({ error: 'Server error while parsing text' });
  }
};

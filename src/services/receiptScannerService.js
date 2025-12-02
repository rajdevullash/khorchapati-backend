const Tesseract = require('tesseract.js');

class ReceiptScannerService {
  /**
   * Extract text from image using Tesseract OCR
   */
  async extractText(imageUrl) {
    try {
      console.log('Starting OCR on image:', imageUrl);
      
      const result = await Tesseract.recognize(
        imageUrl,
        'eng',
        {
          logger: m => console.log('OCR Progress:', m)
        }
      );
      
      return result.data.text;
    } catch (error) {
      console.error('OCR extraction error:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  /**
   * Parse receipt text to extract amount and category
   */
  parseReceiptData(text) {
    console.log('Parsing receipt text:', text);
    
    // Initialize result
    const result = {
      amount: null,
      category: null,
      merchant: null,
      date: null,
      items: [],
      rawText: text
    };

    // Extract amount (look for total, grand total, amount, etc.)
    const amountPatterns = [
      /total[:\s]*(?:tk|৳|bdt)?\s*([\d,]+\.?\d*)/gi,
      /grand\s*total[:\s]*(?:tk|৳|bdt)?\s*([\d,]+\.?\d*)/gi,
      /amount[:\s]*(?:tk|৳|bdt)?\s*([\d,]+\.?\d*)/gi,
      /(?:tk|৳|bdt)\s*([\d,]+\.?\d*)/gi,
      /\b(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\b/g
    ];

    for (const pattern of amountPatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        // Get the largest amount found
        const amounts = matches.map(m => parseFloat(m[1].replace(/,/g, '')));
        result.amount = Math.max(...amounts);
        if (result.amount > 0) break;
      }
    }

    // Extract merchant/store name (usually first few lines)
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      result.merchant = lines[0].trim();
    }

    // Extract date
    const datePatterns = [
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
      /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/,
      /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})/i
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        result.date = match[1];
        break;
      }
    }

    // Categorize based on keywords
    result.category = this.detectCategory(text);

    // Extract line items
    result.items = this.extractLineItems(text);

    return result;
  }

  /**
   * Detect category based on keywords in receipt
   */
  detectCategory(text) {
    const lowerText = text.toLowerCase();

    const categories = {
      food: ['restaurant', 'cafe', 'food', 'burger', 'pizza', 'coffee', 'tea', 'breakfast', 'lunch', 'dinner', 'মেনু', 'খাবার'],
      shopping: ['store', 'shop', 'retail', 'market', 'mall', 'বাজার', 'দোকান'],
      transport: ['taxi', 'uber', 'fuel', 'petrol', 'gas', 'station', 'যাতায়াত', 'গাড়ি'],
      groceries: ['grocery', 'supermarket', 'fresh', 'mart', 'মুদি'],
      pharmacy: ['pharmacy', 'medical', 'medicine', 'drug', 'ঔষধ', 'মেডিকেল'],
      entertainment: ['cinema', 'movie', 'theater', 'ticket', 'বিনোদন'],
      utilities: ['electricity', 'water', 'gas', 'bill', 'বিল'],
      clothing: ['fashion', 'apparel', 'clothing', 'garment', 'পোশাক'],
      electronics: ['electronics', 'mobile', 'computer', 'gadget', 'ইলেকট্রনিক্স']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return category;
      }
    }

    return 'other';
  }

  /**
   * Extract line items from receipt
   */
  extractLineItems(text) {
    const items = [];
    const lines = text.split('\n');

    for (const line of lines) {
      // Look for lines with item name and price pattern
      const itemPattern = /^(.+?)\s+(?:tk|৳|bdt)?\s*([\d,]+\.?\d*)$/i;
      const match = line.trim().match(itemPattern);
      
      if (match) {
        const itemName = match[1].trim();
        const price = parseFloat(match[2].replace(/,/g, ''));
        
        // Filter out common non-item lines
        if (!itemName.toLowerCase().match(/total|subtotal|tax|discount|change|balance/)) {
          items.push({
            name: itemName,
            price: price
          });
        }
      }
    }

    return items;
  }

  /**
   * Main scan function - combines OCR and parsing
   */
  async scanReceipt(imageUrl) {
    try {
      // Extract text using OCR
      const text = await this.extractText(imageUrl);
      
      // Parse the extracted text
      const data = this.parseReceiptData(text);
      
      return {
        success: true,
        data: data,
        confidence: this.calculateConfidence(data)
      };
    } catch (error) {
      console.error('Receipt scanning error:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Calculate confidence score based on extracted data
   */
  calculateConfidence(data) {
    let score = 0;
    let maxScore = 5;

    if (data.amount && data.amount > 0) score += 2;
    if (data.category && data.category !== 'other') score += 1;
    if (data.merchant) score += 1;
    if (data.date) score += 1;

    return (score / maxScore) * 100;
  }
}

module.exports = new ReceiptScannerService();

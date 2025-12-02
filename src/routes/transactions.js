const express = require('express');
const router = express.Router();
const transactionsController = require('../controllers/transactionsController');
const auth = require('../utils/authMiddleware');

router.use(auth);

router.get('/', transactionsController.list);
router.get('/ai/insights', transactionsController.getInsights);
router.post('/ai/predict-category', transactionsController.predictCategory);
router.get('/:id', transactionsController.getById);
router.post('/', transactionsController.create);
router.put('/:id', transactionsController.update);
router.delete('/:id', transactionsController.remove);

module.exports = router;

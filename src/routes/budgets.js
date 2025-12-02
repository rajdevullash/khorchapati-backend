const express = require('express');
const router = express.Router();
const budgetsController = require('../controllers/budgetsController');
const auth = require('../utils/authMiddleware');

router.use(auth);

router.get('/', budgetsController.list);
router.get('/status', budgetsController.status);
router.post('/', budgetsController.create);
router.put('/:id', budgetsController.update);
router.delete('/:id', budgetsController.remove);

module.exports = router;

const express = require('express');
const router = express.Router();
const recurringController = require('../controllers/recurringController');
const auth = require('../utils/authMiddleware');

router.use(auth);

router.get('/', recurringController.list);
router.get('/upcoming', recurringController.getUpcoming);
router.post('/', recurringController.create);
router.put('/:id', recurringController.update);
router.patch('/:id/paid', recurringController.markAsPaid);
router.delete('/:id', recurringController.remove);
router.patch('/:id/toggle', recurringController.toggleActive);

module.exports = router;

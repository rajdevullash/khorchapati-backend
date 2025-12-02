const express = require('express');
const router = express.Router();
const paymentMethodsController = require('../controllers/paymentMethodsController');
const auth = require('../utils/authMiddleware');

router.use(auth);

router.get('/', paymentMethodsController.list);
router.post('/', paymentMethodsController.create);
router.put('/:id', paymentMethodsController.update);
router.delete('/:id', paymentMethodsController.remove);

module.exports = router;

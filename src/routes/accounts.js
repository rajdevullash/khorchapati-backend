const express = require('express');
const router = express.Router();
const accountsController = require('../controllers/accountsController');
const auth = require('../utils/authMiddleware');

router.use(auth);

router.get('/', accountsController.list);
router.post('/', accountsController.create);
router.put('/:id', accountsController.update);
router.delete('/:id', accountsController.remove);
router.post('/transfer', accountsController.transfer);

module.exports = router;

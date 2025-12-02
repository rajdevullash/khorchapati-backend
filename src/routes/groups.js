const express = require('express');
const router = express.Router();
const auth = require('../utils/authMiddleware');
const groupsController = require('../controllers/groupsController');

router.use(auth);

router.post('/', groupsController.create);
router.get('/', groupsController.list);
router.get('/:id', groupsController.get);
router.put('/:id', groupsController.updateGroup);
router.post('/join', groupsController.joinByCode);
router.post('/:id/members', groupsController.addMemberByEmail);
router.delete('/:id/members', groupsController.removeMember);
router.get('/:id/balances', groupsController.getBalances);
router.get('/:id/transactions', groupsController.getTransactions);
router.post('/:id/settle', groupsController.settle);
router.get('/:id/settlement-suggestions', groupsController.getSettlementSuggestions);

module.exports = router;

const express = require('express');
const walletController = require('../controllers/walletController');
const { protect, authorizeVehicleAccess } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const {
  walletVehicleParamSchema,
  walletTransactionParamSchema,
  getWalletTransactionsQuerySchema,
  addTransactionSchema,
  editTransactionSchema,
} = require('../validators/walletValidator');

const router = express.Router({ mergeParams: true });

// Apply validation + protect + authorizeVehicleAccess to all wallet routes
router.use('/:vehicleId/wallet', validate(walletVehicleParamSchema, 'params'), protect, authorizeVehicleAccess);

router.get('/:vehicleId/wallet', walletController.getWallet);
router.get('/:vehicleId/wallet/transactions', validate(getWalletTransactionsQuerySchema, 'query'), walletController.getWalletTransactions);
router.post('/:vehicleId/wallet/transactions', validate(addTransactionSchema, 'body'), walletController.addTransaction);
router.patch('/:vehicleId/wallet/transactions/:id', validate(walletTransactionParamSchema, 'params'), validate(editTransactionSchema, 'body'), walletController.editTransaction);
router.delete('/:vehicleId/wallet/transactions/:id', validate(walletTransactionParamSchema, 'params'), walletController.deleteTransaction);

module.exports = router;

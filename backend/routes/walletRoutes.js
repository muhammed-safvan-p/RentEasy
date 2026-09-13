const express = require('express');
const walletController = require('../controllers/walletController');
const { protect, authorizeVehicleAccess } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true }); // Need mergeParams to get vehicleId from parent router

// Apply protect + authorizeVehicleAccess to all wallet routes
router.use('/:vehicleId/wallet', protect, authorizeVehicleAccess);

router.get('/:vehicleId/wallet', walletController.getWallet);
router.get('/:vehicleId/wallet/transactions', walletController.getWalletTransactions);
router.post('/:vehicleId/wallet/transactions', walletController.addTransaction);
router.patch('/:vehicleId/wallet/transactions/:id', walletController.editTransaction);
router.delete('/:vehicleId/wallet/transactions/:id', walletController.deleteTransaction);

module.exports = router;

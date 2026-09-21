const walletService = require('../services/walletService');

class WalletController {
  constructor() {
    this.getWallet = this.getWallet.bind(this);
    this.getWalletTransactions = this.getWalletTransactions.bind(this);
    this.addTransaction = this.addTransaction.bind(this);
    this.editTransaction = this.editTransaction.bind(this);
    this.deleteTransaction = this.deleteTransaction.bind(this);
  }

  // GET /api/vehicles/:vehicleId/wallet
  async getWallet(req, res, next) {
    try {
      const vehicleId = req.params.vehicleId;
      const result = await walletService.getWallet(vehicleId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/vehicles/:vehicleId/wallet/transactions?month=YYYY-MM
  async getWalletTransactions(req, res, next) {
    try {
      const vehicleId = req.params.vehicleId;
      const { month, page, limit } = req.query;
      const result = await walletService.getWalletTransactions(vehicleId, month, { page, limit });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/vehicles/:vehicleId/wallet/transactions
  async addTransaction(req, res, next) {
    try {
      const vehicleId = req.params.vehicleId;
      const { transaction, warnings } = await walletService.addTransaction(
        vehicleId,
        req.body,
        req.user._id
      );

      res.status(201).json({ transaction, warnings });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/vehicles/:vehicleId/wallet/transactions/:id
  async editTransaction(req, res, next) {
    try {
      const { id } = req.params;
      const { transaction, warnings } = await walletService.editTransaction(id, req.body);
      res.status(200).json({ transaction, warnings });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/vehicles/:vehicleId/wallet/transactions/:id
  async deleteTransaction(req, res, next) {
    try {
      const { id } = req.params;
      const { warnings } = await walletService.deleteTransaction(id);
      res.status(200).json({ message: 'Transaction deleted successfully', warnings });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WalletController();

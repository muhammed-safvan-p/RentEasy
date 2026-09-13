const mongoose = require('mongoose');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const walletService = require('../services/walletService');

class WalletController {
  constructor() {
    this.getWallet = this.getWallet.bind(this);
    this.getWalletTransactions = this.getWalletTransactions.bind(this);
    this.addTransaction = this.addTransaction.bind(this);
    this.editTransaction = this.editTransaction.bind(this);
    this.deleteTransaction = this.deleteTransaction.bind(this);
  }

  async _runInTransaction(workFn) {
    let session = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      const result = await workFn(session);
      await session.commitTransaction();
      return result;
    } catch (err) {
      if (session) {
        try {
          await session.abortTransaction();
        } catch (_) {}
      }
      // If standalone MongoDB without replica set, fall back to executing without a session
      if (
        err.message?.includes('replica set') ||
        err.message?.includes('mongos') ||
        err.code === 20 ||
        err.codeName === 'IllegalOperation'
      ) {
        return await workFn(null);
      }
      throw err;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }

  // GET /api/vehicles/:vehicleId/wallet
  async getWallet(req, res) {
    try {
      const vehicleId = req.params.vehicleId;
      let wallet = await Wallet.findOne({ vehicleId });

      if (!wallet) {
        const vehicle = await Vehicle.findById(vehicleId);
        if (vehicle) {
          wallet = await Wallet.create({
            vehicleId,
            cashBalance: 0,
            bankBalance: 0,
            totalBalance: 0,
          });
        } else {
          return res.status(404).json({ message: 'Vehicle not found' });
        }
      }

      res.status(200).json({
        cashBalance: wallet.cashBalance,
        bankBalance: wallet.bankBalance,
        totalBalance: wallet.totalBalance,
        wallet: {
          cashBalance: wallet.cashBalance,
          bankBalance: wallet.bankBalance,
          totalBalance: wallet.totalBalance,
        },
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching wallet', error: error.message });
    }
  }

  // GET /api/vehicles/:vehicleId/wallet/transactions?month=YYYY-MM
  async getWalletTransactions(req, res) {
    try {
      const vehicleId = req.params.vehicleId;
      let startDate, endDate;

      if (req.query.month) {
        const [yearStr, monthStr] = req.query.month.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10); // 1-12
        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
          return res.status(400).json({ message: 'Invalid month format. Expected YYYY-MM' });
        }
        startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
        endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      } else {
        const now = new Date();
        startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
        endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      }

      const transactions = await WalletTransaction.find({
        vehicleId,
        $or: [
          { transactionDate: { $gte: startDate, $lte: endDate } },
          {
            transactionDate: { $exists: false },
            createdAt: { $gte: startDate, $lte: endDate },
          },
        ],
      })
        .populate('createdBy', 'username')
        .sort({ transactionDate: -1, createdAt: -1 });

      let monthIncome = 0;
      let monthExpense = 0;

      for (const tx of transactions) {
        if (tx.type === 'income') {
          monthIncome += tx.amount;
        } else if (tx.type === 'expense') {
          monthExpense += tx.amount;
        }
      }

      res.status(200).json({
        transactions,
        monthIncome,
        monthExpense,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching transactions', error: error.message });
    }
  }

  // POST /api/vehicles/:vehicleId/wallet/transactions
  async addTransaction(req, res) {
    try {
      const vehicleId = req.params.vehicleId;
      const { type, paymentMethod, amount, note, source, bookingId, transactionDate } = req.body;

      if (!type || !paymentMethod || amount === undefined) {
        return res.status(400).json({ message: 'type, paymentMethod, and amount are required' });
      }

      if (amount < 0.01) {
        return res.status(400).json({ message: 'amount must be at least 0.01' });
      }

      let parsedDate = transactionDate ? new Date(transactionDate) : new Date();
      if (isNaN(parsedDate.getTime())) {
        parsedDate = new Date();
      }

      const { transaction, warnings } = await this._runInTransaction(async (session) => {
        const walletQuery = Wallet.findOne({ vehicleId });
        if (session) walletQuery.session(session);
        let wallet = await walletQuery;

        if (!wallet) {
          const vehicle = await Vehicle.findById(vehicleId);
          if (vehicle) {
            wallet = new Wallet({
              vehicleId,
              cashBalance: 0,
              bankBalance: 0,
              totalBalance: 0,
            });
            if (session) {
              await wallet.save({ session });
            } else {
              await wallet.save();
            }
          } else {
            const notFoundErr = new Error('Vehicle not found');
            notFoundErr.statusCode = 404;
            throw notFoundErr;
          }
        }

        const transaction = new WalletTransaction({
          walletId: wallet._id,
          vehicleId,
          type,
          paymentMethod,
          amount,
          note,
          transactionDate: parsedDate,
          source: source || 'manual',
          bookingId,
          createdBy: req.user._id,
        });

        if (session) {
          await transaction.save({ session });
        } else {
          await transaction.save();
        }

        const updatedWallet = await walletService.applyTransaction(session, wallet, type, paymentMethod, amount);
        const warnings = walletService.buildWarnings(updatedWallet);

        return { transaction, warnings };
      });

      res.status(201).json({ transaction, warnings });
    } catch (error) {
      if (error.statusCode === 404 || error.message === 'Vehicle not found') {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      res.status(500).json({ message: 'Error adding transaction', error: error.message });
    }
  }

  // PATCH /api/vehicles/:vehicleId/wallet/transactions/:id
  async editTransaction(req, res) {
    try {
      const { id } = req.params;
      const { type, paymentMethod, amount, note } = req.body;

      if (amount !== undefined && amount < 0.01) {
        return res.status(400).json({ message: 'amount must be at least 0.01' });
      }

      const transaction = await WalletTransaction.findById(id);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const wallet = await Wallet.findById(transaction.walletId);
      
      // Reverse old transaction effects
      await walletService.reverseTransaction(null, wallet, transaction);

      // Apply new fields
      if (type) transaction.type = type;
      if (paymentMethod) transaction.paymentMethod = paymentMethod;
      if (amount !== undefined) transaction.amount = amount;
      if (note !== undefined) transaction.note = note;

      await transaction.save();

      // Apply new transaction effects
      const updatedWallet = await walletService.applyTransaction(null, wallet, transaction.type, transaction.paymentMethod, transaction.amount);
      const warnings = walletService.buildWarnings(updatedWallet);

      res.status(200).json({ transaction, warnings });
    } catch (error) {
      if (error.message === 'Transaction not found') {
         return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: 'Error editing transaction', error: error.message });
    }
  }

  // DELETE /api/vehicles/:vehicleId/wallet/transactions/:id
  async deleteTransaction(req, res) {
    try {
      const { id } = req.params;

      const transaction = await WalletTransaction.findById(id);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const wallet = await Wallet.findById(transaction.walletId);

      // Reverse old transaction effects
      const updatedWallet = await walletService.reverseTransaction(null, wallet, transaction);
      const warnings = walletService.buildWarnings(updatedWallet);

      await transaction.deleteOne();

      res.status(200).json({ message: 'Transaction deleted successfully', warnings });
    } catch (error) {
      if (error.message === 'Transaction not found') {
         return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: 'Error deleting transaction', error: error.message });
    }
  }
}

module.exports = new WalletController();

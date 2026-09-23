const walletRepository = require('../repositories/walletRepository');
const vehicleRepository = require('../repositories/vehicleRepository');
const { runInTransaction } = require('../utils/transactionRunner');
const { getMonthBoundsUTC } = require('../utils/dateUtils');
const { roundCurrency } = require('../utils/currencyUtils');
const AppError = require('../utils/AppError');

class WalletService {
  /**
   * Applies a transaction to a wallet's balances atomically via MongoDB $inc.
   *
   * @param {Object} session - Mongoose session
   * @param {Object|String} wallet - Wallet document or wallet ID
   * @param {String} type - 'income' or 'expense'
   * @param {String} paymentMethod - 'cash' or 'bank'
   * @param {Number} amount - The transaction amount
   * @returns {Promise<Object>} The updated wallet document
   */
  async applyTransaction(session, wallet, type, paymentMethod, amount) {
    const numAmount = roundCurrency(amount);
    const delta = type === 'income' ? numAmount : -numAmount;
    const field = paymentMethod === 'cash' ? 'cashBalance' : 'bankBalance';
    const walletId = wallet._id || wallet;

    return await walletRepository.atomicIncrement(walletId, field, delta, session);
  }

  /**
   * Reverses a previous transaction on a wallet's balances atomically via MongoDB $inc.
   *
   * @param {Object} session - Mongoose session
   * @param {Object|String} wallet - Wallet document or wallet ID
   * @param {Object} oldTx - The old WalletTransaction document to reverse
   * @returns {Promise<Object>} The updated wallet document
   */
  async reverseTransaction(session, wallet, oldTx) {
    // Reversing is applying the opposite amount
    const reverseType = oldTx.type === 'income' ? 'expense' : 'income';
    return await this.applyTransaction(session, wallet, reverseType, oldTx.paymentMethod, oldTx.amount);
  }

  /**
   * Checks if any balances are negative and returns warning flags.
   *
   * @param {Object} wallet - Wallet document
   * @returns {Object} Warnings object
   */
  buildWarnings(wallet) {
    if (!wallet) return { cashBalanceNegative: false, bankBalanceNegative: false };
    return {
      cashBalanceNegative: wallet.cashBalance < 0,
      bankBalanceNegative: wallet.bankBalance < 0,
    };
  }

  /**
   * Gets or initializes the wallet for a given vehicle.
   */
  async getWallet(vehicleId) {
    let wallet = await walletRepository.findByVehicleId(vehicleId);

    if (!wallet) {
      const vehicle = await vehicleRepository.findById(vehicleId);
      if (vehicle) {
        wallet = await walletRepository.createWallet({
          vehicleId,
          cashBalance: 0,
          bankBalance: 0,
        });
      } else {
        throw new AppError('Vehicle not found', 404);
      }
    }

    return {
      cashBalance: wallet.cashBalance,
      bankBalance: wallet.bankBalance,
      totalBalance: wallet.totalBalance,
      wallet: {
        cashBalance: wallet.cashBalance,
        bankBalance: wallet.bankBalance,
        totalBalance: wallet.totalBalance,
      },
    };
  }

  /**
   * Lists transactions for a vehicle in a specific month and totals income/expense.
   */
  async getWalletTransactions(vehicleId, month, queryParams = {}) {
    const { page, limit } = queryParams;

    const filter = { vehicleId };

    if (month && month !== 'all') {
      const { start: startDate, end: endDate } = getMonthBoundsUTC(month);
      filter.$or = [
        { transactionDate: { $gte: startDate, $lte: endDate } },
        {
          transactionDate: { $exists: false },
          createdAt: { $gte: startDate, $lte: endDate },
        },
      ];
    }

    // Calculate accurate monthIncome and monthExpense across all transactions in that month/period
    const allMonthTransactions = await walletRepository.findTransactions(
      filter,
      null,
      { transactionDate: -1, createdAt: -1, _id: -1 }
    );

    let monthIncome = 0;
    let monthExpense = 0;

    for (const tx of allMonthTransactions) {
      if (tx.type === 'income') {
        monthIncome = roundCurrency(monthIncome + tx.amount);
      } else if (tx.type === 'expense') {
        monthExpense = roundCurrency(monthExpense + tx.amount);
      }
    }

    const totalCount = allMonthTransactions.length;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(1000, parseInt(limit, 10) || 100));
    const skip = (pageNum - 1) * limitNum;

    // Fetch paginated and populated transactions capped at limitNum (max 100)
    const transactions = await walletRepository.findTransactions(
      filter,
      [
        { path: 'createdBy', select: 'username role' },
        { path: 'bookingId', select: 'customerName startDateTime endDateTime totalAmount' },
      ],
      { transactionDate: -1, createdAt: -1, _id: -1 },
      limitNum,
      skip
    );

    return {
      totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      transactions,
      monthIncome: roundCurrency(monthIncome),
      monthExpense: roundCurrency(monthExpense),
    };
  }

  /**
   * Adds a manual or system transaction to a vehicle wallet.
   */
  async addTransaction(vehicleId, transactionData, userId) {
    const { type, paymentMethod, amount, note, source, bookingId, transactionDate } = transactionData;
    const numAmount = Number(amount);
    const parsedDate = transactionDate ? new Date(transactionDate) : new Date();

    return await runInTransaction(async (session) => {
      let wallet = await walletRepository.findByVehicleId(vehicleId, session);

      if (!wallet) {
        const vehicle = await vehicleRepository.findById(vehicleId);
        if (vehicle) {
          wallet = await walletRepository.createWallet(
            {
              vehicleId,
              cashBalance: 0,
              bankBalance: 0,
            },
            session
          );
        } else {
          throw new AppError('Vehicle not found', 404);
        }
      }

      const transaction = await walletRepository.createTransaction(
        {
          walletId: wallet._id,
          vehicleId,
          type,
          paymentMethod,
          amount: numAmount,
          note: note ? note.trim() : undefined,
          transactionDate: parsedDate,
          source: source || 'manual',
          bookingId: bookingId || undefined,
          createdBy: userId,
        },
        session
      );

      const updatedWallet = await this.applyTransaction(session, wallet, type, paymentMethod, numAmount);
      const warnings = this.buildWarnings(updatedWallet);

      await transaction.populate({ path: 'createdBy', select: 'username role' });

      return { transaction, warnings };
    });
  }

  /**
   * Edits a transaction and recalculates the wallet balances.
   */
  async editTransaction(id, updateData) {
    const { type, paymentMethod, amount, note } = updateData;

    const transaction = await walletRepository.findTransactionById(id);
    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    const wallet = await walletRepository.findById(transaction.walletId);
    if (!wallet) {
      throw new AppError('Wallet not found', 404);
    }

    return await runInTransaction(async (session) => {
      // Reverse old transaction effects atomically
      await this.reverseTransaction(session, wallet, transaction);

      // Apply new fields
      if (type) transaction.type = type;
      if (paymentMethod) transaction.paymentMethod = paymentMethod;
      if (amount !== undefined) transaction.amount = Number(amount);
      if (note !== undefined) transaction.note = note ? note.trim() : '';

      await walletRepository.save(transaction, session);

      // Apply new transaction effects atomically
      const updatedWallet = await this.applyTransaction(
        session,
        wallet,
        transaction.type,
        transaction.paymentMethod,
        transaction.amount
      );
      const warnings = this.buildWarnings(updatedWallet);

      return { transaction, warnings };
    });
  }

  /**
   * Deletes a transaction and reverses its effect on the wallet balance.
   */
  async deleteTransaction(id) {
    const transaction = await walletRepository.findTransactionById(id);
    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    const wallet = await walletRepository.findById(transaction.walletId);
    if (!wallet) {
      throw new AppError('Wallet not found', 404);
    }

    return await runInTransaction(async (session) => {
      const updatedWallet = await this.reverseTransaction(session, wallet, transaction);
      const warnings = this.buildWarnings(updatedWallet);

      await walletRepository.deleteTransaction(transaction);

      return { warnings };
    });
  }
}

module.exports = new WalletService();

class WalletService {
  /**
   * Applies a transaction to a wallet's balances.
   * Modifies the wallet object in place and saves it within the provided session.
   *
   * @param {Object} session - Mongoose session
   * @param {Object} wallet - Wallet document
   * @param {String} type - 'income' or 'expense'
   * @param {String} paymentMethod - 'cash' or 'bank'
   * @param {Number} amount - The transaction amount
   * @returns {Promise<Object>} The updated wallet document
   */
  async applyTransaction(session, wallet, type, paymentMethod, amount) {
    const delta = type === 'income' ? amount : -amount;

    if (paymentMethod === 'cash') {
      wallet.cashBalance += delta;
    } else if (paymentMethod === 'bank') {
      wallet.bankBalance += delta;
    }

    return await wallet.save({ session });
  }

  /**
   * Reverses a previous transaction on a wallet's balances.
   * Modifies the wallet object in place and saves it within the provided session.
   *
   * @param {Object} session - Mongoose session
   * @param {Object} wallet - Wallet document
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
    return {
      cashBalanceNegative: wallet.cashBalance < 0,
      bankBalanceNegative: wallet.bankBalance < 0,
    };
  }
}

module.exports = new WalletService();

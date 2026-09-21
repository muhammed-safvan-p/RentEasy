const mongoose = require('mongoose');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');

class WalletRepository {
  async findByVehicleId(vehicleId, session = null) {
    let query = Wallet.findOne({ vehicleId });
    if (session) {
      query = query.session(session);
    }
    return await query;
  }

  async findByVehicleIds(vehicleIds, select = null) {
    let query = Wallet.find({ vehicleId: { $in: vehicleIds } });
    if (select) {
      query = query.select(select);
    }
    return await query;
  }

  async findById(id, session = null) {
    let query = Wallet.findById(id);
    if (session) {
      query = query.session(session);
    }
    return await query;
  }

  async createWallet(walletData, session = null) {
    const wallet = new Wallet(walletData);
    return await wallet.save({ session: session || undefined });
  }

  async save(wallet, session = null) {
    return await wallet.save({ session: session || undefined });
  }

  /**
   * Performs an atomic MongoDB $inc update on a wallet balance field.
   * Concurrency-safe against race conditions and lost updates.
   */
  async atomicIncrement(walletId, field, delta, session = null) {
    let query = Wallet.findByIdAndUpdate(
      walletId,
      { $inc: { [field]: delta } },
      { returnDocument: 'after' }
    );
    if (session) {
      query = query.session(session);
    }
    return await query;
  }

  /**
   * General atomic findByIdAndUpdate on Wallet.
   */
  async findByIdAndUpdate(id, update, options = {}, session = null) {
    let query = Wallet.findByIdAndUpdate(
      id,
      update,
      { returnDocument: 'after', ...options }
    );
    if (session) {
      query = query.session(session);
    }
    return await query;
  }

  async createTransaction(transactionData, session = null) {
    const transaction = new WalletTransaction(transactionData);
    return await transaction.save({ session: session || undefined });
  }

  async findTransactions(filter = {}, populate = null, sort = { transactionDate: -1, createdAt: -1 }, limit = null, skip = null) {
    let query = WalletTransaction.find(filter);
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach((p) => {
          query = query.populate(p);
        });
      } else {
        query = query.populate(populate);
      }
    }
    if (sort) {
      query = query.sort(sort);
    }
    if (skip) {
      query = query.skip(skip);
    }
    if (limit) {
      query = query.limit(limit);
    }
    return await query;
  }

  async findTransactionById(id) {
    return await WalletTransaction.findById(id);
  }

  async deleteTransaction(transaction) {
    return await transaction.deleteOne();
  }

  async findIncomeTransactionsByVehicle(vehicleId) {
    return await WalletTransaction.find({ vehicleId, type: 'income' });
  }

  /**
   * MongoDB aggregation pipeline to compute total income revenue for a vehicle.
   */
  async aggregateTotalRevenue(vehicleId) {
    const objectId = typeof vehicleId === 'string' ? new mongoose.Types.ObjectId(vehicleId) : vehicleId;
    const result = await WalletTransaction.aggregate([
      { $match: { vehicleId: objectId, type: 'income' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } },
    ]);
    return result[0]?.totalRevenue || 0;
  }

  /**
   * Delete the wallet document for a vehicle.
   */
  async deleteByVehicleId(vehicleId, session = null) {
    return await Wallet.deleteOne({ vehicleId }, { session: session || undefined });
  }

  /**
   * Delete all transactions for a vehicle.
   */
  async deleteTransactionsByVehicleId(vehicleId, session = null) {
    return await WalletTransaction.deleteMany({ vehicleId }, { session: session || undefined });
  }
}

module.exports = new WalletRepository();

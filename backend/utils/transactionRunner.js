const mongoose = require('mongoose');

/**
 * Executes a callback within a MongoDB session/transaction.
 * If the MongoDB instance does not support transactions (e.g. standalone mode without replica set),
 * it gracefully falls back to executing the callback with a null session.
 *
 * @param {Function} callback - async (session) => result
 * @returns {Promise<any>}
 */
async function runInTransaction(callback) {
  let session = null;
  try {
    session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    return result;
  } catch (error) {
    // Check if error is due to transactions not supported (standalone MongoDB instance)
    const isStandaloneError =
      error.message &&
      (error.message.includes('replica set') ||
        error.message.includes('Transaction numbers are only allowed') ||
        error.message.includes('Transactions are not supported') ||
        error.message.includes('mongos') ||
        error.code === 20 ||
        error.codeName === 'IllegalOperation');

    if (isStandaloneError) {
      return await callback(null);
    }
    throw error;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

module.exports = { runInTransaction };

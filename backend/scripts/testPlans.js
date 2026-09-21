const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Booking = require('../models/Booking');
const VehicleLock = require('../models/VehicleLock');
const WalletTransaction = require('../models/WalletTransaction');
const Dealer = require('../models/Dealer');

async function testPlans() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/renteasy');

  const dummyVehicleId = new mongoose.Types.ObjectId();

  console.log('--- 1. Overlap Check Explain ---');
  const overlapPlan = await Booking.find({
    vehicleId: dummyVehicleId,
    isCancelled: false,
    startDateTime: { $lt: new Date('2026-10-05') },
    endDateTime: { $gt: new Date('2026-10-01') },
  }).explain('queryPlanner');

  const winningStage = overlapPlan.queryPlanner.winningPlan;
  console.log('Winning Plan Stage:', winningStage.stage);
  console.log('Index Used:', JSON.stringify(winningStage).match(/"indexName":"([^"]+)"/)?.[1] || 'None');

  console.log('\n--- 2. Admin Global Booking List Sort Explain ---');
  const adminListPlan = await Booking.find({})
    .sort({ startDateTime: -1 })
    .limit(50)
    .explain('queryPlanner');

  const adminStage = adminListPlan.queryPlanner.winningPlan;
  console.log('Winning Plan Stage:', adminStage.stage);
  const hasInMemorySort = JSON.stringify(adminStage).includes('"stage":"SORT"');
  console.log('Has In-Memory SORT Stage?', hasInMemorySort);
  console.log('Index Used in Plan:', JSON.stringify(adminStage).match(/"indexName":"([^"]+)"/)?.[1] || 'None');

  console.log('\n--- 3. Monthly Wallet Transaction Sort Explain ---');
  const walletPlan = await WalletTransaction.find({
    vehicleId: dummyVehicleId,
  })
    .sort({ transactionDate: -1, createdAt: -1 })
    .explain('queryPlanner');

  const walletStage = walletPlan.queryPlanner.winningPlan;
  console.log('Winning Plan Stage:', walletStage.stage);
  const walletHasInMemorySort = JSON.stringify(walletStage).includes('"stage":"SORT"');
  console.log('Has In-Memory SORT Stage?', walletHasInMemorySort);
  console.log('Index Used in Plan:', JSON.stringify(walletStage).match(/"indexName":"([^"]+)"/)?.[1] || 'None');

  console.log('\n--- 4. Dealer Collation Exact Lookup Explain ---');
  const dealerPlan = await Dealer.find({
    vehicleId: dummyVehicleId,
    name: 'Sample Dealer',
  })
    .collation({ locale: 'en', strength: 2 })
    .explain('queryPlanner');

  const dealerStage = dealerPlan.queryPlanner.winningPlan;
  console.log('Winning Plan Stage:', dealerStage.stage);
  console.log('Index Used in Plan:', JSON.stringify(dealerStage).match(/"indexName":"([^"]+)"/)?.[1] || 'None');

  await mongoose.disconnect();
}

testPlans().catch(console.error);

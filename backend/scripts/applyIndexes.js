/**
 * RentEase MongoDB Index Migration & Sync Script
 *
 * Connects to the database, synchronizes indexes via Mongoose schemas,
 * removes obsolete indexes, and outputs active index definitions.
 */

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '../.env') });

// Load models
const Booking = require('../models/Booking');
const VehicleLock = require('../models/VehicleLock');
const WalletTransaction = require('../models/WalletTransaction');
const BookingPayment = require('../models/BookingPayment');
const Vehicle = require('../models/Vehicle');
const Dealer = require('../models/Dealer');
const User = require('../models/User');
const Wallet = require('../models/Wallet');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/renteasy';

async function run() {
  console.log('='.repeat(65));
  console.log('RentEase MongoDB Index Application & Optimization Script');
  console.log('='.repeat(65));
  console.log(`Connecting to: ${mongoUri}`);

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected successfully to MongoDB.\n');

    const db = mongoose.connection.db;

    // 1. Drop redundant/obsolete indexes if they exist
    console.log('Checking for obsolete indexes...');

    const drops = [
      { coll: 'bookings', name: 'vehicleId_1_startDateTime_1_endDateTime_1' },
      { coll: 'vehiclelocks', name: 'vehicleId_1_startDate_1_endDate_1' },
      { coll: 'wallettransactions', name: 'vehicleId_1_transactionDate_-1' },
    ];

    for (const item of drops) {
      try {
        const collection = db.collection(item.coll);
        const indexes = await collection.indexes();
        if (indexes.some((i) => i.name === item.name)) {
          console.log(`  -> Dropping obsolete index [${item.name}] on collection [${item.coll}]`);
          await collection.dropIndex(item.name);
        }
      } catch (err) {
        console.log(`  -> Notice on [${item.coll}]: ${err.message}`);
      }
    }

    // 2. Synchronize all models' indexes
    console.log('\nSynchronizing schema indexes across all collections...');
    const models = [
      { name: 'Booking', model: Booking },
      { name: 'VehicleLock', model: VehicleLock },
      { name: 'WalletTransaction', model: WalletTransaction },
      { name: 'BookingPayment', model: BookingPayment },
      { name: 'Vehicle', model: Vehicle },
      { name: 'Dealer', model: Dealer },
      { name: 'User', model: User },
      { name: 'Wallet', model: Wallet },
    ];

    for (const { name, model } of models) {
      process.stdout.write(`  - Syncing ${name.padEnd(18)}... `);
      await model.syncIndexes();
      console.log('OK');
    }

    // 3. Print active indexes
    console.log('\n' + '='.repeat(65));
    console.log('Active Database Indexes Summary:');
    console.log('='.repeat(65));

    const collections = [
      'bookings',
      'vehiclelocks',
      'wallettransactions',
      'bookingpayments',
      'vehicles',
      'dealers',
      'users',
      'wallets',
    ];

    for (const collName of collections) {
      const coll = db.collection(collName);
      const indexes = await coll.indexes();
      console.log(`\nCollection: [${collName}] (${indexes.length} indexes)`);
      indexes.forEach((idx) => {
        const keys = JSON.stringify(idx.key);
        const flags = [];
        if (idx.unique) flags.push('unique');
        if (idx.sparse) flags.push('sparse');
        if (idx.collation) flags.push(`collation: ${idx.collation.locale}`);
        const flagStr = flags.length ? ` [${flags.join(', ')}]` : '';
        console.log(`  - ${idx.name.padEnd(52)} : ${keys}${flagStr}`);
      });
    }

    console.log('\n' + '='.repeat(65));
    console.log('All indexes synchronized and verified successfully!');
    console.log('='.repeat(65));
  } catch (err) {
    console.error('\nError applying indexes:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

run();

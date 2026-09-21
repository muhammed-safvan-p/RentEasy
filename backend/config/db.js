const mongoose = require('mongoose');

let listenersRegistered = false;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    if (!listenersRegistered) {
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected. Reconnecting...');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected.');
      });

      listenersRegistered = true;
    }

    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const walletService = require('../services/walletService');

class BookingController {
  // PATCH /api/bookings/:id/pay
  async markAsPaid(req, res) {
    try {
      const { id } = req.params;
      const { paymentMethod } = req.body;

      if (!['cash', 'bank'].includes(paymentMethod)) {
        return res.status(400).json({ message: 'Invalid paymentMethod. Must be cash or bank.' });
      }

      const booking = await Booking.findById(id);
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.isPaid) {
         return res.status(400).json({ message: 'Booking is already paid' });
      }

      // Mark booking as paid
      booking.isPaid = true;
      booking.paidAt = new Date();
      booking.paymentMethod = paymentMethod;
      await booking.save();

      const wallet = await Wallet.findOne({ vehicleId: booking.vehicleId });
      if (!wallet) {
         throw new Error('Wallet not found for this booking\'s vehicle');
      }

      // Create WalletTransaction
      const transaction = new WalletTransaction({
        walletId: wallet._id,
        vehicleId: booking.vehicleId,
        type: 'income',
        paymentMethod,
        amount: booking.amount,
        note: `Payment for booking ${booking._id}`,
        source: 'booking',
        bookingId: booking._id,
        createdBy: req.user._id,
      });

      await transaction.save();

      // Update wallet balance
      const updatedWallet = await walletService.applyTransaction(null, wallet, 'income', paymentMethod, booking.amount);
      const warnings = walletService.buildWarnings(updatedWallet);

      res.status(200).json({ booking, transaction, warnings });
    } catch (error) {
      if (['Booking not found', "Wallet not found for this booking's vehicle"].includes(error.message)) {
         return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: 'Error marking booking as paid', error: error.message });
    }
  }
}

module.exports = new BookingController();

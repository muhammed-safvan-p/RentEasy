const bookingService = require('../services/bookingService');

class BookingController {
  /**
   * POST /api/bookings
   * Create a new booking with transactional overlap checking.
   */
  async createBooking(req, res, next) {
    try {
      const { vehicleId, customerName, startDateTime, endDateTime, totalAmount } = req.body;
      const { booking, suggestedAmount } = await bookingService.createBooking({
        vehicleId,
        customerName,
        startDateTime,
        endDateTime,
        totalAmount,
        createdBy: req.user._id,
        user: req.user,
      });

      res.status(201).json({
        message: 'Booking created successfully',
        booking,
        suggestedAmount,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/bookings/:id
   * Edit booking details/dates with transactional overlap check (excluding self).
   */
  async updateBooking(req, res, next) {
    try {
      const { id } = req.params;
      const updatedBooking = await bookingService.updateBooking(id, req.body, req.user);

      res.status(200).json({
        message: 'Booking updated successfully',
        booking: updatedBooking,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/bookings/:id/cancel
   * Cancel booking (soft delete), optional refund creates expense WalletTransaction.
   */
  async cancelBooking(req, res, next) {
    try {
      const { id } = req.params;
      const { refundAmount, refundPaymentMethod, cancellationNote } = req.body;

      const result = await bookingService.cancelBooking(id, {
        refundAmount,
        refundPaymentMethod,
        cancellationNote,
        cancelledBy: req.user._id,
        user: req.user,
      });

      res.status(200).json({
        message: 'Booking cancelled successfully',
        booking: result.booking,
        refundTransaction: result.refundTransaction,
        warnings: result.warnings,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/bookings/:id/payments
   * Record a new part-payment -> creates BookingPayment + income WalletTransaction + updates totals.
   */
  async recordPayment(req, res, next) {
    try {
      const { id } = req.params;
      const { amount, paymentMethod, note, paidAt } = req.body;

      const result = await bookingService.recordPayment(id, {
        amount,
        paymentMethod,
        note,
        paidAt,
        recordedBy: req.user._id,
        user: req.user,
      });

      res.status(201).json({
        message: 'Payment recorded successfully',
        booking: result.booking,
        payment: result.payment,
        transaction: result.transaction,
        warnings: result.warnings,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/bookings/:id/payments
   * List all payments made against a specific booking.
   */
  async listPayments(req, res, next) {
    try {
      const { id } = req.params;
      const result = await bookingService.listPayments(id, req.user);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/bookings?vehicleId=&isCancelled=&from=&to=
   * List and filter bookings.
   */
  async listBookings(req, res, next) {
    try {
      const result = await bookingService.listBookings(req.query, req.user);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/vehicles/:id/calendar?from=&to=
   * Return vehicle's bookings in a date range for calendar UI.
   */
  async getVehicleCalendar(req, res, next) {
    try {
      const vehicleId = req.params.vehicleId || req.params.id;
      const result = await bookingService.getVehicleCalendar(vehicleId, req.query, req.user);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BookingController();

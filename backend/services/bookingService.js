const bookingRepository = require('../repositories/bookingRepository');
const vehicleRepository = require('../repositories/vehicleRepository');
const walletRepository = require('../repositories/walletRepository');
const walletService = require('./walletService');
const { runInTransaction } = require('../utils/transactionRunner');
const AppError = require('../utils/AppError');

class BookingService {
  /**
   * Helper to execute work inside a MongoDB transaction session.
   */
  async runInTransaction(callback) {
    return await runInTransaction(callback);
  }

  /**
   * Checks if there are overlapping active (non-cancelled) bookings for a vehicle.
   */
  async checkOverlap({ vehicleId, startDateTime, endDateTime, excludeBookingId = null, session = null }) {
    return await bookingRepository.findOverlapping({
      vehicleId,
      startDateTime,
      endDateTime,
      excludeBookingId,
      session,
    });
  }

  /**
   * Calculates auto-suggested total amount based on vehicle hourlyRate or dailyRate.
   */
  calculateSuggestedAmount(vehicle, startDateTime, endDateTime) {
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return 0;

    const hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    if (vehicle.hourlyRate && vehicle.hourlyRate > 0) {
      return hours * vehicle.hourlyRate;
    }
    if (vehicle.dailyRate && vehicle.dailyRate > 0) {
      return days * vehicle.dailyRate;
    }
    return 0;
  }

  /**
   * Creates a new booking with overlap check within transaction.
   */
  async createBooking({ vehicleId, customerName, startDateTime, endDateTime, totalAmount, createdBy }) {
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found.', 404);
    }

    if (!vehicle.isActive) {
      throw new AppError('Cannot create booking for an inactive vehicle.', 400);
    }

    // Calculate suggested total amount
    const suggestedAmount = this.calculateSuggestedAmount(vehicle, start, end);

    // Determine final totalAmount (allow staff override if provided)
    let finalTotalAmount;
    if (totalAmount !== undefined && totalAmount !== null && totalAmount !== '') {
      finalTotalAmount = Number(totalAmount);
    } else {
      finalTotalAmount = suggestedAmount;
    }

    // Concurrency-safe overlap check & booking creation
    const createdBooking = await runInTransaction(async (session) => {
      const conflictingBooking = await this.checkOverlap({
        vehicleId,
        startDateTime: start,
        endDateTime: end,
        session,
      });

      if (conflictingBooking) {
        const conflictError = new AppError('Vehicle already booked for this time range', 409);
        conflictError.conflictingBooking = {
          id: conflictingBooking._id,
          startDateTime: conflictingBooking.startDateTime,
          endDateTime: conflictingBooking.endDateTime,
        };
        throw conflictError;
      }

      return await bookingRepository.create(
        {
          vehicleId,
          createdBy,
          customerName: customerName.trim(),
          startDateTime: start,
          endDateTime: end,
          totalAmount: finalTotalAmount,
          paidAmount: 0,
          balanceAmount: finalTotalAmount,
          refundedAmount: 0,
          isCancelled: false,
        },
        session
      );
    });

    return {
      booking: createdBooking,
      suggestedAmount,
    };
  }

  /**
   * Updates an existing booking.
   */
  async updateBooking(id, updateData) {
    const { customerName, startDateTime, endDateTime, totalAmount, vehicleId } = updateData;

    const booking = await bookingRepository.findById(id);
    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }

    if (booking.isCancelled) {
      throw new AppError('Cannot edit a cancelled booking.', 400);
    }

    const targetVehicleId = vehicleId || booking.vehicleId;
    const newStart = startDateTime ? new Date(startDateTime) : booking.startDateTime;
    const newEnd = endDateTime ? new Date(endDateTime) : booking.endDateTime;

    if (newStart >= newEnd) {
      throw new AppError('endDateTime must be strictly after startDateTime.', 400);
    }

    // Check if vehicle is valid
    if (vehicleId && vehicleId.toString() !== booking.vehicleId.toString()) {
      const vehicle = await vehicleRepository.findById(vehicleId);
      if (!vehicle) {
        throw new AppError('New vehicle not found.', 404);
      }
      if (!vehicle.isActive) {
        throw new AppError('Cannot move booking to an inactive vehicle.', 400);
      }
    }

    return await runInTransaction(async (session) => {
      // Re-verify overlap if dates or vehicle changed
      const datesOrVehicleChanged =
        newStart.getTime() !== booking.startDateTime.getTime() ||
        newEnd.getTime() !== booking.endDateTime.getTime() ||
        targetVehicleId.toString() !== booking.vehicleId.toString();

      if (datesOrVehicleChanged) {
        const conflictingBooking = await this.checkOverlap({
          vehicleId: targetVehicleId,
          startDateTime: newStart,
          endDateTime: newEnd,
          excludeBookingId: booking._id,
          session,
        });

        if (conflictingBooking) {
          const conflictError = new AppError('Vehicle already booked for this time range', 409);
          conflictError.conflictingBooking = {
            id: conflictingBooking._id,
            startDateTime: conflictingBooking.startDateTime,
            endDateTime: conflictingBooking.endDateTime,
          };
          throw conflictError;
        }
      }

      if (customerName) {
        booking.customerName = customerName.trim();
      }
      booking.startDateTime = newStart;
      booking.endDateTime = newEnd;
      booking.vehicleId = targetVehicleId;

      if (totalAmount !== undefined && totalAmount !== null && totalAmount !== '') {
        const numAmount = Number(totalAmount);
        if (numAmount < booking.paidAmount) {
          throw new AppError(
            `New total amount (${numAmount}) cannot be less than already paid amount (${booking.paidAmount}).`,
            400
          );
        }
        booking.totalAmount = numAmount;
        // Recompute balance without retroactively altering paidAmount
        booking.balanceAmount = booking.totalAmount - booking.paidAmount;
      }

      await bookingRepository.save(booking, session);
      return booking;
    });
  }

  /**
   * Cancels a booking and optionally records refund transaction.
   */
  async cancelBooking(id, { refundAmount, refundPaymentMethod, cancellationNote, cancelledBy }) {
    const booking = await bookingRepository.findById(id);
    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }

    if (booking.isCancelled) {
      throw new AppError('Booking is already cancelled.', 400);
    }

    let parsedRefundAmount = 0;
    if (refundAmount !== undefined && refundAmount !== null && refundAmount !== '') {
      parsedRefundAmount = Number(refundAmount);
      const maxRefundable = (booking.paidAmount || 0) - (booking.refundedAmount || 0);
      if (parsedRefundAmount > maxRefundable) {
        throw new AppError(
          `Refund amount (${parsedRefundAmount}) cannot exceed refundable balance (${maxRefundable}).`,
          400
        );
      }
    }

    const result = await runInTransaction(async (session) => {
      let refundTransaction = null;
      let updatedWallet = null;

      if (parsedRefundAmount > 0) {
        let wallet = await walletRepository.findByVehicleId(booking.vehicleId, session);
        if (!wallet) {
          wallet = await walletRepository.createWallet(
            { vehicleId: booking.vehicleId, cashBalance: 0, bankBalance: 0 },
            session
          );
        }

        refundTransaction = await walletRepository.createTransaction(
          {
            walletId: wallet._id,
            vehicleId: booking.vehicleId,
            type: 'expense',
            paymentMethod: refundPaymentMethod,
            amount: parsedRefundAmount,
            note: cancellationNote
              ? `Refund for cancelled booking: ${cancellationNote.trim()}`
              : `Refund for cancelled booking ${booking._id}`,
            source: 'booking',
            bookingId: booking._id,
            createdBy: cancelledBy,
            transactionDate: new Date(),
          },
          session
        );

        updatedWallet = await walletService.applyTransaction(
          session,
          wallet,
          'expense',
          refundPaymentMethod,
          parsedRefundAmount
        );
        booking.refundedAmount = (booking.refundedAmount || 0) + parsedRefundAmount;
      }

      booking.isCancelled = true;
      booking.cancelledAt = new Date();
      booking.cancelledBy = cancelledBy;
      booking.cancellationNote = cancellationNote ? cancellationNote.trim() : null;

      await bookingRepository.save(booking, session);

      return {
        booking,
        refundTransaction,
        wallet: updatedWallet,
      };
    });

    const warnings = result.wallet ? walletService.buildWarnings(result.wallet) : null;

    return {
      booking: result.booking,
      refundTransaction: result.refundTransaction,
      warnings,
    };
  }

  /**
   * Records a payment against a booking.
   */
  async recordPayment(id, { amount, paymentMethod, note, paidAt, recordedBy }) {
    const numAmount = Number(amount);

    const booking = await bookingRepository.findById(id);
    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }

    if (booking.isCancelled) {
      throw new AppError('Cannot record payment on a cancelled booking.', 400);
    }

    const paymentTimestamp = paidAt && !isNaN(new Date(paidAt).getTime()) ? new Date(paidAt) : new Date();

    const result = await runInTransaction(async (session) => {
      let wallet = await walletRepository.findByVehicleId(booking.vehicleId, session);
      if (!wallet) {
        wallet = await walletRepository.createWallet(
          { vehicleId: booking.vehicleId, cashBalance: 0, bankBalance: 0 },
          session
        );
      }

      // 1. Create BookingPayment
      const bookingPayment = await bookingRepository.createPayment(
        {
          bookingId: booking._id,
          vehicleId: booking.vehicleId,
          amount: numAmount,
          paymentMethod,
          paidAt: paymentTimestamp,
          recordedBy,
          note: note ? note.trim() : undefined,
        },
        session
      );

      // 2. Create WalletTransaction
      const walletTx = await walletRepository.createTransaction(
        {
          walletId: wallet._id,
          vehicleId: booking.vehicleId,
          type: 'income',
          paymentMethod,
          amount: numAmount,
          note: note ? note.trim() : `Payment for booking ${booking._id}`,
          source: 'booking',
          bookingId: booking._id,
          createdBy: recordedBy,
          transactionDate: paymentTimestamp,
        },
        session
      );

      // 3. Update Wallet Balance
      const updatedWallet = await walletService.applyTransaction(
        session,
        wallet,
        'income',
        paymentMethod,
        numAmount
      );

      // 4. Recompute Booking Paid, Total, and Balance Amounts
      booking.paidAmount = (booking.paidAmount || 0) + numAmount;
      if (booking.paidAmount > booking.totalAmount) {
        booking.totalAmount = booking.paidAmount;
      }
      booking.balanceAmount = booking.totalAmount - booking.paidAmount;
      await bookingRepository.save(booking, session);

      return {
        booking,
        payment: bookingPayment,
        transaction: walletTx,
        wallet: updatedWallet,
      };
    });

    const warnings = walletService.buildWarnings(result.wallet);

    return {
      booking: result.booking,
      payment: result.payment,
      transaction: result.transaction,
      warnings,
    };
  }

  /**
   * Lists payments for a specific booking.
   */
  async listPayments(bookingId) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }

    const payments = await bookingRepository.findPayments(
      { bookingId },
      { path: 'recordedBy', select: 'username role' },
      { paidAt: -1 }
    );

    return {
      bookingId: booking._id,
      totalAmount: booking.totalAmount,
      paidAmount: booking.paidAmount,
      balanceAmount: booking.balanceAmount,
      payments,
    };
  }

  /**
   * Lists bookings matching filter criteria.
   */
  async listBookings(queryParams) {
    const { vehicleId, isCancelled, from, to, customerName, page = 1, limit = 50 } = queryParams;

    const filter = {};

    if (vehicleId) {
      filter.vehicleId = vehicleId;
    }

    if (isCancelled !== undefined && isCancelled !== '') {
      filter.isCancelled = isCancelled === true || isCancelled === 'true';
    }

    if (from || to) {
      if (from && to) {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        filter.startDateTime = { $lte: toDate };
        filter.endDateTime = { $gte: fromDate };
      } else if (from) {
        filter.endDateTime = { $gte: new Date(from) };
      } else if (to) {
        filter.startDateTime = { $lte: new Date(to) };
      }
    }

    if (customerName) {
      filter.customerName = { $regex: customerName.trim(), $options: 'i' };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [totalCount, bookings] = await Promise.all([
      bookingRepository.countDocuments(filter),
      bookingRepository.find(
        filter,
        [
          {
            path: 'vehicleId',
            select: 'name plateNumber imageUrl dailyRate hourlyRate fuelType transmission seatingCapacity',
          },
          { path: 'createdBy', select: 'username role' },
          { path: 'cancelledBy', select: 'username role' },
        ],
        { startDateTime: -1 },
        skip,
        limitNum
      ),
    ]);

    return {
      totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      bookings,
    };
  }

  /**
   * Returns calendar view of bookings for a vehicle.
   */
  async getVehicleCalendar(vehicleId, queryParams) {
    const { from, to, includeCancelled } = queryParams;

    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found.', 404);
    }

    const filter = { vehicleId };

    if (includeCancelled !== true && includeCancelled !== 'true') {
      filter.isCancelled = false;
    }

    if (from || to) {
      if (from && to) {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        filter.startDateTime = { $lte: toDate };
        filter.endDateTime = { $gte: fromDate };
      } else if (from) {
        filter.endDateTime = { $gte: new Date(from) };
      } else if (to) {
        filter.startDateTime = { $lte: new Date(to) };
      }
    }

    const bookings = await bookingRepository.find(
      filter,
      { path: 'createdBy', select: 'username role' },
      { startDateTime: 1 }
    );

    const formatted = bookings.map((b) => ({
      id: b._id,
      _id: b._id,
      customerName: b.customerName,
      startDateTime: b.startDateTime,
      endDateTime: b.endDateTime,
      totalAmount: b.totalAmount,
      paidAmount: b.paidAmount,
      balanceAmount: b.balanceAmount,
      refundedAmount: b.refundedAmount,
      isCancelled: b.isCancelled,
      createdBy: b.createdBy,
      cancellationNote: b.cancellationNote,
    }));

    return {
      vehicleId: vehicle._id,
      vehicleName: vehicle.name,
      plateNumber: vehicle.plateNumber,
      bookings: formatted,
    };
  }

  /**
   * Recomputes paidAmount and balanceAmount for a booking based on sum of BookingPayments.
   */
  async recomputeBookingTotals(bookingId, session = null) {
    const payments = await bookingRepository.findPaymentsByBookingId(bookingId, session);
    const paidAmount = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const booking = await bookingRepository.findById(bookingId, null, session);

    if (booking) {
      booking.paidAmount = paidAmount;
      if (booking.paidAmount > booking.totalAmount) {
        booking.totalAmount = booking.paidAmount;
      }
      booking.balanceAmount = booking.totalAmount - paidAmount;
      await bookingRepository.save(booking, session);
    }

    return booking;
  }
}

module.exports = new BookingService();

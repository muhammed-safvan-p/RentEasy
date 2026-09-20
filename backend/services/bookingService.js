const bookingRepository = require('../repositories/bookingRepository');
const vehicleRepository = require('../repositories/vehicleRepository');
const walletRepository = require('../repositories/walletRepository');
const walletService = require('./walletService');
const lockRepository = require('../repositories/lockRepository');
const { runInTransaction, isReplicaSet } = require('../utils/transactionRunner');
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
   * Scoped strictly to the VEHICLE (checks all owners' bookings on that vehicle).
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
   * Calculates auto-suggested total amount (returns 0 as rate fields have been removed).
   */
  calculateSuggestedAmount(vehicle, startDateTime, endDateTime) {
    return 0;
  }

  /**
   * Creates a new booking with race-safe, vehicle-scoped overlap prevention.
   * - Scoped strictly to the vehicle (shared calendar for all owners).
   * - In replica set: uses MongoDB multi-document transaction with vehicle write-lock serialization.
   * - In standalone MongoDB: uses Optimistic Concurrency Control (OCC) compare-and-swap on vehicle.bookingVersion,
   *   rolling back tentative booking and retrying on concurrent collisions.
   * - On overlap detection or collision: returns HTTP 409 Conflict.
   */
  async createBooking({ vehicleId, customerName, startDateTime, endDateTime, totalAmount, createdBy }) {
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    if (start >= end) {
      throw new AppError('endDateTime must be strictly after startDateTime.', 400);
    }

    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found.', 404);
    }

    if (!vehicle.isActive) {
      throw new AppError('This vehicle is currently locked/blocked by administrator. Please contact support: +91 9496432072', 403);
    }

    // Determine final totalAmount
    let finalTotalAmount = 0;
    if (totalAmount !== undefined && totalAmount !== null && totalAmount !== '') {
      finalTotalAmount = Number(totalAmount);
    }

    // Check if the requested date range falls within any locked period
    const overlappingLocks = await lockRepository.findByVehicleDateRange(vehicleId, start, end);
    if (overlappingLocks.length > 0) {
      const lock = overlappingLocks[0];
      throw new AppError(
        `This vehicle is locked from ${lock.startDate.toLocaleDateString()} to ${lock.endDate.toLocaleDateString()} — Reason: ${lock.reason}`,
        409
      );
    }

    const bookingPayload = {
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
    };

    // ── 1. REPLICA SET MODE (Transactions available) ──
    if (isReplicaSet()) {
      const createdBooking = await runInTransaction(async (session) => {
        const conflictingBooking = await this.checkOverlap({
          vehicleId,
          startDateTime: start,
          endDateTime: end,
          session,
        });

        if (conflictingBooking) {
          const conflictError = new AppError('This vehicle is already booked for the selected time.', 409);
          conflictError.conflictingBooking = {
            id: conflictingBooking._id,
            startDateTime: conflictingBooking.startDateTime,
            endDateTime: conflictingBooking.endDateTime,
          };
          throw conflictError;
        }

        // Touch vehicle bookingVersion within transaction to guarantee write-write serialization
        await vehicleRepository.touchBookingVersion(vehicleId, session);

        return await bookingRepository.create(bookingPayload, session);
      });

      return {
        booking: createdBooking,
        suggestedAmount: 0,
      };
    }

    // ── 2. STANDALONE MONGO MODE (Optimistic Concurrency Control with Compare-And-Swap) ──
    const MAX_RETRIES = 5;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      attempt++;

      // Read current vehicle state and version
      const currentVehicle = await vehicleRepository.findById(vehicleId);
      if (!currentVehicle) {
        throw new AppError('Vehicle not found.', 404);
      }
      if (!currentVehicle.isActive) {
        throw new AppError('Cannot create booking for an inactive vehicle.', 400);
      }
      const currentVersion = currentVehicle.bookingVersion || 0;

      // Check overlap across ALL bookings for this vehicle
      const conflictingBooking = await this.checkOverlap({
        vehicleId,
        startDateTime: start,
        endDateTime: end,
      });

      if (conflictingBooking) {
        const conflictError = new AppError('This vehicle is already booked for the selected time.', 409);
        conflictError.conflictingBooking = {
          id: conflictingBooking._id,
          startDateTime: conflictingBooking.startDateTime,
          endDateTime: conflictingBooking.endDateTime,
        };
        throw conflictError;
      }

      // Tentatively insert booking document
      const tentativeBooking = await bookingRepository.create(bookingPayload);

      // Atomic CAS: Only increment if vehicle bookingVersion matches currentVersion
      const versionUpdated = await vehicleRepository.incrementBookingVersion(vehicleId, currentVersion);

      if (versionUpdated) {
        // Success! Atomic compare-and-swap confirmed no concurrent bookings committed.
        return {
          booking: tentativeBooking,
          suggestedAmount: 0,
        };
      }

      // Race detected! A concurrent booking claimed this vehicle. Rollback tentative booking.
      await bookingRepository.deleteById(tentativeBooking._id);

      // If retries remain, wait small randomized jitter (10ms - 50ms) and retry
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 40) + 10));
        continue;
      }
    }

    // Retries exhausted under extreme concurrency
    throw new AppError('This vehicle is already booked for the selected time.', 409);
  }

  /**
   * Updates an existing booking with race-safe overlap check.
   * - Excludes the booking's own _id from overlap check.
   * - Atomically guards date/vehicle modifications against concurrent bookings.
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

    const currentVehicle = await vehicleRepository.findById(booking.vehicleId);
    if (currentVehicle && !currentVehicle.isActive) {
      throw new AppError('This vehicle is currently locked/blocked by administrator. Please contact support: +91 9496432072', 403);
    }

    // Check if new vehicle is valid
    if (vehicleId && vehicleId.toString() !== booking.vehicleId.toString()) {
      const vehicle = await vehicleRepository.findById(vehicleId);
      if (!vehicle) {
        throw new AppError('New vehicle not found.', 404);
      }
      if (!vehicle.isActive) {
        throw new AppError('This vehicle is currently locked/blocked by administrator. Please contact support: +91 9496432072', 403);
      }
    }

    // Validate new total amount against already paid amount if provided
    let newTotalAmount = booking.totalAmount;
    let newBalanceAmount = booking.balanceAmount;
    if (totalAmount !== undefined && totalAmount !== null && totalAmount !== '') {
      const numAmount = Number(totalAmount);
      if (numAmount < booking.paidAmount) {
        throw new AppError(
          `New total amount (${numAmount}) cannot be less than already paid amount (${booking.paidAmount}).`,
          400
        );
      }
      newTotalAmount = numAmount;
      newBalanceAmount = newTotalAmount - booking.paidAmount;
    }

    // Check if dates or vehicle changed
    const datesOrVehicleChanged =
      newStart.getTime() !== booking.startDateTime.getTime() ||
      newEnd.getTime() !== booking.endDateTime.getTime() ||
      targetVehicleId.toString() !== booking.vehicleId.toString();

    // If dates and vehicle did NOT change, no overlap check is needed. Simply update metadata.
    if (!datesOrVehicleChanged) {
      if (customerName) {
        booking.customerName = customerName.trim();
      }
      booking.totalAmount = newTotalAmount;
      booking.balanceAmount = newBalanceAmount;
      return await bookingRepository.save(booking);
    }

    // Dates or vehicle DID change. Check vehicle locks first.
    const overlappingLocks = await lockRepository.findByVehicleDateRange(targetVehicleId, newStart, newEnd);
    if (overlappingLocks.length > 0) {
      const lock = overlappingLocks[0];
      throw new AppError(
        `This vehicle is locked from ${lock.startDate.toLocaleDateString()} to ${lock.endDate.toLocaleDateString()} — Reason: ${lock.reason}`,
        409
      );
    }

    const updatedFields = {
      customerName: customerName ? customerName.trim() : booking.customerName,
      startDateTime: newStart,
      endDateTime: newEnd,
      vehicleId: targetVehicleId,
      totalAmount: newTotalAmount,
      balanceAmount: newBalanceAmount,
    };

    const originalFields = {
      customerName: booking.customerName,
      startDateTime: booking.startDateTime,
      endDateTime: booking.endDateTime,
      vehicleId: booking.vehicleId,
      totalAmount: booking.totalAmount,
      balanceAmount: booking.balanceAmount,
    };

    // ── 1. REPLICA SET MODE ──
    if (isReplicaSet()) {
      return await runInTransaction(async (session) => {
        const conflictingBooking = await this.checkOverlap({
          vehicleId: targetVehicleId,
          startDateTime: newStart,
          endDateTime: newEnd,
          excludeBookingId: booking._id,
          session,
        });

        if (conflictingBooking) {
          const conflictError = new AppError('This vehicle is already booked for the selected time.', 409);
          conflictError.conflictingBooking = {
            id: conflictingBooking._id,
            startDateTime: conflictingBooking.startDateTime,
            endDateTime: conflictingBooking.endDateTime,
          };
          throw conflictError;
        }

        await vehicleRepository.touchBookingVersion(targetVehicleId, session);

        Object.assign(booking, updatedFields);
        return await bookingRepository.save(booking, session);
      });
    }

    // ── 2. STANDALONE MONGO MODE (OCC with Compare-And-Swap) ──
    const MAX_RETRIES = 5;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      attempt++;

      const currentVehicle = await vehicleRepository.findById(targetVehicleId);
      if (!currentVehicle) {
        throw new AppError('Vehicle not found.', 404);
      }
      const currentVersion = currentVehicle.bookingVersion || 0;

      // Overlap check on targetVehicleId, excluding own booking._id
      const conflictingBooking = await this.checkOverlap({
        vehicleId: targetVehicleId,
        startDateTime: newStart,
        endDateTime: newEnd,
        excludeBookingId: booking._id,
      });

      if (conflictingBooking) {
        const conflictError = new AppError('This vehicle is already booked for the selected time.', 409);
        conflictError.conflictingBooking = {
          id: conflictingBooking._id,
          startDateTime: conflictingBooking.startDateTime,
          endDateTime: conflictingBooking.endDateTime,
        };
        throw conflictError;
      }

      // Tentatively apply updates to booking
      Object.assign(booking, updatedFields);
      await bookingRepository.save(booking);

      // Atomic CAS on Vehicle
      const versionUpdated = await vehicleRepository.incrementBookingVersion(targetVehicleId, currentVersion);

      if (versionUpdated) {
        // Success!
        return booking;
      }

      // Conflict! Roll back booking to original state
      Object.assign(booking, originalFields);
      await bookingRepository.save(booking);

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 40) + 10));
        continue;
      }
    }

    throw new AppError('This vehicle is already booked for the selected time.', 409);
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

    const vehicle = await vehicleRepository.findById(booking.vehicleId);
    if (vehicle && !vehicle.isActive) {
      throw new AppError('This vehicle is currently locked/blocked by administrator. Please contact support: +91 9496432072', 403);
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

    const vehicle = await vehicleRepository.findById(booking.vehicleId);
    if (vehicle && !vehicle.isActive) {
      throw new AppError('This vehicle is currently locked/blocked by administrator. Please contact support: +91 9496432072', 403);
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
    const limitNum = Math.max(1, Math.min(1000, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [totalCount, bookings] = await Promise.all([
      bookingRepository.countDocuments(filter),
      bookingRepository.find(
        filter,
        [
          {
            path: 'vehicleId',
            select: 'name plateNumber imageUrl fuelType transmission seatingCapacity',
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

    let fromDate = null;
    let toDate = null;
    if (from || to) {
      if (from && to) {
        fromDate = new Date(from);
        toDate = new Date(to);
        filter.startDateTime = { $lte: toDate };
        filter.endDateTime = { $gte: fromDate };
      } else if (from) {
        fromDate = new Date(from);
        filter.endDateTime = { $gte: fromDate };
      } else if (to) {
        toDate = new Date(to);
        filter.startDateTime = { $lte: toDate };
      }
    }

    const [bookings, locks] = await Promise.all([
      bookingRepository.find(
        filter,
        { path: 'createdBy', select: 'username role' },
        { startDateTime: 1 }
      ),
      fromDate && toDate
        ? lockRepository.findByVehicleDateRange(vehicleId, fromDate, toDate)
        : lockRepository.findByVehicleDateRange(
            vehicleId,
            fromDate || new Date('1970-01-01'),
            toDate || new Date('2099-12-31')
          ),
    ]);

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
      locks: locks || [],
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

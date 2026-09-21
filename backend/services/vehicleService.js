const vehicleRepository = require('../repositories/vehicleRepository');
const bookingRepository = require('../repositories/bookingRepository');
const walletRepository = require('../repositories/walletRepository');
const lockRepository = require('../repositories/lockRepository');
const { getMonthBoundsUTC } = require('../utils/dateUtils');
const AppError = require('../utils/AppError');

class VehicleService {
  async getVehicleById(vehicleOrId) {
    let vehicle;
    if (vehicleOrId && typeof vehicleOrId === 'object' && vehicleOrId._id) {
      vehicle = vehicleOrId;
      // Populate fields needed by client if not already populated
      if (!vehicle.populated('ownerIds') || !vehicle.populated('operationalNotes.createdBy')) {
        await vehicle.populate([
          { path: 'ownerIds', select: 'username' },
          { path: 'operationalNotes.createdBy', select: 'username' },
        ]);
      }
    } else {
      vehicle = await vehicleRepository.findById(vehicleOrId, [
        { path: 'ownerIds', select: 'username' },
        { path: 'operationalNotes.createdBy', select: 'username' },
      ]);
    }
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }
    return vehicle;
  }

  async addOperationalNote(vehicleOrId, text, userId) {
    const vehicle =
      vehicleOrId && typeof vehicleOrId === 'object' && vehicleOrId._id
        ? vehicleOrId
        : await vehicleRepository.findById(vehicleOrId);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    const newNote = {
      text: text.trim(),
      createdBy: userId,
      createdAt: new Date(),
    };

    vehicle.operationalNotes.push(newNote);
    await vehicleRepository.save(vehicle);

    await vehicle.populate('operationalNotes.createdBy', 'username');

    const addedNote = vehicle.operationalNotes[vehicle.operationalNotes.length - 1];

    return {
      note: addedNote,
      operationalNotes: vehicle.operationalNotes,
    };
  }

  async deleteOperationalNote(vehicleOrId, noteId, user) {
    const vehicle =
      vehicleOrId && typeof vehicleOrId === 'object' && vehicleOrId._id
        ? vehicleOrId
        : await vehicleRepository.findById(vehicleOrId);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    const note = vehicle.operationalNotes.id(noteId);
    if (!note) {
      throw new AppError('Note not found', 404);
    }

    // Authorization check: only author or admin can delete
    const isAuthor = note.createdBy.toString() === user._id.toString();
    const isAdmin = user.role === 'admin';

    if (!isAuthor && !isAdmin) {
      throw new AppError('You can only delete your own notes', 403);
    }

    note.deleteOne();
    await vehicleRepository.save(vehicle);

    return { noteId };
  }

  async getStats(vehicleId) {
    const [totalTrips, totalRevenue] = await Promise.all([
      bookingRepository.countNonCancelledByVehicle(vehicleId),
      walletRepository.aggregateTotalRevenue(vehicleId),
    ]);

    return { totalTrips, totalRevenue };
  }

  async getStatus(vehicleId) {
    const now = new Date();

    // Check if there is an active booking right now
    const activeBooking = await bookingRepository.findActiveAt(vehicleId, now);

    if (activeBooking) {
      return {
        status: 'booked',
        until: activeBooking.endDateTime,
      };
    }

    // Check if there is any upcoming booking in the future
    const futureBooking = await bookingRepository.findFirstFuture(vehicleId, now);

    if (futureBooking) {
      return {
        status: 'available',
        nextBookingDate: futureBooking.startDateTime,
      };
    }

    return {
      status: 'available',
    };
  }

  async getBookingsByMonth(vehicleId, month) {
    const { start: monthStart, end: monthEnd } = getMonthBoundsUTC(month);

    // Fetch bookings and locks in parallel for the same month
    const [bookings, locks] = await Promise.all([
      bookingRepository.findByVehicleDateRange(vehicleId, monthStart, monthEnd, false),
      lockRepository.findByVehicleDateRange(vehicleId, monthStart, monthEnd),
    ]);

    return {
      bookings: bookings.map((b) => ({
        _id: b._id,
        customerName: b.customerName,
        startDateTime: b.startDateTime,
        endDateTime: b.endDateTime,
        startDate: b.startDateTime, // compatibility alias
        endDate: b.endDateTime,     // compatibility alias
        totalAmount: b.totalAmount,
        paidAmount: b.paidAmount,
        balanceAmount: b.balanceAmount,
        amount: b.totalAmount,      // compatibility alias
        isCancelled: b.isCancelled,
        createdBy: b.createdBy
          ? { _id: b.createdBy._id, username: b.createdBy.username }
          : undefined,
      })),
      locks: locks.map((l) => ({
        _id: l._id,
        vehicleId: l.vehicleId,
        startDate: l.startDate,
        endDate: l.endDate,
        reason: l.reason,
        createdAt: l.createdAt,
        lockedBy: l.lockedBy
          ? { _id: l.lockedBy._id, username: l.lockedBy.username }
          : undefined,
      })),
    };
  }
}

module.exports = new VehicleService();

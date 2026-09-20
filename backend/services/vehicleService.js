const vehicleRepository = require('../repositories/vehicleRepository');
const bookingRepository = require('../repositories/bookingRepository');
const walletRepository = require('../repositories/walletRepository');
const lockRepository = require('../repositories/lockRepository');
const AppError = require('../utils/AppError');

class VehicleService {
  async getVehicleById(vehicleId) {
    const vehicle = await vehicleRepository.findById(vehicleId, [
      { path: 'ownerIds', select: 'username' },
      { path: 'operationalNotes.createdBy', select: 'username' },
    ]);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }
    return vehicle;
  }

  async addOperationalNote(vehicleId, text, userId) {
    const vehicle = await vehicleRepository.findById(vehicleId);
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

  async deleteOperationalNote(vehicleId, noteId, user) {
    const vehicle = await vehicleRepository.findById(vehicleId);
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
    let monthStart;
    let monthEnd;

    if (month && typeof month === 'string' && month.includes('-')) {
      const [yearStr, monthStr] = month.split('-');
      const year = parseInt(yearStr, 10);
      const monthNum = parseInt(monthStr, 10); // 1-12
      monthStart = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
      monthEnd = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));
    } else {
      const now = new Date();
      monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    }

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

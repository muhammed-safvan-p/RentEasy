const lockRepository = require('../repositories/lockRepository');
const bookingRepository = require('../repositories/bookingRepository');
const AppError = require('../utils/AppError');

class LockService {
  /**
   * Create a vehicle lock for the given date range.
   * Validates that endDate >= startDate.
   * Does NOT prevent bookings from being made over locked dates
   * (that guard is in bookingService). But we warn if active bookings overlap.
   */
  async createLock({ vehicleId, lockedBy, startDate, endDate, reason }) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError('Invalid start or end date format.', 400);
    }

    if (end <= start) {
      throw new AppError('End date & time must be strictly after start date & time.', 400);
    }

    // Check if any active (non-cancelled) bookings overlap this exact timeframe
    const Booking = require('../models/Booking');
    const overlappingBookings = await Booking.find({
      vehicleId,
      isCancelled: false,
      startDateTime: { $lt: end },
      endDateTime: { $gt: start },
    });

    if (overlappingBookings.length > 0) {
      throw new AppError(
        `Cannot lock vehicle: ${overlappingBookings.length} active booking(s) already exist during this period.`,
        409
      );
    }

    // Check if another vehicle lock overlaps this exact timeframe
    const overlappingLocks = await lockRepository.findByVehicleDateRange(vehicleId, start, end);
    if (overlappingLocks.length > 0) {
      throw new AppError(
        'Cannot lock vehicle: Another lock already overlaps this period.',
        409
      );
    }

    const lock = await lockRepository.create({
      vehicleId,
      lockedBy,
      startDate: start,
      endDate: end,
      reason: reason.trim(),
    });

    // Populate lockedBy for the response
    await lock.populate('lockedBy', 'username');

    return lock;
  }

  /**
   * Get all locks for a vehicle in a given month (YYYY-MM format).
   */
  async getLocksForMonth(vehicleId, month) {
    let monthStart, monthEnd;

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

    const locks = await lockRepository.findByVehicleDateRange(vehicleId, monthStart, monthEnd);

    return locks.map((l) => ({
      _id: l._id,
      vehicleId: l.vehicleId,
      startDate: l.startDate,
      endDate: l.endDate,
      reason: l.reason,
      createdAt: l.createdAt,
      lockedBy: l.lockedBy
        ? { _id: l.lockedBy._id, username: l.lockedBy.username }
        : undefined,
    }));
  }

  /**
   * Hard-delete a lock. Only the creator or an admin can delete.
   */
  async deleteLock(lockId, user) {
    const lock = await lockRepository.findById(lockId);
    if (!lock) {
      throw new AppError('Lock not found.', 404);
    }

    const isCreator = lock.lockedBy._id.toString() === user._id.toString();
    const isAdmin = user.role === 'admin';

    if (!isCreator && !isAdmin) {
      throw new AppError('You are not authorized to delete this lock.', 403);
    }

    await lockRepository.deleteById(lockId);
    return { lockId };
  }
}

module.exports = new LockService();

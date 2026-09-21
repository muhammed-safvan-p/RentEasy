const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const BookingPayment = require('../models/BookingPayment');

class BookingRepository {
  async findById(id, populate = null, session = null) {
    let query = Booking.findById(id);
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach((p) => {
          query = query.populate(p);
        });
      } else {
        query = query.populate(populate);
      }
    }
    if (session) {
      query = query.session(session);
    }
    return await query;
  }

  async find(filter = {}, populate = null, sort = { startDateTime: -1 }, skip = 0, limit = null) {
    let query = Booking.find(filter);
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach((p) => {
          query = query.populate(p);
        });
      } else {
        query = query.populate(populate);
      }
    }
    if (sort) {
      query = query.sort(sort);
    }
    if (skip) {
      query = query.skip(skip);
    }
    if (limit) {
      query = query.limit(limit);
    }
    return await query;
  }

  async countDocuments(filter = {}) {
    return await Booking.countDocuments(filter);
  }

  async findOverlapping({ vehicleId, startDateTime, endDateTime, excludeBookingId = null, session = null }) {
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    const query = {
      vehicleId,
      isCancelled: false,
      startDateTime: { $lt: end },
      endDateTime: { $gt: start },
    };

    if (excludeBookingId) {
      query._id = { $ne: excludeBookingId };
    }

    let queryExec = Booking.findOne(query);
    if (session) {
      queryExec = queryExec.session(session);
    }

    return await queryExec;
  }

  async findOverlappingAll({ vehicleId, startDateTime, endDateTime, session = null }) {
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    const query = {
      vehicleId,
      isCancelled: false,
      startDateTime: { $lt: end },
      endDateTime: { $gt: start },
    };

    let queryExec = Booking.find(query);
    if (session) {
      queryExec = queryExec.session(session);
    }

    return await queryExec;
  }

  async countActiveByVehicle(vehicleId, date = new Date()) {
    return await Booking.countDocuments({
      vehicleId,
      isCancelled: false,
      endDateTime: { $gte: date },
    });
  }

  async findActiveAt(vehicleId, date = new Date()) {
    return await Booking.findOne({
      vehicleId,
      isCancelled: false,
      startDateTime: { $lte: date },
      endDateTime: { $gte: date },
    }).sort({ endDateTime: -1 });
  }

  async findFirstFuture(vehicleId, date = new Date()) {
    return await Booking.findOne({
      vehicleId,
      isCancelled: false,
      startDateTime: { $gt: date },
    }).sort({ startDateTime: 1 });
  }

  async findByVehicleDateRange(vehicleId, startDate, endDate, isCancelled = false) {
    const filter = {
      vehicleId,
      startDateTime: { $lte: endDate },
      endDateTime: { $gte: startDate },
    };
    if (isCancelled !== undefined && isCancelled !== null) {
      filter.isCancelled = isCancelled;
    }
    return await Booking.find(filter).populate('createdBy', 'username email').sort({ startDateTime: 1 });
  }

  async findByVehicleIds(vehicleIds) {
    return await Booking.find({ vehicleId: { $in: vehicleIds } });
  }

  /**
   * High-performance $facet aggregation pipeline for user vehicle dashboard data.
   * Computes totalBookings count, monthBookings count, and bounded active/upcoming bookings
   * in a single query execution without loading full historical documents.
   */
  async aggregateVehicleDashboardData(vehicleIds, now, monthStart, monthEnd) {
    const objectIds = vehicleIds.map((id) => (typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id));

    const [facetResult] = await Booking.aggregate([
      { $match: { vehicleId: { $in: objectIds } } },
      {
        $facet: {
          totalCounts: [
            { $group: { _id: '$vehicleId', count: { $sum: 1 } } }
          ],
          monthCounts: [
            {
              $match: {
                isCancelled: false,
                startDateTime: { $lte: monthEnd },
                endDateTime: { $gte: monthStart },
              },
            },
            { $group: { _id: '$vehicleId', count: { $sum: 1 } } }
          ],
          activeAndUpcoming: [
            {
              $match: {
                isCancelled: false,
                endDateTime: { $gte: now },
                startDateTime: { $lte: monthEnd },
              },
            },
            { $sort: { startDateTime: 1 } },
            {
              $project: {
                vehicleId: 1,
                customerName: 1,
                startDateTime: 1,
                endDateTime: 1,
              },
            },
          ],
        },
      },
    ]);

    const totalMap = new Map();
    (facetResult?.totalCounts || []).forEach((item) => totalMap.set(item._id.toString(), item.count));

    const monthMap = new Map();
    (facetResult?.monthCounts || []).forEach((item) => monthMap.set(item._id.toString(), item.count));

    const activeAndUpcoming = facetResult?.activeAndUpcoming || [];

    return { totalMap, monthMap, activeAndUpcoming };
  }

  async create(bookingData, session = null) {
    const booking = new Booking(bookingData);
    return await booking.save({ session: session || undefined });
  }

  async save(booking, session = null) {
    return await booking.save({ session: session || undefined });
  }

  async createPayment(paymentData, session = null) {
    const payment = new BookingPayment(paymentData);
    return await payment.save({ session: session || undefined });
  }

  async findPayments(filter = {}, populate = null, sort = { paidAt: -1 }, session = null) {
    let query = BookingPayment.find(filter);
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach((p) => {
          query = query.populate(p);
        });
      } else {
        query = query.populate(populate);
      }
    }
    if (sort) {
      query = query.sort(sort);
    }
    if (session) {
      query = query.session(session);
    }
    return await query;
  }

  async findPaymentsByBookingId(bookingId, session = null) {
    return await this.findPayments({ bookingId }, null, { paidAt: -1 }, session);
  }

  async countNonCancelledByVehicle(vehicleId) {
    return await Booking.countDocuments({ vehicleId, isCancelled: false });
  }

  async deleteById(id, session = null) {
    return await Booking.findByIdAndDelete(id, { session: session || undefined });
  }

  async deleteManyByVehicleId(vehicleId, session = null) {
    return await Booking.deleteMany({ vehicleId }, { session: session || undefined });
  }

  async deletePaymentsByVehicleId(vehicleId, session = null) {
    return await BookingPayment.deleteMany({ vehicleId }, { session: session || undefined });
  }
}

module.exports = new BookingRepository();

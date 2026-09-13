const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const Booking = require('../models/Booking');
const WalletTransaction = require('../models/WalletTransaction');

class VehicleController {
  // GET /api/vehicles/:id
  async getVehicle(req, res) {
    try {
      const vehicleId = req.params.vehicleId || req.params.id;
      const vehicle = await Vehicle.findById(vehicleId)
        .populate('ownerIds', 'username email')
        .populate('operationalNotes.createdBy', 'username');
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      res.status(200).json(vehicle);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching vehicle', error: error.message });
    }
  }

  // POST /api/vehicles/:id/notes
  async addOperationalNote(req, res) {
    try {
      const vehicleId = req.params.vehicleId || req.params.id;
      const { text } = req.body;

      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ message: 'Note text is required and cannot be empty' });
      }

      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }

      const newNote = {
        text: text.trim(),
        createdBy: req.user._id,
        createdAt: new Date(),
      };

      vehicle.operationalNotes.push(newNote);
      await vehicle.save();

      await vehicle.populate('operationalNotes.createdBy', 'username');

      const addedNote = vehicle.operationalNotes[vehicle.operationalNotes.length - 1];

      res.status(201).json({
        message: 'Note added successfully',
        note: addedNote,
        operationalNotes: vehicle.operationalNotes,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error adding operational note', error: error.message });
    }
  }

  // DELETE /api/vehicles/:id/notes/:noteId
  async deleteOperationalNote(req, res) {
    try {
      const vehicleId = req.params.vehicleId || req.params.id;
      const { noteId } = req.params;

      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }

      const note = vehicle.operationalNotes.id(noteId);
      if (!note) {
        return res.status(404).json({ message: 'Note not found' });
      }

      // Authorization check: only author or admin can delete
      const isAuthor = note.createdBy.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';

      if (!isAuthor && !isAdmin) {
        return res.status(403).json({ message: 'You can only delete your own notes' });
      }

      note.deleteOne();
      await vehicle.save();

      res.status(200).json({
        message: 'Note deleted successfully',
        noteId,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting operational note', error: error.message });
    }
  }

  // GET /api/vehicles/:id/stats
  async getVehicleStats(req, res) {
    try {
      const vehicleId = req.params.vehicleId || req.params.id;
      const totalTrips = await Booking.countDocuments({ vehicleId });

      const incomeTransactions = await WalletTransaction.find({
        vehicleId,
        type: 'income',
      });
      const totalRevenue = incomeTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);

      res.status(200).json({
        totalTrips,
        totalRevenue,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching vehicle stats', error: error.message });
    }
  }

  // GET /api/vehicles/:id/status
  // Returns: { status: 'booked' | 'available', until?: Date, nextBookingDate?: Date }
  async getVehicleStatus(req, res) {
    try {
      const vehicleId = req.params.vehicleId || req.params.id;
      const now = new Date();

      // Check if there is an active booking right now (startDate <= now <= endDate)
      const activeBooking = await Booking.findOne({
        vehicleId,
        startDate: { $lte: now },
        endDate: { $gte: now },
      }).sort({ endDate: -1 });

      if (activeBooking) {
        return res.status(200).json({
          status: 'booked',
          until: activeBooking.endDate,
        });
      }

      // Check if there is any upcoming booking in the future (startDate > now)
      const futureBooking = await Booking.findOne({
        vehicleId,
        startDate: { $gt: now },
      }).sort({ startDate: 1 });

      if (futureBooking) {
        return res.status(200).json({
          status: 'available',
          nextBookingDate: futureBooking.startDate,
        });
      }

      return res.status(200).json({
        status: 'available',
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching vehicle status', error: error.message });
    }
  }

  // GET /api/vehicles/:id/bookings?month=YYYY-MM
  // Returns bookings where startDate <= monthEnd AND endDate >= monthStart
  async getVehicleBookings(req, res) {
    try {
      const vehicleId = req.params.vehicleId || req.params.id;
      const { month } = req.query;

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

      const bookings = await Booking.find({
        vehicleId,
        startDate: { $lte: monthEnd },
        endDate: { $gte: monthStart },
      }).sort({ startDate: 1 });

      const formatted = bookings.map((b) => ({
        _id: b._id,
        customerName: b.customerName,
        startDate: b.startDate,
        endDate: b.endDate,
        isPaid: b.isPaid,
        paid: b.isPaid, // backward-compat alias
        amount: b.amount,
        paymentMethod: b.paymentMethod,
      }));

      res.status(200).json(formatted);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching vehicle bookings', error: error.message });
    }
  }
}

module.exports = new VehicleController();

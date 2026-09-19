const vehicleService = require('../services/vehicleService');

class VehicleController {
  // GET /api/vehicles/:id
  async getVehicle(req, res, next) {
    try {
      const vehicleId = req.params.vehicleId || req.params.id;
      const vehicle = await vehicleService.getVehicleById(vehicleId);
      res.status(200).json(vehicle);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/vehicles/:id/notes
  async addOperationalNote(req, res, next) {
    try {
      const vehicleId = req.params.vehicleId || req.params.id;
      const { text } = req.body;
      const result = await vehicleService.addOperationalNote(vehicleId, text, req.user._id);

      res.status(201).json({
        message: 'Note added successfully',
        note: result.note,
        operationalNotes: result.operationalNotes,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/vehicles/:id/notes/:noteId
  async deleteOperationalNote(req, res, next) {
    try {
      const vehicleId = req.params.vehicleId || req.params.id;
      const { noteId } = req.params;
      const result = await vehicleService.deleteOperationalNote(vehicleId, noteId, req.user);

      res.status(200).json({
        message: 'Note deleted successfully',
        noteId: result.noteId,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/vehicles/:id/stats
  async getVehicleStats(req, res, next) {
    try {
      const vehicleId = req.params.vehicleId || req.params.id;
      const stats = await vehicleService.getStats(vehicleId);
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/vehicles/:id/status
  async getVehicleStatus(req, res, next) {
    try {
      const vehicleId = req.params.vehicleId || req.params.id;
      const status = await vehicleService.getStatus(vehicleId);
      res.status(200).json(status);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/vehicles/:id/bookings?month=YYYY-MM
  async getVehicleBookings(req, res, next) {
    try {
      const vehicleId = req.params.vehicleId || req.params.id;
      const { month } = req.query;
      const formatted = await vehicleService.getBookingsByMonth(vehicleId, month);
      res.status(200).json(formatted);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VehicleController();

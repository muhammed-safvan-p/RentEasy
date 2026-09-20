const lockService = require('../services/lockService');

class LockController {
  /**
   * POST /api/vehicles/:id/locks
   * Create a vehicle lock for a date range.
   */
  async createLock(req, res, next) {
    try {
      const vehicleId = req.params.id;
      const { startDate, endDate, reason } = req.body;

      const lock = await lockService.createLock({
        vehicleId,
        lockedBy: req.user._id,
        startDate,
        endDate,
        reason,
      });

      res.status(201).json({
        message: 'Vehicle dates locked successfully.',
        lock,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/vehicles/:id/locks?month=YYYY-MM
   * List locks for a vehicle in a given month.
   */
  async getLocks(req, res, next) {
    try {
      const vehicleId = req.params.id;
      const { month } = req.query;

      const locks = await lockService.getLocksForMonth(vehicleId, month);

      res.status(200).json({ locks });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/vehicles/:id/locks/:lockId
   * Hard-delete a lock (release it permanently).
   */
  async deleteLock(req, res, next) {
    try {
      const { lockId } = req.params;
      const result = await lockService.deleteLock(lockId, req.user);

      res.status(200).json({
        message: 'Lock released and deleted successfully.',
        lockId: result.lockId,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LockController();

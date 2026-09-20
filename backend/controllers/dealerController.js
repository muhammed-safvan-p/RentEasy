const dealerService = require('../services/dealerService');

class DealerController {
  /**
   * POST /api/vehicles/:id/dealers
   * Create a dealer for this vehicle.
   */
  async createDealer(req, res, next) {
    try {
      const vehicleId = req.params.id;
      const { name } = req.body;

      const dealer = await dealerService.createDealer({
        vehicleId,
        name,
        createdBy: req.user?._id,
      });

      res.status(201).json({
        message: 'Dealer created successfully.',
        dealer,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/vehicles/:id/dealers
   * List all dealers for this vehicle.
   */
  async getDealers(req, res, next) {
    try {
      const vehicleId = req.params.id;
      const dealers = await dealerService.getDealers(vehicleId);

      res.status(200).json({ dealers });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/vehicles/:id/dealers/:dealerId
   * Update dealer name.
   */
  async updateDealer(req, res, next) {
    try {
      const { id: vehicleId, dealerId } = req.params;
      const { name } = req.body;

      const dealer = await dealerService.updateDealer(dealerId, vehicleId, { name });

      res.status(200).json({
        message: 'Dealer updated successfully.',
        dealer,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/vehicles/:id/dealers/:dealerId
   * Delete dealer.
   */
  async deleteDealer(req, res, next) {
    try {
      const { id: vehicleId, dealerId } = req.params;

      const result = await dealerService.deleteDealer(dealerId, vehicleId);

      res.status(200).json({
        message: 'Dealer deleted successfully.',
        dealerId: result.dealerId,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DealerController();

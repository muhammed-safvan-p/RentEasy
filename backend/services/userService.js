const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const vehicleRepository = require('../repositories/vehicleRepository');
const bookingRepository = require('../repositories/bookingRepository');
const walletRepository = require('../repositories/walletRepository');
const AppError = require('../utils/AppError');

class UserService {
  async getMe(userId) {
    const user = await userRepository.findById(userId, '-password');
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  async getMyVehicles(userId) {
    const vehicles = await vehicleRepository.findByOwnerId(userId);

    if (!vehicles.length) {
      return [];
    }

    const vehicleIds = vehicles.map((v) => v._id);
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    // Execute single $facet aggregation on MongoDB to compute counts and bounded active/upcoming bookings
    const [{ totalMap, monthMap, activeAndUpcoming }, allWallets] = await Promise.all([
      bookingRepository.aggregateVehicleDashboardData(vehicleIds, now, monthStart, monthEnd),
      walletRepository.findByVehicleIds(vehicleIds, 'vehicleId totalBalance cashBalance bankBalance'),
    ]);

    const vehiclesWithStats = vehicles.map((vehicle) => {
      const vIdStr = vehicle._id.toString();
      const totalBookings = totalMap.get(vIdStr) || 0;
      const monthBookings = monthMap.get(vIdStr) || 0;

      const vehicleWallet = allWallets.find((w) => w.vehicleId.toString() === vIdStr);
      const currentBalance = vehicleWallet ? vehicleWallet.totalBalance || 0 : 0;

      // Active booking for this vehicle (startDateTime <= now <= endDateTime)
      const vehicleRelevantBookings = activeAndUpcoming.filter(
        (b) => b.vehicleId.toString() === vIdStr
      );

      const activeBooking = vehicleRelevantBookings.find(
        (b) => new Date(b.startDateTime) <= now && new Date(b.endDateTime) >= now
      );

      let currentBookingStatus = null;

      if (activeBooking) {
        currentBookingStatus = {
          isBooked: true,
          endsAt: activeBooking.endDateTime,
          customerName: activeBooking.customerName,
          hasNextBookingThisMonth: false,
        };
      } else {
        // Next booking this month (startDateTime > now and startDateTime <= monthEnd)
        const nextBookingThisMonth = vehicleRelevantBookings.find(
          (b) => new Date(b.startDateTime) > now && new Date(b.startDateTime) <= monthEnd
        );

        if (nextBookingThisMonth) {
          currentBookingStatus = {
            isBooked: false,
            hasNextBookingThisMonth: true,
            nextBookingDate: nextBookingThisMonth.startDateTime,
            customerName: nextBookingThisMonth.customerName,
          };
        } else {
          currentBookingStatus = {
            isBooked: false,
            hasNextBookingThisMonth: false,
            message: 'No upcoming bookings this month',
          };
        }
      }

      return {
        ...vehicle.toObject(),
        totalBookings,
        monthBookings,
        currentBalance,
        currentBookingStatus,
      };
    });

    return vehiclesWithStats;
  }

  async updatePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!currentPassword) {
      throw new AppError('Current password is required', 400);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await userRepository.save(user);

    return { message: 'Password updated successfully' };
  }
}

module.exports = new UserService();

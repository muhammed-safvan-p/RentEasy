const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const vehicleRepository = require('../repositories/vehicleRepository');
const bookingRepository = require('../repositories/bookingRepository');
const walletRepository = require('../repositories/walletRepository');
const { getMonthBoundsUTC } = require('../utils/dateUtils');
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
    const { start: monthStart, end: monthEnd } = getMonthBoundsUTC();

    // Execute single $facet aggregation on MongoDB to compute counts and bounded active/upcoming bookings
    const [{ totalMap, monthMap, activeAndUpcoming }, allWallets] = await Promise.all([
      bookingRepository.aggregateVehicleDashboardData(vehicleIds, now, monthStart, monthEnd),
      walletRepository.findByVehicleIds(
        vehicleIds,
        'vehicleId totalBalance cashBalance bankBalance'
      ),
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

      let currentBookingStatus;

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

  async updatePhone(userId, phone) {
    const { normalizePhone, isValidPhone } = require('../utils/phoneUtils');
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone || !isValidPhone(normalizedPhone)) {
      throw new AppError('Phone number must be a valid 10-digit number', 400);
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if another user already has this phone
    const existingWithPhone = await userRepository.findByPhone(normalizedPhone);
    if (existingWithPhone && existingWithPhone._id.toString() !== user._id.toString()) {
      throw new AppError('This phone number is already registered with another account.', 409);
    }

    user.phone = normalizedPhone;
    await userRepository.save(user);

    return {
      message: 'Phone number updated successfully',
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
        phone: user.phone,
      },
    };
  }

  async getUsersList() {
    return await userRepository.findAll({ role: { $ne: 'admin' } }, 'username _id');
  }

  async updateVehicle(vehicleId, userId, updateData, userRole = 'user') {
    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    const isOwner = vehicle.ownerIds.some((id) => (id._id || id).toString() === userId.toString());
    const isAdmin = userRole === 'admin';

    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorized to edit this vehicle', 403);
    }

    if (vehicle.isActive === false && !isAdmin) {
      throw new AppError('This vehicle is currently locked/blocked by administrator', 403);
    }

    const {
      name,
      plateNumber,
      notes,
      imageUrl,
      fuelType,
      transmission,
      seatingCapacity,
      ownerIds,
    } = updateData;

    if (plateNumber !== undefined) {
      const formattedPlate = plateNumber.trim().toUpperCase();
      if (formattedPlate !== vehicle.plateNumber) {
        const existing = await vehicleRepository.findByPlateNumber(formattedPlate);
        if (existing && existing._id.toString() !== vehicle._id.toString()) {
          throw new AppError('Vehicle with this plate number already exists', 400);
        }
        vehicle.plateNumber = formattedPlate;
      }
    }

    if (name !== undefined) vehicle.name = name.trim();
    if (notes !== undefined) vehicle.notes = notes ? notes.trim() : '';

    if (imageUrl !== undefined) {
      const trimmedNewImage = imageUrl ? imageUrl.trim() : null;
      // If image is being replaced or removed, destroy the old one on Cloudinary
      if (
        vehicle.imageUrl &&
        vehicle.imageUrl !== trimmedNewImage &&
        (vehicle.imageUrl.includes('cloudinary.com') || vehicle.imageUrl.includes('res.cloudinary'))
      ) {
        try {
          const { cloudinary } = require('../config/cloudinary');
          const match = vehicle.imageUrl.match(/(renteasy\/vehicles\/[^./?#]+)/);
          if (match && match[1]) {
            cloudinary.uploader.destroy(match[1]).catch(() => {});
          }
        } catch (_e) {
          // non-blocking
        }
      }
      vehicle.imageUrl = trimmedNewImage;
    }

    if (fuelType !== undefined) vehicle.fuelType = fuelType;
    if (transmission !== undefined) vehicle.transmission = transmission;
    if (seatingCapacity !== undefined && seatingCapacity !== '') {
      const parsedCapacity = Number(seatingCapacity);
      if (!isNaN(parsedCapacity) && parsedCapacity > 0) {
        vehicle.seatingCapacity = parsedCapacity;
      }
    }

    if (ownerIds !== undefined) {
      const currentUserIdStr = userId.toString();
      const rawOwners = Array.isArray(ownerIds) ? ownerIds : [];
      // If regular user, always ensure current user remains in ownerIds so they don't lose access
      const mergedOwners = isAdmin
        ? Array.from(new Set(rawOwners))
        : Array.from(new Set([currentUserIdStr, ...rawOwners]));

      vehicle.ownerIds = mergedOwners;
    }

    const saved = await vehicleRepository.save(vehicle);
    await saved.populate({ path: 'ownerIds', select: 'username email' });
    return saved;
  }
}

module.exports = new UserService();

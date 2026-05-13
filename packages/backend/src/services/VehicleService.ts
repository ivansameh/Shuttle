import { vehicleRepository } from '../repositories/VehicleRepository';
import { AppError } from '../utils/AppError';

export class VehicleService {
  static async registerVehicle(driverId: string, vehicleData: any) {
    const { licensePlate, make, model, year, capacity, color } = vehicleData;

    if (!licensePlate || !make || !model || !capacity) {
      throw new AppError('Missing required fields: licensePlate, make, model, capacity', 400);
    }

    const existingVehicle = await vehicleRepository.findByLicensePlate(licensePlate);
    if (existingVehicle) {
      throw new AppError('A vehicle with this license plate is already registered.', 409);
    }

    return vehicleRepository.create({
      licensePlate,
      make,
      model,
      year: year ? parseInt(year, 10) : null,
      capacity: parseInt(capacity, 10),
      color,
      ownerId: driverId,
      isActive: true
    });
  }
}

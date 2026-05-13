import { BaseRepository } from './BaseRepository';

export class VehicleRepository extends BaseRepository<'vehicle'> {
  constructor() {
    super('vehicle');
  }

  async findByLicensePlate(licensePlate: string) {
    return this.model.findUnique({
      where: { licensePlate }
    });
  }
}

export const vehicleRepository = new VehicleRepository();

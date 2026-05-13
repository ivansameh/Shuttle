import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding the database...');

  // 1. Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@shuttle.local' },
    update: {
      passwordHash: '$2b$10$YKgndeDs9Y8827u65OMMDOr51G1CLNRr9g.Y0hNpICf6C4h/xU.zy',
    },
    create: {
      name: 'System Admin',
      email: 'admin@shuttle.local',
      passwordHash: '$2b$10$YKgndeDs9Y8827u65OMMDOr51G1CLNRr9g.Y0hNpICf6C4h/xU.zy', // Password: admin123
      role: Role.ADMIN,
    },
  });
  console.log(`Updated Admin: ${admin.id}`);

  // 2. Create Driver
  const driver = await prisma.user.upsert({
    where: { email: 'driver@shuttle.local' },
    update: {
      passwordHash: '$2b$10$YKgndeDs9Y8827u65OMMDOr51G1CLNRr9g.Y0hNpICf6C4h/xU.zy',
    },
    create: {
      name: 'John Driver',
      email: 'driver@shuttle.local',
      passwordHash: '$2b$10$YKgndeDs9Y8827u65OMMDOr51G1CLNRr9g.Y0hNpICf6C4h/xU.zy', // Password: admin123
      role: Role.DRIVER,
    },
  });
  console.log(`Updated Driver: ${driver.id}`);

  // 3. Create Rider
  const rider = await prisma.user.upsert({
    where: { email: 'rider@shuttle.local' },
    update: {
      passwordHash: '$2b$10$YKgndeDs9Y8827u65OMMDOr51G1CLNRr9g.Y0hNpICf6C4h/xU.zy',
    },
    create: {
      name: 'Jane Rider',
      email: 'rider@shuttle.local',
      passwordHash: '$2b$10$YKgndeDs9Y8827u65OMMDOr51G1CLNRr9g.Y0hNpICf6C4h/xU.zy', // Password: admin123
      role: Role.RIDER,
    },
  });
  console.log(`Updated Rider: ${rider.id}`);

  // 4. Create Line
  const line = await prisma.line.create({
    data: {
      name: 'Downtown to Airport',
      startLat: 30.0444,
      startLng: 31.2357,
      endLat: 30.1219,
      endLng: 31.4056,
      fixedPrice: 50.00,
    },
  });
  console.log(`Created Line: ${line.id}`);

  // 5. Create 2 Stops
  const stop1 = await prisma.stop.create({
    data: {
      lineId: line.id,
      name: 'Downtown Station (Origin)',
      lat: 30.0444,
      lng: 31.2357,
      orderIndex: 1,
    },
  });

  const stop2 = await prisma.stop.create({
    data: {
      lineId: line.id,
      name: 'Airport Terminal 1 (Destination)',
      lat: 30.1219,
      lng: 31.4056,
      orderIndex: 2,
    },
  });
  console.log(`Created Stops: ${stop1.id}, ${stop2.id}`);

  // 6. Create Trip Instance
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tripInstance = await prisma.tripInstance.create({
    data: {
      lineId: line.id,
      driverId: driver.id,
      departureTime: tomorrow,
      totalSeats: 14,
      remainingSeats: 14,
    },
  });
  console.log(`Created Trip Instance: ${tripInstance.id}`);
  
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

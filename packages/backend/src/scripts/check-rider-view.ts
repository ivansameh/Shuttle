import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  console.log('--- Current Server Time ---');
  console.log(now.toISOString());
  console.log(now.toLocaleString());

  // Check lines that would be returned to rider
  const lines = await prisma.line.findMany({
    where: { 
      isActive: true,
      tripInstances: {
        some: {
          status: 'SCHEDULED',
          departureTime: {
            gte: now
          }
        }
      }
    },
    include: {
      tripInstances: {
        where: {
          status: 'SCHEDULED',
          departureTime: {
            gte: now
          }
        }
      }
    }
  });

  console.log('\n--- Lines visible to Rider ---');
  console.table(lines.map(l => ({
    id: l.id,
    name: l.name,
    tripCount: l.tripInstances.length
  })));

  // Check all recent trips
  const allRecentTrips = await prisma.tripInstance.findMany({
    include: { line: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log('\n--- Recent Trip Instances ---');
  console.table(allRecentTrips.map(t => ({
    id: t.id,
    line: t.line.name,
    status: t.status,
    departure: t.departureTime.toISOString(),
    departureLocal: t.departureTime.toLocaleString(),
    isFuture: t.departureTime > now
  })));
}

main().finally(() => prisma.$disconnect());

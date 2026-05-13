import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  
  const allTrips = await prisma.tripInstance.findMany({
    include: { line: true },
    orderBy: { departureTime: 'asc' }
  });

  console.log('--- ALL TRIPS IN DATABASE ---');
  console.table(allTrips.map(t => ({
    id: t.id,
    line: t.line.name,
    lineActive: t.line.isActive,
    status: t.status,
    departure: t.departureTime.toISOString(),
    isFuture: t.departureTime > now
  })));

  const visibleTrips = allTrips.filter(t => 
    t.line.isActive && t.status === 'SCHEDULED' && t.departureTime > now
  );

  console.log('\n--- TRIPS THAT SHOULD BE VISIBLE TO RIDER ---');
  console.table(visibleTrips.map(t => ({
    id: t.id,
    line: t.line.name,
    departure: t.departureTime.toISOString()
  })));
}

main().finally(() => prisma.$disconnect());

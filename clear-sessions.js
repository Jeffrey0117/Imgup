const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.adminSession.deleteMany({})
  .then(() => {
    console.log('✅ All sessions deleted');
    return prisma.$disconnect();
  })
  .catch(e => {
    console.error('❌ Error:', e);
    return prisma.$disconnect();
  });

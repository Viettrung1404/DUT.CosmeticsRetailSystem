const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const total = await prisma.product.count();
  const withVideo = await prisma.product.count({
    where: { videoUrl: { not: null } }
  });
  console.log(`Products: ${withVideo}/${total} (${((withVideo / total) * 100).toFixed(1)}%)`);
}

check().finally(() => prisma.$disconnect());

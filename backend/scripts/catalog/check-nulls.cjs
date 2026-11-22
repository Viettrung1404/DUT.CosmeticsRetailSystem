const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const noCat = await prisma.product.count({ where: { categoryId: null } });
  const noBrand = await prisma.product.count({ where: { brandId: null } });
  console.log({ noCat, noBrand });
}

check().finally(() => prisma.$disconnect());

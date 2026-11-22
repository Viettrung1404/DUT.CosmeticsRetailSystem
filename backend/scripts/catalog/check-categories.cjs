const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: { products: true }
      }
    }
  });
  console.log(categories.map(c => ({ id: c.id, name: c.name, count: c._count.products })));
}

check().finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const p = await prisma.product.findFirst({
    where: { name: { contains: 'Jeju Volcanic' } },
    select: { id: true, name: true, slug: true, videoUrl: true }
  });
  console.log(p);
}
run().finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.product.findFirst({
  where: { name: { contains: 'Extraordinary Oil Sleek' } },
  select: { id: true, name: true, slug: true, videoUrl: true }
}).then(console.log).finally(() => p.$disconnect());

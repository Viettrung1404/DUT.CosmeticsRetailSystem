const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function sample() {
  const prods = await prisma.product.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, slug: true, videoUrl: true }
  });
  for (const prod of prods) {
    const res = await fetch(`http://localhost:3000/api/v1/customer/products/${prod.slug}`);
    const json = await res.json();
    console.log({
      name: prod.name,
      slug: prod.slug,
      dbVideoUrl: prod.videoUrl,
      apiVideoUrl: json.data?.videoUrl || json.videoUrl
    });
  }
}

sample().finally(() => prisma.$disconnect());

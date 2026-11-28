const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { demoId, FAQS, BLOG_CATEGORIES, BLOGS } = require('./fixtures.cjs');

const db = new PrismaClient();

async function main() {
  const catalog = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../.catalog-data/catalog.json'), 'utf8'),
  );
  const imageManifest = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../.catalog-data/uploaded.json'), 'utf8'),
  );

  const admin = await db.user.findFirst({ where: { email: { contains: 'admin' } } });
  const authorId = admin ? admin.id : demoId('user', 'admin');

  console.log('Syncing FAQs...');
  await db.faq.deleteMany({});
  for (const faq of FAQS) {
    await db.faq.create({
      data: {
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        sortOrder: faq.sortOrder,
        isActive: true,
      },
    });
  }
  console.log(`Synced ${FAQS.length} FAQs.`);

  console.log('Syncing Blog Categories and Posts...');
  await db.blogPost.deleteMany({});
  await db.blogCategory.deleteMany({});

  for (const cat of BLOG_CATEGORIES) {
    await db.blogCategory.create({
      data: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
      },
    });
  }
  console.log(`Synced ${BLOG_CATEGORIES.length} Blog Categories.`);

  for (let i = 0; i < BLOGS.length; i++) {
    const post = BLOGS[i];
    const category = BLOG_CATEGORIES.find((c) => c.slug === post.categorySlug);
    const prodImg = catalog.products[(i * 17) % catalog.products.length].images[0];
    const featuredImage =
      prodImg && imageManifest[prodImg.sha256] ? imageManifest[prodImg.sha256].url : null;

    await db.blogPost.create({
      data: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        blogCategoryId: category ? category.id : null,
        authorId,
        status: 'PUBLISHED',
        publishedAt: post.publishedAt,
        featuredImage,
        metaTitle: post.title,
        metaDescription: post.excerpt,
      },
    });
  }
  console.log(`Synced ${BLOGS.length} Blog Posts.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

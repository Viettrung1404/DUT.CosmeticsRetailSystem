const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const cachePath = path.resolve(__dirname, '../../.catalog-data/product-videos.json');
let videoCache = {};
if (fs.existsSync(cachePath)) {
  try {
    videoCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  } catch (e) {
    videoCache = {};
  }
}

function cleanName(s) {
  return (s || '')
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:ml|g|gr|kg|l|miếng|x\d+)\b/gi, ' ')
    .replace(/[+*&/#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function searchYouTubeVideoId(query) {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m2 = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1]);
    const m1 = [...html.matchAll(/\/watch\?v=([a-zA-Z0-9_-]{11})/g)].map((m) => m[1]);
    const all = [...new Set([...m2, ...m1])];
    return all[0] || null;
  } catch (err) {
    return null;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🚀 Bắt đầu quét & lấp đầy Video 100% cho toàn bộ sản phẩm...');

  const products = await prisma.product.findMany({
    include: {
      brand: true,
      category: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const total = products.length;
  console.log(`Tổng số sản phẩm: ${total}`);

  let mp4Preserved = 0;
  let cachedHits = 0;
  let newlyFound = 0;
  let failed = 0;

  const BATCH_SIZE = 6;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (p, bIdx) => {
        const idx = i + bIdx + 1;

        // 1. Keep existing MP4 videos
        if (p.videoUrl && p.videoUrl.includes('hsv-tech.io')) {
          mp4Preserved++;
          return;
        }

        // 2. Check cache
        let videoId = videoCache[p.id];

        if (videoId) {
          cachedHits++;
        } else {
          const brand = p.brand?.name || '';
          const cat = p.category?.name || '';
          const cleaned = cleanName(p.name);

          // Tier 1: Clean Name + Brand + review
          let q1 = cleaned;
          if (brand && !q1.toLowerCase().includes(brand.toLowerCase())) {
            q1 = `${brand} ${q1}`;
          }
          videoId = await searchYouTubeVideoId(`${q1} review`);

          // Tier 2: Shortened Name (first 4 words) + Brand + review
          if (!videoId) {
            const shortName = cleaned.split(' ').slice(0, 4).join(' ');
            let q2 = shortName;
            if (brand && !q2.toLowerCase().includes(brand.toLowerCase())) {
              q2 = `${brand} ${q2}`;
            }
            videoId = await searchYouTubeVideoId(`${q2} review`);
          }

          // Tier 3: Brand + Category + review
          if (!videoId && brand) {
            videoId = await searchYouTubeVideoId(`${brand} ${cat} review`.trim());
          }

          // Tier 4: Category review
          if (!videoId) {
            videoId = await searchYouTubeVideoId(`${cat} mỹ phẩm review`.trim());
          }

          if (videoId) {
            newlyFound++;
            videoCache[p.id] = videoId;
          }
        }

        if (videoId) {
          const embedUrl = `https://www.youtube.com/embed/${videoId}`;
          if (p.videoUrl !== embedUrl) {
            await prisma.product.update({
              where: { id: p.id },
              data: { videoUrl: embedUrl },
            });
          }
          console.log(
            `[${idx}/${total}] ✅ ${p.name.slice(0, 42)}... -> https://youtu.be/${videoId}`,
          );
        } else {
          failed++;
          console.warn(`[${idx}/${total}] ❌ Không tìm được: ${p.name}`);
        }
      }),
    );

    // Persist cache
    fs.writeFileSync(cachePath, JSON.stringify(videoCache, null, 2));
    await sleep(200);
  }

  const finalWithVideo = await prisma.product.count({
    where: { videoUrl: { not: null } },
  });

  console.log('\n===========================================');
  console.log('🎉 TỔNG KẾT PHỦ VIDEO TOÀN BỘ SẢN PHẨM:');
  console.log({
    totalProducts: total,
    mp4Preserved,
    cachedHits,
    newlyFound,
    failed,
    finalWithVideo,
    coverage: `${((finalWithVideo / total) * 100).toFixed(1)}%`,
  });
  console.log('===========================================');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

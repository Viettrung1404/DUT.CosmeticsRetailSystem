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

const categoryVideoMap = {
  'cushion': 'bPKFRKPOm1w',
  'bông tẩy trang': 'Tm9JXL9Tlfw',
  'chăm sóc da': 'FLUn1Q6vhyk',
  'tẩy trang': 'GJa1DZEfU7A',
  'toner': 'FLUn1Q6vhyk',
  'kem dưỡng da': 'kamONi1R3vM',
  'mặt nạ': 'FT2b53qvtzk',
  'son thỏi': 'ki2V8TH3VZk',
  'son kem': 'S_eBOaCgjnc',
  'trang điểm': 'h9jg5bu-8mE',
  'chăm sóc cơ thể & tóc': '0mhFdxpMJFs',
  'kem nền': '8Yw7w0oVN-0',
  'phấn mắt': 'WUdwB9wUrJc',
  'mascara': 'cOdtwVWAE2o',
  'kẻ mắt': 'uHeqI5XjGMY',
  'dưỡng thể': 'lmWFIyragic',
  'mút trang điểm': '8sq_ZJ30i6Q',
  'tẩy tế bào chết mặt': 'b3GaoXxHFTU',
  'má hồng': 'NIsPxzRaLrs',
  'phụ kiện làm đẹp': 'Tm9JXL9Tlfw',
  'dưỡng môi': 'SEcjWxFkO1I',
  'sữa rửa mặt': '45iTa4i4Zp0',
  'serum và tinh chất': 'kamONi1R3vM',
  'chống nắng': 'AKcOp4cZDxM',
  'phấn phủ': '2YvEj1XFyTw',
  'sữa tắm': 'L0aGfRCYdk4',
  'dưỡng tóc': '0mhFdxpMJFs',
  'dầu gội': 'ewTN9OTY8Oo',
  'cọ trang điểm': 'l6qoJ8bx2C4',
};

const defaultBeautyVideo = 'FLUn1Q6vhyk';

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
      signal: AbortSignal.timeout(2500),
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
  console.log('🚀 Bắt đầu quét & lấp đầy Video 100% cho TOÀN BỘ SẢN PHẨM...');

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
  let categoryFallbackHits = 0;

  const BATCH_SIZE = 5;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (p, bIdx) => {
        const idx = i + bIdx + 1;

        // 1. Keep original MP4 videos
        if (p.videoUrl && p.videoUrl.includes('hsv-tech.io')) {
          mp4Preserved++;
          return;
        }

        const brand = p.brand?.name || '';
        const cat = p.category?.name || '';
        const catKey = cat.toLowerCase().trim();
        const fallbackId = categoryVideoMap[catKey] || defaultBeautyVideo;

        // 2. Check cache
        let videoId = videoCache[p.id];

        if (videoId) {
          cachedHits++;
        } else {
          const cleaned = cleanName(p.name);

          // Tier 1: Clean Name + Brand + review
          let q1 = cleaned;
          if (brand && !q1.toLowerCase().includes(brand.toLowerCase())) {
            q1 = `${brand} ${q1}`;
          }
          videoId = await searchYouTubeVideoId(`${q1} review`);

          // Tier 2: Shortened Name + Brand + review
          if (!videoId) {
            const shortName = cleaned.split(' ').slice(0, 4).join(' ');
            let q2 = shortName;
            if (brand && !q2.toLowerCase().includes(brand.toLowerCase())) {
              q2 = `${brand} ${q2}`;
            }
            videoId = await searchYouTubeVideoId(`${q2} review`);
          }

          // Tier 3: Category Fallback
          if (!videoId) {
            videoId = fallbackId;
            categoryFallbackHits++;
          } else {
            newlyFound++;
          }

          videoCache[p.id] = videoId;
        }

        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        if (p.videoUrl !== embedUrl) {
          await prisma.product.update({
            where: { id: p.id },
            data: { videoUrl: embedUrl },
          });
        }
        console.log(`[${idx}/${total}] ✅ ${p.name.slice(0, 40)} -> https://youtu.be/${videoId}`);
      }),
    );

    fs.writeFileSync(cachePath, JSON.stringify(videoCache, null, 2));
    await sleep(100);
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
    categoryFallbackHits,
    finalWithVideo,
    coverage: `${((finalWithVideo / total) * 100).toFixed(1)}%`,
  });
  console.log('===========================================');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

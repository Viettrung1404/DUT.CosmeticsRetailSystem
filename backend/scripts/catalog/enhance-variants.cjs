const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const collectedPath = path.resolve(__dirname, '../../.catalog-data/collected.json');
const collected = JSON.parse(fs.readFileSync(collectedPath, 'utf8'));

// Build lookup maps
const rawProductById = new Map();
const rawVariantById = new Map();
const videosByRawProductId = new Map();

for (const item of collected) {
  const p = item.product;
  if (!p) continue;
  rawProductById.set(String(p.id), p);

  // Check MP4 video
  const medias = p.medias || [];
  const video = medias.find(m => m.type === 'video');
  if (video && video.url) {
    videosByRawProductId.set(String(p.id), video.url);
  }

  // Check HTML description for YouTube embed
  const desc = p.detail?.map(d => d.htmlDescription).join(' ') || '';
  const ytMatch = desc.match(/https?:\/\/(?:www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]+/);
  if (ytMatch && !videosByRawProductId.has(String(p.id))) {
    videosByRawProductId.set(String(p.id), ytMatch[0]);
  }

  for (const v of p.variants || []) {
    rawVariantById.set(String(v.id), v);
  }
}

console.log('Lookup maps initialized:');
console.log('rawProductById:', rawProductById.size);
console.log('rawVariantById:', rawVariantById.size);
console.log('videosByRawProductId:', videosByRawProductId.size);

function cleanText(s) {
  return (s || '')
    .replace(/^[\s\/\-]+|[\s\/\-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function capitalizeWords(s) {
  if (!s) return s;
  return s.split(' ').map(w => {
    if (!w) return w;
    // Keep numbers and letters intact
    if (/^[a-z0-9]/i.test(w)) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }
    return w;
  }).join(' ');
}

async function enhanceAll() {
  console.log('🚀 Starting catalog enhancement...');

  // Ensure video_url column exists
  await prisma.$executeRawUnsafe(`ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT;`);

  const products = await prisma.product.findMany({
    include: {
      variants: true,
      category: true,
      images: true,
    }
  });

  console.log(`Processing ${products.length} products in DB...`);

  let updatedProductsCount = 0;
  let updatedVariantsCount = 0;
  let newImagesCount = 0;
  let videoAttachedCount = 0;

  for (const product of products) {
    const rawId = product.sku.replace(/^GU-/, '');
    const categorySlug = product.category.slug;
    const catName = product.category.name;
    const isMakeup = /son|cushion|phan|nen|mat|ma-hong|mascara|ke-mat|eyeliner|lip/i.test(categorySlug);

    // 1. Determine Option Names
    let option1Name = 'Phân loại';
    let option2Name = 'Dung tích';

    if (isMakeup) {
      if (/cushion|kem-nen/i.test(categorySlug)) {
        option1Name = 'Tone màu';
        option2Name = 'Quy cách';
      } else if (/son/i.test(categorySlug)) {
        option1Name = 'Màu sắc';
        option2Name = 'Phiên bản';
      } else {
        option1Name = 'Màu sắc';
        option2Name = 'Kích cỡ';
      }
    } else {
      if (/mat-na/i.test(categorySlug)) {
        option1Name = 'Phân loại';
        option2Name = 'Quy cách';
      } else if (/dau-goi|sua-tam|duong-the|duong-toc/i.test(categorySlug)) {
        option1Name = 'Mùi hương / Dòng';
        option2Name = 'Dung tích';
      } else {
        // Skincare
        option1Name = 'Phân loại / Dung tích';
        option2Name = 'Quy cách';
      }
    }

    // 2. Video URL
    let videoUrl = videosByRawProductId.get(rawId) || null;
    if (videoUrl) videoAttachedCount++;

    // 3. Process Variants
    const usedCombos = new Set();
    const updatedVariants = [];

    // Check if variants have different volumes
    const volumeRegex = /(\d+(?:[.,]\d+)?)\s*(ml|g|gr|l|miếng)\b/i;

    for (let idx = 0; idx < product.variants.length; idx++) {
      const v = product.variants[idx];
      let rawOpt = (v.option1Value || '').trim();

      // Detect expiry
      let expiry = null;
      if (/more\s*12m/i.test(rawOpt)) {
        expiry = '> 12 tháng';
        rawOpt = rawOpt.replace(/\/?\s*more\s*12m\s*\/?/gi, '');
      } else if (/\b12m\b/i.test(rawOpt)) {
        expiry = '12 tháng';
        rawOpt = rawOpt.replace(/\/?\s*\b12m\b\s*\/?/gi, '');
      } else if (/\b9m\b/i.test(rawOpt)) {
        expiry = '9 tháng';
        rawOpt = rawOpt.replace(/\/?\s*\b9m\b\s*\/?/gi, '');
      } else if (/\b6m\b/i.test(rawOpt)) {
        expiry = '< 6 tháng (Ưu đãi)';
        rawOpt = rawOpt.replace(/\/?\s*\b6m\b\s*\/?/gi, '');
      } else if (/\b3m\b/i.test(rawOpt)) {
        expiry = '< 3 tháng (Xả kho)';
        rawOpt = rawOpt.replace(/\/?\s*\b3m\b\s*\/?/gi, '');
      }

      rawOpt = cleanText(rawOpt);

      if (!rawOpt) {
        const volMatch = product.name.match(volumeRegex);
        rawOpt = volMatch ? volMatch[0] : (product.variants.length > 1 ? `Loại ${idx + 1}` : 'Tiêu chuẩn');
      }

      let opt1Val = rawOpt;
      let opt2Val = 'Tiêu chuẩn';

      if (expiry) {
        opt2Val = expiry;
        option2Name = 'Hạn sử dụng';
      } else if (/tặng kèm lõi|kèm lõi/i.test(product.name) && /cushion/i.test(categorySlug)) {
        opt2Val = idx === 0 ? 'Kèm lõi thay thế (14g x 2)' : 'Hộp đơn (14g)';
        option2Name = 'Quy cách';
      } else if (volumeRegex.test(product.name)) {
        const vol = product.name.match(volumeRegex)[0];
        opt2Val = vol;
        option2Name = 'Dung tích';
      } else if (isMakeup) {
        opt2Val = 'Fullsize';
        option2Name = 'Kích cỡ';
      } else {
        opt2Val = 'Chai tiêu chuẩn';
        option2Name = 'Quy cách';
      }

      // Check unique constraint: (productId, opt1Val, opt2Val)
      let combo = `${opt1Val}|${opt2Val}`;
      if (usedCombos.has(combo)) {
        // Disambiguate opt2Val
        if (expiry) {
          opt2Val = `${expiry} (Đợt ${idx + 1})`;
        } else {
          opt2Val = `${opt2Val} - Bản ${idx + 1}`;
        }
        combo = `${opt1Val}|${opt2Val}`;
      }
      usedCombos.add(combo);

      // Price Differentiation
      let basePrice = Number(v.price) || 200000;
      let finalPrice = basePrice;

      // Price rule 1: Expiry discounts
      if (expiry) {
        if (expiry.includes('< 3 tháng')) {
          finalPrice = Math.round((basePrice * 0.70) / 1000) * 1000;
        } else if (expiry.includes('< 6 tháng')) {
          finalPrice = Math.round((basePrice * 0.82) / 1000) * 1000;
        } else if (expiry.includes('9 tháng')) {
          finalPrice = Math.round((basePrice * 0.92) / 1000) * 1000;
        }
      }

      // Price rule 2: Volume differentiation
      const volMatch = opt1Val.match(/^(\d+(?:[.,]\d+)?)\s*(ml|g|gr|l|miếng)$/i);
      if (volMatch && product.variants.length > 1) {
        const num = parseFloat(volMatch[1].replace(',', '.'));
        // Find min volume in this product's variants
        const allVols = product.variants
          .map(item => item.option1Value?.match(/^(\d+(?:[.,]\d+)?)\s*(ml|g|gr|l|miếng)$/i))
          .filter(Boolean)
          .map(m => parseFloat(m[1].replace(',', '.')));
        if (allVols.length > 1) {
          const minVol = Math.min(...allVols);
          if (minVol > 0 && num > minVol) {
            const ratio = num / minVol;
            finalPrice = Math.round((basePrice * (1 + (ratio - 1) * 0.65)) / 1000) * 1000;
          }
        }
      }

      // Price rule 3: Cushion Refill vs Single
      if (opt2Val.includes('Hộp đơn')) {
        finalPrice = Math.round((basePrice * 0.75) / 1000) * 1000;
      }

      // Price rule 4: Color shade small nuance for trending shades
      if (isMakeup && product.variants.length > 2 && idx === 0 && !expiry) {
        // Best seller shade slight adjustment if identical
        const otherPrices = product.variants.map(o => Number(o.price));
        if (new Set(otherPrices).size === 1) {
          finalPrice = Math.round((basePrice * 1.05) / 1000) * 1000; // Best seller shade
        }
      }

      const costPrice = Math.round((finalPrice * 0.65) / 1000) * 1000;

      updatedVariants.push({
        id: v.id,
        sku: v.sku,
        option1Value: opt1Val,
        option2Value: opt2Val,
        price: finalPrice,
        costPrice: costPrice,
      });
    }

    // Product pricing
    const minVariantPrice = Math.min(...updatedVariants.map(v => v.price));
    const salePrice = product.salePrice && Number(product.salePrice) < minVariantPrice
      ? Number(product.salePrice)
      : (minVariantPrice < Number(product.basePrice) ? minVariantPrice : null);

    // Update Product in DB
    await prisma.product.update({
      where: { id: product.id },
      data: {
        option1Name,
        option2Name,
        basePrice: minVariantPrice,
        salePrice: salePrice,
        videoUrl: videoUrl,
      }
    });
    updatedProductsCount++;

    // Update Variants in DB
    for (const uv of updatedVariants) {
      await prisma.productVariant.update({
        where: { id: uv.id },
        data: {
          option1Value: uv.option1Value,
          option2Value: uv.option2Value,
          price: uv.price,
          costPrice: uv.costPrice,
        }
      });
      updatedVariantsCount++;

      // Image linking: Ensure variant has a linked image
      const existingLinked = product.images.find(img => img.productVariantId === uv.id);
      if (!existingLinked) {
        // Try getting raw thumbnail
        const rawVarId = uv.sku.replace(/^GU-V-/, '');
        const rawV = rawVariantById.get(rawVarId);
        if (rawV && rawV.thumbnail) {
          const thumbUrl = `https://image.hsv-tech.io/${rawV.thumbnail}`;
          // Check if image with thumbUrl already exists in product
          const matchingImg = product.images.find(img => img.imageUrl === thumbUrl);
          if (matchingImg) {
            await prisma.productImage.update({
              where: { id: matchingImg.id },
              data: { productVariantId: uv.id }
            });
          } else {
            await prisma.productImage.create({
              data: {
                productId: product.id,
                productVariantId: uv.id,
                imageUrl: thumbUrl,
                altText: `${product.name} - ${uv.option1Value}`,
                sortOrder: product.images.length + 1,
                isPrimary: false,
              }
            });
            newImagesCount++;
          }
        } else if (product.images.length > 0) {
          // Link first or indexed image
          const fallbackImg = product.images[updatedVariants.indexOf(uv) % product.images.length];
          await prisma.productImage.update({
            where: { id: fallbackImg.id },
            data: { productVariantId: uv.id }
          });
        }
      }
    }
  }

  console.log('✅ Enhancement complete!');
  console.log({
    updatedProductsCount,
    updatedVariantsCount,
    newImagesCount,
    videoAttachedCount,
  });
}

enhanceAll().catch(console.error).finally(() => prisma.$disconnect());

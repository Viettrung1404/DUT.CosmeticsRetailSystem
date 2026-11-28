const { PrismaClient } = require('../../node_modules/@prisma/client');
const prisma = new PrismaClient();

const COMMON_PURPOSES = {
  'Niacinamide': 'Dưỡng sáng da, mờ thâm nám, củng cố hàng rào lipid và se khít lỗ chân lông.',
  'Glycerin': 'Cấp ẩm sâu, duy trì độ ẩm tự nhiên, ngăn ngừa khô ráp và mất nước biểu bì.',
  'Salicylic acid': 'Tẩy tế bào chết BHA hòa tan dầu thừa, làm sạch sâu lỗ chân lông, ngừa mụn.',
  'Betaine': 'Hoạt chất dưỡng ẩm tự nhiên từ củ cải đường, bảo vệ tế bào khỏi stress nhiệt.',
  'Panthenol': 'Vitamin B5 phục hồi da tổn thương, làm dịu kích ứng và tái tạo tế bào biểu bì.',
  'Hyaluronic acid': 'Ngậm nước gấp 1000 lần trọng lượng phân tử, làm căng bóng và mịn màng bề mặt da.',
  'Sodium Hyaluronate': 'Dạng muối HA phân tử nhỏ thẩm thấu sâu, cấp ẩm tầng sâu và cải thiện đàn hồi.',
  'Ceramide': 'Thành phần cốt lõi của hàng rào bảo vệ da, khóa ẩm và chống lão hóa.',
  'Retinol': 'Dẫn xuất Vitamin A kích thích tăng sinh collagen, xóa mờ nếp nhăn và trẻ hóa da.',
  'Retinal': 'Dẫn xuất thế hệ mới của Vitamin A, hiệu quả nhanh gấp 11 lần retinol, dịu nhẹ cho da.',
  'Bakuchiol': 'Retinol thực vật lành tính, chống oxy hóa và cải thiện độ săn chắc cho da nhạy cảm.',
  'Adenosine': 'Thúc đẩy tổng hợp năng lượng tế bào, làm mờ rãnh nhăn và cải thiện độ đàn hồi.',
  'Allantoin': 'Làm dịu da, giảm kích ứng, thúc đẩy làm lành vết thương và làm mềm da.',
  'Tranexamic Acid': 'Ức chế sản sinh melanin, xóa mờ thâm nám lâu năm và đốm nâu cứng đầu.',
  'Kojic Acid': 'Hoạt chất dưỡng sáng da tự nhiên, ngăn ngừa enzyme tyrosinase hình thành sắc tố.',
  'Ascorbic Acid': 'Vitamin C tinh khiết chống oxy hóa cực mạnh, tăng sinh collagen và mờ thâm sạm.',
  'Vitamin C': 'Chống oxy hóa, dưỡng sáng da đều màu và bảo vệ da trước tia UV.',
  'Vitamin E': 'Dưỡng ẩm, chống oxy hóa hòa tan trong dầu, bảo vệ màng tế bào khỏi gốc tự do.',
  'Lactic Acid': 'AHA tự nhiên tẩy tế bào chết nhẹ nhàng trên bề mặt da, kích thích tái tạo da.',
  'Glycolic Acid': 'AHA phân tử nhỏ thẩm thấu nhanh, làm sáng mịn da và cải thiện cấu trúc thô ráp.',
  'Citric Acid': 'AHA cân bằng độ pH cho da, nhẹ nhàng làm sạch tế bào sừng già cỗi.',
  'Squalane': 'Dầu dưỡng phỏng sinh học tương thích cao với da, khóa ẩm mềm mượt không nhờn rít.',
  'Urea': 'Thành phần giữ ẩm tự nhiên (NMF), làm mềm lớp sừng dày và cấp nước sâu.',
  'Collagen thủy phân': 'Collagen phân tử nano dễ hấp thu, củng cố độ đàn hồi và săn chắc da.',
  'Collagen': 'Duy trì cấu trúc nền của da, ngăn ngừa chảy xệ và giữ ẩm.',
  'Peptide': 'Chuỗi acid amin truyền tín hiệu kích thích sản sinh collagen và elastin.',
  'PDRN': 'Chiết xuất DNA cá hồi kích thích tái sinh mô tế bào và phục hồi da tổn thương sâu.',
  'LHA': 'Dẫn xuất acid salicylic dịu nhẹ, tẩy tế bào chết vi điểm và giảm bít tắc chân lông.',
  'BHA': 'Axit beta hydroxy thẩm thấu sâu qua dầu nhờn, làm thông thoáng lỗ chân lông.',
  'AHA': 'Axit alpha hydroxy hòa tan liên kết sừng trên bề mặt, trả lại vẻ sáng mịn rạng ngời.',
  'PHA': 'Axit polyhydroxy tẩy tế bào chết dịu nhẹ tối đa, cấp nước cho da siêu nhạy cảm.',
  'Rau má': 'Chiết xuất Centella Asiatica kháng viêm, làm dịu da mụn, tăng sinh collagen phục hồi.',
  'Diếp cá': 'Kháng khuẩn mạnh mẽ, thanh nhiệt, làm dịu nốt mụn đỏ và kiểm soát dầu thừa.',
  'Bí đao': 'Đặc tính làm mát, giảm nhiệt, kháng viêm và ngăn ngừa mụn trứng cá hiệu quả.',
  'Nha đam': 'Cấp nước tức thì, làm dịu bỏng rát và giảm ửng đỏ cho da cháy nắng.',
  'Trà xanh': 'Giàu polyphenol EGCG chống oxy hóa vượt trội, kháng khuẩn và kiềm dầu.',
  'Tinh dầu tràm trà': 'Kháng khuẩn tự nhiên mạnh mẽ, làm khô cồi mụn nhanh chóng.',
  'Chiết xuất hoa thược dược': 'Độc quyền từ Dear Dahlia giàu chất chống oxy hóa, dưỡng ẩm và làm mềm.',
  'Dầu jojoba': 'Cấu trúc tương đồng bã nhờn tự nhiên của da, điều tiết dầu và khóa ẩm.',
  'Bơ hạt mỡ': 'Giàu axit béo và vitamin A, E nuôi dưỡng làn da khô ráp trở nên mềm mại.',
  'Dầu argan': 'Vàng lỏng Ma-rốc giàu vitamin E và chất chống oxy hóa, phục hồi da và tóc.',
  'Dầu dừa': 'Kháng khuẩn, dưỡng ẩm sâu và làm mềm mịn các vùng da thô ráp.',
  'Dầu olive': 'Cung cấp squalene và polyphenol nuôi dưỡng làn da mềm mượt và chống lão hóa.',
  'Chiết xuất yến mạch': 'Làm dịu ngứa rát, giảm kích ứng và tạo màng bảo vệ da nhạy cảm.',
  'Chiết xuất hoa cúc': 'Kháng viêm, làm dịu kích ứng và phục hồi hàng rào ẩm tự nhiên.',
  'Mật ong': 'Kháng khuẩn, kháng viêm tự nhiên và cấp ẩm nuôi dưỡng da rạng ngời.',
  'Keo ong': 'Thần dược tự nhiên kháng khuẩn, tăng cường hệ miễn dịch cho da và phục hồi tế bào.',
  'Chiết xuất gạo': 'Giàu vitamin B và khoáng chất, dưỡng sáng da mịn màng tựa ngọc trai.',
  'Bột ngọc trai': 'Làm sáng da tự nhiên, tăng độ bóng khỏe và kiểm soát bóng dầu.',
  'Zinc Oxide': 'Màng lọc khoáng chất chống nắng phổ rộng UVA/UVB vật lý, an toàn cho da nhạy cảm.',
  'Titanium Dioxide': 'Khoáng chất chống nắng vật lý tạo lớp màng bảo vệ phản xạ tia tử ngoại.',
  'Dimethicone': 'Tạo lớp màng bảo vệ mịn mượt trên da, khóa ẩm và ngăn ngừa mất nước.',
  'Arbutin': 'Ức chế enzyme tyrosinase, làm sáng da an toàn và mờ thâm nám hiệu quả.',
  'Glutathione': 'Chất chống oxy hóa bậc nhất, chuyển hóa sắc tố đen thành sắc tố sáng hồng.',
  'Keratin': 'Protein cấu trúc phục hồi sợi tóc hư tổn, tăng độ bóng khỏe và đàn hồi.',
  'Biotin': 'Vitamin B7 nuôi dưỡng chân tóc và móng chắc khỏe, giảm gãy rụng.',
  'Caffeine': 'Kích thích vi tuần hoàn máu, giảm sưng bọng mắt và hỗ trợ mọc tóc.',
  'Madecassoside': 'Hoạt chất tinh khiết nhất từ rau má, phục hồi hàng rào bảo vệ da bị tổn thương.'
};

const BRAND_ORIGINS = {
  'cocoon': { origin: 'Việt Nam', madeIn: 'Việt Nam' },
  'dear dahlia': { origin: 'Hàn Quốc (Korea)', madeIn: 'Seoul, Hàn Quốc' },
  'the face shop': { origin: 'Hàn Quốc (Korea)', madeIn: 'Seoul, Hàn Quốc' },
  'banila co': { origin: 'Hàn Quốc (Korea)', madeIn: 'Seoul, Hàn Quốc' },
  'clio': { origin: 'Hàn Quốc (Korea)', madeIn: 'Seoul, Hàn Quốc' },
  'goodal': { origin: 'Hàn Quốc (Korea)', madeIn: 'Seoul, Hàn Quốc' },
  'peripera': { origin: 'Hàn Quốc (Korea)', madeIn: 'Seoul, Hàn Quốc' },
  'amuse': { origin: 'Hàn Quốc (Korea)', madeIn: 'Seoul, Hàn Quốc' },
  'dermatory': { origin: 'Hàn Quốc (Korea)', madeIn: 'Seoul, Hàn Quốc' },
  'la roche-posay': { origin: 'Pháp (France)', madeIn: 'La Roche-Posay, Pháp' },
  'bioderma': { origin: 'Pháp (France)', madeIn: 'Lyon, Pháp' },
  'vichy': { origin: 'Pháp (France)', madeIn: 'Vichy, Pháp' },
  'avène': { origin: 'Pháp (France)', madeIn: 'Avène, Pháp' },
  'eucerin': { origin: 'Đức (Germany)', madeIn: 'Hamburg, Đức' },
  "paula's choice": { origin: 'Mỹ (USA)', madeIn: 'Seattle, Mỹ' },
  'cerave': { origin: 'Mỹ (USA)', madeIn: 'New York, Mỹ' },
  'cetaphil': { origin: 'Canada', madeIn: 'Montreal, Canada' },
  'anessa': { origin: 'Nhật Bản (Japan)', madeIn: 'Tokyo, Nhật Bản' },
  'senka': { origin: 'Nhật Bản (Japan)', madeIn: 'Tokyo, Nhật Bản' },
  'hada labo': { origin: 'Nhật Bản (Japan)', madeIn: 'Osaka, Nhật Bản' },
  'shiseido': { origin: 'Nhật Bản (Japan)', madeIn: 'Tokyo, Nhật Bản' },
  'romand': { origin: 'Hàn Quốc (Korea)', madeIn: 'Seoul, Hàn Quốc' },
  '3ce': { origin: 'Hàn Quốc (Korea)', madeIn: 'Seoul, Hàn Quốc' },
  'black rouge': { origin: 'Hàn Quốc (Korea)', madeIn: 'Seoul, Hàn Quốc' },
  'innisfree': { origin: 'Hàn Quốc (Korea)', madeIn: 'Jeju, Hàn Quốc' },
  'laneige': { origin: 'Hàn Quốc (Korea)', madeIn: 'Seoul, Hàn Quốc' },
  'torriden': { origin: 'Hàn Quốc (Korea)', madeIn: 'Seoul, Hàn Quốc' },
  'skin1004': { origin: 'Hàn Quốc (Korea)', madeIn: 'Seoul, Hàn Quốc' },
  'round lab': { origin: 'Hàn Quốc (Korea)', madeIn: 'Gangwon, Hàn Quốc' },
  'beauty of joseon': { origin: 'Hàn Quốc (Korea)', madeIn: 'Seoul, Hàn Quốc' },
  'some by mi': { origin: 'Hàn Quốc (Korea)', madeIn: 'Seoul, Hàn Quốc' }
};

function extractUsage(html) {
  if (!html) return null;
  const match = html.match(/<(?:h[1-6]|strong|b)[^>]*>[^<]*(?:hướng dẫn|cách dùng|cách sử dụng|how to use)[^<]*<\/(?:h[1-6]|strong|b)>([\s\S]*?)(?=(?:<(?:h[1-6]|strong|b)[^>]*>[^<]*(?:thành phần|công dụng|lưu ý|đối tượng|bảo quản)|$))/i);
  if (match) {
    const text = match[1]
      .replace(/<\/(?:p|li|h[1-6]|div)>|<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#x27;/g, "'")
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .join('\n');
    if (text.length > 10) return text;
  }
  return null;
}

function fallbackUsage(catSlug, name) {
  if (/son\b|lip|tint|lipstick/i.test(name) || catSlug === 'trang-diem') {
    return '1. Thoa một lớp son dưỡng mỏng để cấp ẩm cho môi trước khi đánh son màu.\n2. Dùng đầu cọ lấy lượng son vừa đủ, gạt nhẹ bớt son thừa ở miệng ống.\n3. Thoa nhẹ từ lòng môi ra viền môi, bặm nhẹ hoặc dùng đầu ngón tay/cọ tán đều để tạo hiệu ứng chuyển màu ombre tự nhiên.\n4. Đậy kín nắp sau khi sử dụng và bảo quản nơi khô ráo thoáng mát.';
  }
  if (/rua-mat|cleanser|tay-trang|micellar/i.test(catSlug) || /rửa mặt|tẩy trang/i.test(name)) {
    return '1. Rửa sạch tay, làm ướt da mặt hoặc thấm đều sản phẩm ra bông tẩy trang chuyên dụng.\n2. Nhẹ nhàng lau/mát-xa đều khắp khuôn mặt theo chuyển động tròn từ trong ra ngoài, từ dưới lên trên.\n3. Rửa lại thật sạch với nước ấm và thấm khô nhẹ nhàng bằng khăn mềm hoặc bông sạch.\n4. Sử dụng đều đặn 2 lần mỗi ngày (sáng và tối) để giữ da luôn thông thoáng sạch mịn.';
  }
  if (/mat-na|mask/i.test(catSlug) || /mặt nạ/i.test(name)) {
    return '1. Sau bước làm sạch và cân bằng da với toner, mở gói và đắp mặt nạ ôm khít toàn bộ khuôn mặt.\n2. Thư giãn trong khoảng 15-20 phút để các tinh chất quý giá thẩm thấu sâu vào tế bào da.\n3. Gỡ mặt nạ ra, dùng các đầu ngón tay vỗ nhẹ nhàng khắp mặt để dưỡng chất còn lại hấp thu trọn vẹn.\n4. Sử dụng từ 2-3 lần/tuần để đạt hiệu quả dưỡng da tối ưu nhất.';
  }
  if (/chong-nang|sun/i.test(catSlug) || /chống nắng/i.test(name)) {
    return '1. Sử dụng ở bước cuối cùng của chu trình dưỡng da ban ngày, trước khi trang điểm.\n2. Lấy lượng kem chống nắng khoảng 2 đốt ngón tay, chấm đều lên các điểm trên khuôn mặt và cổ.\n3. Vỗ nhẹ và tán đều cho đến khi kem tiệp hoàn toàn vào da, không để lại vệt trắng.\n4. Thoa trước khi ra ngoài 20 phút và thoa lại sau mỗi 2-3 giờ khi vận động nhiều hoặc tiếp xúc với nước.';
  }
  return '1. Sử dụng sau các bước làm sạch da cơ bản vào buổi sáng và buổi tối.\n2. Lấy một lượng sản phẩm vừa đủ ra lòng bàn tay hoặc miếng bông sạch.\n3. Nhẹ nhàng thoa đều và mát-xa khắp khuôn mặt theo chiều cấu tạo da.\n4. Vỗ nhẹ nhàng trong 30 giây để dưỡng chất thẩm thấu sâu và đạt hiệu quả tối đa.';
}

function extractIngredientPurpose(html, ingredientName) {
  if (!html || !ingredientName) return null;
  const escaped = ingredientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp('(?:' + escaped + ')[^:]{0,10}:\\s*([^<\\n]{8,250})', 'i');
  const m = html.match(regex);
  if (m) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").trim();
    if (text.length > 5) return text;
  }
  return null;
}

function getTextureEffect(catSlug, name) {
  if (/son\b|lip|tint|lipstick/i.test(name)) return 'Son kem lì mịn mờ (Velvet Matte)';
  if (/cushion|phan-nuoc/i.test(catSlug)) return 'Lớp nền mỏng nhẹ, che phủ tự nhiên (Natural Glow)';
  if (/serum|tinh-chat/i.test(catSlug)) return 'Tinh chất lỏng nhẹ, thẩm thấu nhanh, không bết rít';
  if (/kem-duong/i.test(catSlug)) return 'Kem mềm mịn, khóa ẩm chuyên sâu suốt 24h';
  if (/tay-trang|micellar/i.test(catSlug)) return 'Nước tẩy trang dịu nhẹ Micellar làm sạch sâu';
  if (/sua-rua-mat/i.test(catSlug)) return 'Bọt bông siêu mịn, làm sạch sâu dịu nhẹ';
  if (/chong-nang/i.test(catSlug)) return 'Chống nắng quang phổ rộng, nâng tone tự nhiên';
  if (/mat-na/i.test(catSlug)) return 'Mặt nạ sợi thực vật ôm khít, giàu dưỡng chất';
  return 'Kết cấu dịu nhẹ, thẩm thấu tối ưu';
}

async function main() {
  console.log('Starting backfill for products and ingredients...');
  const products = await prisma.product.findMany({
    include: {
      brand: true,
      category: true,
      variants: true,
      ingredients: true,
      tags: true
    }
  });

  let updatedProducts = 0;
  let updatedIngredients = 0;

  for (const p of products) {
    const extractedHowTo = extractUsage(p.description);
    const howToUse = extractedHowTo || fallbackUsage(p.category.slug, p.name);

    const brandKey = p.brand?.name?.toLowerCase().trim() || '';
    const brandInfo = BRAND_ORIGINS[brandKey] || {
      origin: p.brand?.name ? `${p.brand.name} Chính Hãng` : 'Chính Hãng',
      madeIn: 'Hàn Quốc / Quốc tế'
    };

    // Determine volume
    const variantVolumes = p.variants.map(v => v.option2Value || v.option1Value).filter(Boolean);
    const volumeMatch = p.name.match(/\b\d+(?:[.,]\d+)?\s*(?:ml|gr|g|lit|l)\b/i);
    const volume = volumeMatch ? volumeMatch[0] : (variantVolumes[0] || 'Tiêu chuẩn');

    // Skin type
    const tagNames = p.tags.map(t => t.tagName.toLowerCase());
    let skinType = 'Phù hợp với mọi loại da, kể cả da nhạy cảm';
    if (tagNames.some(t => t.includes('da dầu'))) skinType = 'Da dầu, hỗn hợp thiên dầu, da mụn';
    else if (tagNames.some(t => t.includes('da khô'))) skinType = 'Da khô, da thiếu ẩm, da bong tróc';
    else if (tagNames.some(t => t.includes('da nhạy cảm'))) skinType = 'Da nhạy cảm, dễ kích ứng';

    const specifications = {
      brandOrigin: brandInfo.origin,
      manufacturingLocation: brandInfo.madeIn,
      volume,
      textureEffect: getTextureEffect(p.category.slug, p.name),
      expiry: '36 tháng kể từ NSX (12 tháng sau khi mở nắp)',
      skinType,
      license: 'Đã cấp phép & công bố theo tiêu chuẩn Bộ Y Tế Việt Nam',
      barcode: p.variants[0]?.barcode || '8809623810291'
    };

    await prisma.product.update({
      where: { id: p.id },
      data: {
        howToUse,
        specifications
      }
    });
    updatedProducts++;

    for (const ing of p.ingredients) {
      let purpose = extractIngredientPurpose(p.description, ing.ingredientName);
      if (!purpose) {
        purpose = COMMON_PURPOSES[ing.ingredientName] ||
          'Hoạt chất chăm sóc da chuyên sâu, hỗ trợ tăng cường độ ẩm và nuôi dưỡng làn da khỏe đẹp.';
      }

      await prisma.productIngredient.update({
        where: { id: ing.id },
        data: { purpose }
      });
      updatedIngredients++;
    }
  }

  console.log(`Successfully backfilled ${updatedProducts} products and ${updatedIngredients} ingredients!`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

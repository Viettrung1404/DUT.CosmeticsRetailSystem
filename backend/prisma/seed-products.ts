import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// DANH SÁCH ĐỊNH DANH (IDENTIFIERS) ĐỂ DỌN DẸP AN TOÀN KHI CẦN XÓA / ROLLBACK
// Chỉ xóa đúng các bản ghi do file seed này tạo ra, không ảnh hưởng dữ liệu khác.
// =============================================================================

const SEEDED_BRAND_SLUGS = [
  'la-roche-posay',
  'innisfree',
  'black-rouge',
  'cerave',
];

const SEEDED_CHILD_CATEGORY_SLUGS = [
  'sua-rua-mat',
  'kem-chong-nang',
  'serum-tinh-chat',
  'kem-duong-am',
  'son-moi',
  'phan-phu-cushion',
  'trang-diem-mat',
  'dau-goi-dau-xa',
  'sua-tam',
];

const SEEDED_ROOT_CATEGORY_SLUGS = [
  'cham-soc-da',
  'trang-diem',
  'cham-soc-co-the-toc',
];

const SEEDED_PRODUCT_SKUS = [
  'LRP-EFF-GEL',
  'LRP-ANTHELIOS-50ML',
  'INNI-GREENTEA-SERUM',
  'CERAVE-MOIST-CREAM',
  'BR-AIRFIT-V1',
  'INNI-NOSEBUM-POWDER',
];

// =============================================================================
// HÀM DỌN DẸP / XÓA DỮ LIỆU ĐÃ TẠO TỪ SCRIPT NÀY
// Thứ tự xóa: Images -> Variants -> Products -> Child Categories -> Root Categories -> Brands
// =============================================================================
async function cleanSeededData() {
  console.log('🧹 Đang dọn dẹp dữ liệu mẫu mỹ phẩm đã thêm...');

  // 1. Tìm các sản phẩm đã seed
  const existingProducts = await prisma.product.findMany({
    where: { sku: { in: SEEDED_PRODUCT_SKUS } },
    select: { id: true },
  });
  const productIds = existingProducts.map((p) => p.id);

  if (productIds.length > 0) {
    // Xóa ảnh sản phẩm
    const deletedImages = await prisma.productImage.deleteMany({
      where: { productId: { in: productIds } },
    });
    console.log(`   - Đã xóa ${deletedImages.count} ảnh sản phẩm.`);

    // Xóa biến thể sản phẩm
    const deletedVariants = await prisma.productVariant.deleteMany({
      where: { productId: { in: productIds } },
    });
    console.log(`   - Đã xóa ${deletedVariants.count} biến thể sản phẩm.`);

    // Xóa sản phẩm
    const deletedProducts = await prisma.product.deleteMany({
      where: { id: { in: productIds } },
    });
    console.log(`   - Đã xóa ${deletedProducts.count} sản phẩm.`);
  }

  // 2. Xóa Category con trước (tránh lỗi khóa ngoại CategoryHierarchy)
  const deletedChildCats = await prisma.category.deleteMany({
    where: { slug: { in: SEEDED_CHILD_CATEGORY_SLUGS } },
  });
  console.log(`   - Đã xóa ${deletedChildCats.count} danh mục con.`);

  // 3. Xóa Category cha (Root)
  const deletedRootCats = await prisma.category.deleteMany({
    where: { slug: { in: SEEDED_ROOT_CATEGORY_SLUGS } },
  });
  console.log(`   - Đã xóa ${deletedRootCats.count} danh mục gốc (cha).`);

  // 4. Xóa Brands
  const deletedBrands = await prisma.brand.deleteMany({
    where: { slug: { in: SEEDED_BRAND_SLUGS } },
  });
  console.log(`   - Đã xóa ${deletedBrands.count} thương hiệu.`);

  console.log('✅ Dọn dẹp hoàn tất!\n');
}

// =============================================================================
// HÀM SEED DỮ LIỆU MẪU MỸ PHẨM CHUẨN CHỈ
// =============================================================================
async function seedCosmeticsData() {
  // Luôn dọn dẹp dữ liệu cũ trước để đảm bảo tính Idempotent (chạy nhiều lần không lỗi trùng lặp)
  await cleanSeededData();

  console.log('🚀 Bắt đầu thêm dữ liệu mẫu mỹ phẩm chuẩn chỉ...');

  // ---------------------------------------------------------------------------
  // 1. TẠO BRANDS
  // ---------------------------------------------------------------------------
  console.log('📌 1. Đang tạo các Thương hiệu (Brands)...');
  const brandsData = [
    {
      name: 'La Roche-Posay',
      slug: 'la-roche-posay',
      countryOfOrigin: 'Pháp',
      websiteUrl: 'https://www.larocheposay.vn',
      logoUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200',
      description: 'Thương hiệu dược mỹ phẩm hàng đầu của Pháp dành cho da nhạy cảm.',
      isFeatured: true,
      sortOrder: 1,
    },
    {
      name: 'Innisfree',
      slug: 'innisfree',
      countryOfOrigin: 'Hàn Quốc',
      websiteUrl: 'https://www.innisfree.vn',
      logoUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200',
      description: 'Thương hiệu mỹ phẩm thiên nhiên nổi tiếng từ đảo Jeju Hàn Quốc.',
      isFeatured: true,
      sortOrder: 2,
    },
    {
      name: 'Black Rouge',
      slug: 'black-rouge',
      countryOfOrigin: 'Hàn Quốc',
      websiteUrl: 'https://blackrouge.vn',
      logoUrl: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=200',
      description: 'Thương hiệu trang điểm trẻ trung, xu hướng với dòng son kem lì đình đám.',
      isFeatured: false,
      sortOrder: 3,
    },
    {
      name: 'CeraVe',
      slug: 'cerave',
      countryOfOrigin: 'Mỹ',
      websiteUrl: 'https://www.cerave.vn',
      logoUrl: 'https://images.unsplash.com/photo-1608248597359-5970377ebff2?w=200',
      description: 'Thương hiệu dược mỹ phẩm chứa 3 loại Ceramide thiết yếu phục hồi hàng rào da.',
      isFeatured: true,
      sortOrder: 4,
    },
  ];

  const brandMap = new Map<string, string>();
  for (const b of brandsData) {
    const created = await prisma.brand.create({ data: b });
    brandMap.set(b.slug, created.id);
  }
  console.log(`   -> Đã tạo ${brandMap.size} thương hiệu.`);

  // ---------------------------------------------------------------------------
  // 2. TẠO CÂY DANH MỤC ĐA CẤP (CATEGORIES HIERARCHY)
  // ---------------------------------------------------------------------------
  console.log('📌 2. Đang tạo Cây danh mục đa cấp (Categories)...');
  
  // 2.1. Danh mục Cha (Cấp 1 - Root, parentId = null)
  const rootCategoriesData = [
    {
      name: 'Chăm sóc da',
      slug: 'cham-soc-da',
      description: 'Các sản phẩm làm sạch, dưỡng ẩm, đặc trị và bảo vệ da mặt',
      imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
      sortOrder: 1,
      isActive: true,
    },
    {
      name: 'Trang điểm',
      slug: 'trang-diem',
      description: 'Mỹ phẩm trang điểm môi, mắt, mặt giúp tôn vinh vẻ đẹp rạng ngời',
      imageUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400',
      sortOrder: 2,
      isActive: true,
    },
    {
      name: 'Chăm sóc cơ thể & Tóc',
      slug: 'cham-soc-co-the-toc',
      description: 'Sản phẩm tắm gội, dưỡng thể và chăm sóc tóc chuyên sâu',
      imageUrl: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400',
      sortOrder: 3,
      isActive: true,
    },
  ];

  const rootCategoryMap = new Map<string, string>();
  for (const rc of rootCategoriesData) {
    const created = await prisma.category.create({ data: rc });
    rootCategoryMap.set(rc.slug, created.id);
  }

  // 2.2. Danh mục Con (Cấp 2 - Child, parentId trỏ tới Root)
  const childCategoriesData = [
    // Con của "Chăm sóc da"
    {
      parentSlug: 'cham-soc-da',
      name: 'Sữa rửa mặt',
      slug: 'sua-rua-mat',
      description: 'Gel, bọt và kem rửa mặt làm sạch sâu, dịu nhẹ',
      imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300',
      sortOrder: 1,
    },
    {
      parentSlug: 'cham-soc-da',
      name: 'Kem chống nắng',
      slug: 'kem-chong-nang',
      description: 'Bảo vệ làn da tối ưu trước tác hại của tia UVA, UVB',
      imageUrl: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=300',
      sortOrder: 2,
    },
    {
      parentSlug: 'cham-soc-da',
      name: 'Serum & Tinh chất',
      slug: 'serum-tinh-chat',
      description: 'Tinh chất chuyên sâu giải quyết các vấn đề mụn, thâm, lão hóa',
      imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300',
      sortOrder: 3,
    },
    {
      parentSlug: 'cham-soc-da',
      name: 'Kem dưỡng ẩm',
      slug: 'kem-duong-am',
      description: 'Cấp ẩm và phục hồi hàng rào bảo vệ da ẩm mượt',
      imageUrl: 'https://images.unsplash.com/photo-1608248597359-5970377ebff2?w=300',
      sortOrder: 4,
    },
    // Con của "Trang điểm"
    {
      parentSlug: 'trang-diem',
      name: 'Son môi',
      slug: 'son-moi',
      description: 'Son thỏi, son kem lì, son bóng và son dưỡng có màu',
      imageUrl: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=300',
      sortOrder: 1,
    },
    {
      parentSlug: 'trang-diem',
      name: 'Phấn phủ & Cushion',
      slug: 'phan-phu-cushion',
      description: 'Phấn nước kiềm dầu, che khuyết điểm và phấn phủ khóa nền',
      imageUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=300',
      sortOrder: 2,
    },
    {
      parentSlug: 'trang-diem',
      name: 'Trang điểm mắt',
      slug: 'trang-diem-mat',
      description: 'Kẻ mắt eyeliner, mascara và bảng phấn mắt',
      imageUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=300',
      sortOrder: 3,
    },
    // Con của "Chăm sóc cơ thể & Tóc"
    {
      parentSlug: 'cham-soc-co-the-toc',
      name: 'Dầu gội & Dầu xả',
      slug: 'dau-goi-dau-xa',
      description: 'Dầu gội phục hồi, giảm gãy rụng và nuôi dưỡng tóc chắc khỏe',
      imageUrl: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=300',
      sortOrder: 1,
    },
    {
      parentSlug: 'cham-soc-co-the-toc',
      name: 'Sữa tắm',
      slug: 'sua-tam',
      description: 'Sữa tắm hương nước hoa và dưỡng ẩm toàn thân',
      imageUrl: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=300',
      sortOrder: 2,
    },
  ];

  const categoryMap = new Map<string, string>();
  for (const cc of childCategoriesData) {
    const parentId = rootCategoryMap.get(cc.parentSlug);
    const created = await prisma.category.create({
      data: {
        parentId,
        name: cc.name,
        slug: cc.slug,
        description: cc.description,
        imageUrl: cc.imageUrl,
        sortOrder: cc.sortOrder,
        isActive: true,
      },
    });
    categoryMap.set(cc.slug, created.id);
  }
  console.log(`   -> Đã tạo ${rootCategoryMap.size} danh mục gốc và ${categoryMap.size} danh mục con.`);

  // ---------------------------------------------------------------------------
  // 3. TẠO PRODUCTS, VARIANTS & IMAGES
  // ---------------------------------------------------------------------------
  console.log('📌 3. Đang tạo Sản phẩm, Biến thể & Hình ảnh...');

  const productsData = [
    // Sản phẩm 1: Gel Rửa Mặt La Roche-Posay
    {
      categorySlug: 'sua-rua-mat',
      brandSlug: 'la-roche-posay',
      name: 'Gel Rửa Mặt La Roche-Posay Effaclar Purifying Foaming Gel',
      slug: 'gel-rua-mat-la-roche-posay-effaclar-purifying-foaming-gel',
      sku: 'LRP-EFF-GEL',
      shortDescription: 'Gel rửa mặt tạo bọt làm sạch sâu, giảm bã nhờn cho da dầu mụn nhạy cảm.',
      description:
        'La Roche-Posay Effaclar Purifying Foaming Gel giúp thanh tẩy làn da dịu nhẹ nhờ các hoạt chất làm sạch được chọn lọc kỹ lưỡng, loại bỏ bụi bẩn và bã nhờn dư thừa, mang lại làn da sạch thoáng và tinh khiết.',
      basePrice: 395000,
      salePrice: 355000,
      option1Name: 'Dung tích',
      isActive: true,
      isFeatured: true,
      avgRating: 4.85,
      totalReviews: 142,
      totalSold: 1250,
      variants: [
        {
          sku: 'LRP-EFF-200ML',
          option1Value: '200ml',
          price: 355000,
          costPrice: 240000,
          stockQuantity: 85,
          unit: 'Chai',
        },
        {
          sku: 'LRP-EFF-400ML',
          option1Value: '400ml',
          price: 525000,
          costPrice: 360000,
          stockQuantity: 50,
          unit: 'Chai',
        },
      ],
      images: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
          altText: 'Gel Rửa Mặt La Roche-Posay Effaclar',
          sortOrder: 1,
          isPrimary: true,
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800',
          altText: 'Bao bì mặt sau chai 200ml',
          sortOrder: 2,
          isPrimary: false,
        },
      ],
    },

    // Sản phẩm 2: Kem Chống Nắng La Roche-Posay Anthelios
    {
      categorySlug: 'kem-chong-nang',
      brandSlug: 'la-roche-posay',
      name: 'Kem Chống Nắng La Roche-Posay Anthelios UVMune 400 Oil Control Gel-Cream',
      slug: 'kem-chong-nang-la-roche-posay-anthelios-uvmune-400',
      sku: 'LRP-ANTHELIOS-50ML',
      shortDescription: 'Kem chống nắng kiểm soát dầu vượt trội với màng lọc Mexoryl 400 bảo vệ da tối ưu.',
      description:
        'Sản phẩm chống nắng dành riêng cho da dầu, mụn với kết cấu dạng gel-cream khô ráo, thẩm thấu nhanh, không để lại vệt trắng và kiềm dầu suốt 12 giờ.',
      basePrice: 495000,
      salePrice: 445000,
      option1Name: 'Dung tích',
      isActive: true,
      isFeatured: true,
      avgRating: 4.9,
      totalReviews: 310,
      totalSold: 3400,
      variants: [
        {
          sku: 'LRP-ANT-50ML',
          option1Value: '50ml',
          price: 445000,
          costPrice: 300000,
          stockQuantity: 120,
          unit: 'Tuýp',
        },
      ],
      images: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800',
          altText: 'Kem Chống Nắng La Roche-Posay Anthelios',
          sortOrder: 1,
          isPrimary: true,
        },
      ],
    },

    // Sản phẩm 3: Serum Trà Xanh Innisfree
    {
      categorySlug: 'serum-tinh-chat',
      brandSlug: 'innisfree',
      name: 'Serum Dưỡng Ẩm Trà Xanh Innisfree Green Tea Seed Hyaluronic Serum',
      slug: 'serum-duong-am-tra-xanh-innisfree-green-tea-seed',
      sku: 'INNI-GREENTEA-SERUM',
      shortDescription: 'Tinh chất dưỡng ẩm sâu tức thì với công nghệ Beauty Green Tea và Nano Hyaluronic Acid.',
      description:
        'Serum trà xanh thế hệ mới thẩm thấu qua 15 lớp biểu bì, phục hồi độ ẩm và làm dịu làn da kích ứng, mệt mỏi do thiếu nước và ô nhiễm môi trường.',
      basePrice: 650000,
      salePrice: 585000,
      option1Name: 'Dung tích',
      isActive: true,
      isFeatured: true,
      avgRating: 4.75,
      totalReviews: 89,
      totalSold: 670,
      variants: [
        {
          sku: 'INNI-GTS-80ML',
          option1Value: '80ml',
          price: 585000,
          costPrice: 390000,
          stockQuantity: 60,
          unit: 'Chai',
        },
      ],
      images: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
          altText: 'Serum Dưỡng Ẩm Trà Xanh Innisfree',
          sortOrder: 1,
          isPrimary: true,
        },
      ],
    },

    // Sản phẩm 4: Kem Dưỡng Ẩm CeraVe
    {
      categorySlug: 'kem-duong-am',
      brandSlug: 'cerave',
      name: 'Kem Dưỡng Ẩm CeraVe Moisturizing Cream Phục Hồi Hàng Rào Bảo Vệ Da',
      slug: 'kem-duong-am-cerave-moisturizing-cream',
      sku: 'CERAVE-MOIST-CREAM',
      shortDescription: 'Kem dưỡng ẩm chuyên sâu chứa 3 Ceramides thiết yếu và Axit Hyaluronic cho da khô.',
      description:
        'Kem dưỡng ẩm CeraVe dưỡng ẩm suốt 24 giờ với công nghệ MVE độc quyền, làm dịu và phục hồi hàng rào bảo vệ tự nhiên của làn da khô đến rất khô.',
      basePrice: 420000,
      salePrice: 380000,
      option1Name: 'Trọng lượng',
      isActive: true,
      isFeatured: false,
      avgRating: 4.8,
      totalReviews: 175,
      totalSold: 890,
      variants: [
        {
          sku: 'CERAVE-MC-340G',
          option1Value: '340g (Hũ)',
          price: 380000,
          costPrice: 250000,
          stockQuantity: 75,
          unit: 'Hũ',
        },
        {
          sku: 'CERAVE-MC-453G',
          option1Value: '453g (Hũ vòi pump)',
          price: 480000,
          costPrice: 330000,
          stockQuantity: 40,
          unit: 'Hũ',
        },
      ],
      images: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1608248597359-5970377ebff2?w=800',
          altText: 'Hũ kem dưỡng ẩm CeraVe',
          sortOrder: 1,
          isPrimary: true,
        },
      ],
    },

    // Sản phẩm 5: Son Kem Lì Black Rouge
    {
      categorySlug: 'son-moi',
      brandSlug: 'black-rouge',
      name: 'Son Kem Lì Black Rouge Air Fit Velvet Tint Ver 1 The Red',
      slug: 'son-kem-li-black-rouge-air-fit-velvet-tint-ver-1',
      sku: 'BR-AIRFIT-V1',
      shortDescription: 'Son kem lì mềm mịn như nhung, chuẩn màu quyến rũ không gây khô môi.',
      description:
        'Bộ sưu tập son kem Black Rouge huyền thoại với bảng màu đỏ thời thượng, chất son xốp nhẹ, bám màu tốt từ 6-8 tiếng và cấp ẩm nhẹ nhàng.',
      basePrice: 250000,
      salePrice: 189000,
      option1Name: 'Mã màu',
      isActive: true,
      isFeatured: true,
      avgRating: 4.95,
      totalReviews: 540,
      totalSold: 5800,
      variants: [
        {
          sku: 'BR-A06',
          option1Value: 'A06 - Brick Red (Đỏ nâu gạch)',
          price: 189000,
          costPrice: 110000,
          stockQuantity: 150,
          unit: 'Cây',
        },
        {
          sku: 'BR-A12',
          option1Value: 'A12 - Dashed Brown (Đỏ nâu trầm)',
          price: 189000,
          costPrice: 110000,
          stockQuantity: 220,
          unit: 'Cây',
        },
      ],
      images: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800',
          altText: 'Cây son Black Rouge Air Fit Velvet Tint',
          sortOrder: 1,
          isPrimary: true,
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1631214524020-7e18db9a8f92?w=800',
          altText: 'Swatch màu son Black Rouge A12',
          sortOrder: 2,
          isPrimary: false,
        },
      ],
    },

    // Sản phẩm 6: Phấn Phủ Kiềm Dầu Innisfree
    {
      categorySlug: 'phan-phu-cushion',
      brandSlug: 'innisfree',
      name: 'Phấn Phủ Bột Kiềm Dầu Innisfree No-Sebum Mineral Powder',
      slug: 'phan-phu-bot-kiem-dau-innisfree-no-sebum-mineral-powder',
      sku: 'INNI-NOSEBUM-POWDER',
      shortDescription: 'Phấn phủ bột khoáng hút sạch dầu thừa, mang lại làn da khô thoáng mịn màng.',
      description:
        'Hộp phấn phủ quốc dân chiết xuất bạc hà và khoáng chất tự nhiên từ đảo Jeju, kiểm soát bã nhờn suốt cả ngày, đồng thời cân bằng độ ẩm cho lớp nền tự nhiên.',
      basePrice: 160000,
      salePrice: 135000,
      option1Name: 'Trọng lượng',
      isActive: true,
      isFeatured: false,
      avgRating: 4.88,
      totalReviews: 290,
      totalSold: 4200,
      variants: [
        {
          sku: 'INNI-NOSEBUM-5G',
          option1Value: '5g',
          price: 135000,
          costPrice: 80000,
          stockQuantity: 190,
          unit: 'Hộp',
        },
      ],
      images: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800',
          altText: 'Hộp phấn phủ Innisfree No-Sebum',
          sortOrder: 1,
          isPrimary: true,
        },
      ],
    },
  ];

  let createdProductCount = 0;
  let createdVariantCount = 0;
  let createdImageCount = 0;

  for (const item of productsData) {
    const categoryId = categoryMap.get(item.categorySlug);
    const brandId = brandMap.get(item.brandSlug);

    if (!categoryId) {
      console.warn(`⚠️ Không tìm thấy categoryId cho slug "${item.categorySlug}", bỏ qua.`);
      continue;
    }

    const { variants, images, categorySlug, brandSlug, ...productInfo } = item;

    // Tạo Product
    const createdProduct = await prisma.product.create({
      data: {
        ...productInfo,
        categoryId,
        brandId,
      },
    });
    createdProductCount++;

    // Tạo Variants
    for (const v of variants) {
      await prisma.productVariant.create({
        data: {
          productId: createdProduct.id,
          sku: v.sku,
          option1Value: v.option1Value,
          price: v.price,
          costPrice: v.costPrice,
          stockQuantity: v.stockQuantity,
          unit: v.unit,
          isActive: true,
        },
      });
      createdVariantCount++;
    }

    // Tạo Images (bao gồm isPrimary)
    for (const img of images) {
      await prisma.productImage.create({
        data: {
          productId: createdProduct.id,
          imageUrl: img.imageUrl,
          altText: img.altText,
          sortOrder: img.sortOrder,
          isPrimary: img.isPrimary,
        },
      });
      createdImageCount++;
    }
  }

  console.log(`   -> Đã tạo ${createdProductCount} sản phẩm, ${createdVariantCount} biến thể, và ${createdImageCount} hình ảnh.`);
  console.log('\n🎉 Hoàn thành seed dữ liệu mẫu mỹ phẩm thành công!');
  console.log('------------------------------------------------------------');
  console.log('👉 Bạn có thể kiểm tra kết quả ngay tại Swagger:');
  console.log('   - Menu cây danh mục: GET /api/v1/categories/tree');
  console.log('   - Danh sách sản phẩm: GET /api/v1/customer/products?page=1&limit=10');
  console.log('   - Chi tiết sản phẩm: GET /api/v1/customer/products/son-kem-li-black-rouge-air-fit-velvet-tint-ver-1');
  console.log('------------------------------------------------------------\n');
}

// =============================================================================
// ĐIỀU PHỐI CHẠY SEED HOẶC DỌN DẸP QUA DÒNG LỆNH
// Chạy seed:  npm run seed:products  (hoặc ts-node prisma/seed-products.ts)
// Chạy xóa:  npm run seed:products:clean (hoặc ts-node prisma/seed-products.ts --clean)
// =============================================================================
async function main() {
  const isCleanOnly = process.argv.includes('--clean') || process.argv.includes('--undo');

  if (isCleanOnly) {
    await cleanSeededData();
  } else {
    await seedCosmeticsData();
  }
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi thực hiện seed/clean:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import type { CartItem, Category, Product, ProductVariant, StockStatus } from "@/types/domain";

export type { CartItem, Category, Product, ProductVariant, StockStatus };

export const categories: Category[] = [
  { slug: "skin-care", name: "Chăm sóc da", description: "Sữa rửa mặt, toner, serum, kem dưỡng", accent: "from-pink-500 to-rose-500" },
  { slug: "make-up", name: "Trang điểm", description: "Son, phấn, nền, maskara, highlighter", accent: "from-violet-500 to-purple-500" },
  { slug: "body-care", name: "Chăm sóc cơ thể", description: "Body lotion, dầu gội, kem tẩy tế bào chết", accent: "from-cyan-500 to-sky-500" },
  { slug: "hair-care", name: "Chăm sóc tóc", description: "Dầu gội, dầu xả, serum phục hồi", accent: "from-amber-500 to-orange-500" },
];

export const products: Product[] = [
  {
    id: "p1",
    slug: "serum-vitamin-c-brightening",
    name: "Serum Vitamin C Brightening",
    category: "Chăm sóc da",
    categorySlug: "skin-care",
    brand: "GlowLabs",
    price: 690000,
    originalPrice: 820000,
    rating: 4.8,
    reviews: 124,
    badge: "Bestseller",
    stockStatus: "Còn hàng",
    description: "Serum cấp ẩm và làm sáng da với vitamin C, niacinamide và chiết xuất trà xanh. Phù hợp da nhạy cảm, giúp da sáng khỏe, đều màu hơn sau 4 tuần sử dụng.",
    ingredients: ["Vitamin C", "Niacinamide", "Trà xanh", "Hyaluronic Acid"],
    tags: ["brightening", "sensitive", "daily"],
    gallery: [
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=900&q=80",
    ],
    variants: [
      { id: "pv-p1-30", name: "Dung tích", label: "30ml", price: 690000, stock: 18, sku: "GL-VC-30" },
      { id: "pv-p1-50", name: "Dung tích", label: "50ml", price: 890000, stock: 9, sku: "GL-VC-50" },
    ],
  },
  {
    id: "p2",
    slug: "cream-cleanser-hydra-balance",
    name: "Cream Cleanser Hydra Balance",
    category: "Chăm sóc da",
    categorySlug: "skin-care",
    brand: "DewSkin",
    price: 450000,
    originalPrice: 560000,
    rating: 4.7,
    reviews: 86,
    badge: "New",
    stockStatus: "Còn hàng",
    description: "Sữa rửa mặt dạng cream dịu nhẹ, không gây cảm giác khô căng sau khi rửa. Công thức chứa glycerin, ceramide và chiết xuất hoa hồng.",
    ingredients: ["Ceramide", "Glycerin", "Hoa hồng"],
    tags: ["cleanser", "hydrating", "gentle"],
    gallery: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
    ],
    variants: [
      { id: "pv-p2-120", name: "Dung tích", label: "120ml", price: 450000, stock: 14, sku: "DS-CC-120" },
      { id: "pv-p2-200", name: "Dung tích", label: "200ml", price: 620000, stock: 7, sku: "DS-CC-200" },
    ],
  },
  {
    id: "p3",
    slug: "matte-lipstick-velvet-red",
    name: "Matte Lipstick Velvet Red",
    category: "Trang điểm",
    categorySlug: "make-up",
    brand: "Veloura",
    price: 320000,
    originalPrice: 420000,
    rating: 4.9,
    reviews: 211,
    badge: "Hot",
    stockStatus: "Còn hàng",
    description: "Son lì mịn môi, bền màu 8 giờ, không gây khô môi. Màu đỏ nâu cổ điển phù hợp mọi phong cách, từ công sở đến tiệc tối.",
    ingredients: ["Shea Butter", "Vitamin E", "Jojoba Oil"],
    tags: ["lipstick", "matte", "long-wear"],
    gallery: [
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
    ],
    variants: [
      { id: "pv-p3-cr", name: "Màu sắc", label: "Cherry Red", price: 320000, stock: 22, sku: "VL-LP-CR" },
      { id: "pv-p3-rn", name: "Màu sắc", label: "Rose Nude", price: 320000, stock: 11, sku: "VL-LP-RN" },
    ],
  },
  {
    id: "p4",
    slug: "oil-control-sunscreen-spf50",
    name: "Oil Control Sunscreen SPF 50",
    category: "Chăm sóc da",
    categorySlug: "skin-care",
    brand: "SunPetal",
    price: 540000,
    originalPrice: 640000,
    rating: 4.6,
    reviews: 98,
    badge: "Top rated",
    stockStatus: "Sắp hết",
    description: "Kem chống nắng chống nhờn, dưỡng mịn da, không bít lỗ chân lông và không tạo cảm giác nặng. Dễ thẩm thấu, bảo vệ tối ưu dưới ánh nắng mặt trời.",
    ingredients: ["Zinc Oxide", "Titanium Dioxide", "Vitamin E"],
    tags: ["sunscreen", "oil-control", "spf50"],
    gallery: [
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
    ],
    variants: [
      { id: "pv-p4-50", name: "Dung tích", label: "50ml", price: 540000, stock: 6, sku: "SP-SS-50" },
      { id: "pv-p4-75", name: "Dung tích", label: "75ml", price: 720000, stock: 4, sku: "SP-SS-75" },
    ],
  },
  {
    id: "p5",
    slug: "repair-shampoo-hydra-gloss",
    name: "Repair Shampoo Hydra Gloss",
    category: "Chăm sóc tóc",
    categorySlug: "hair-care",
    brand: "Botanique",
    price: 390000,
    originalPrice: 470000,
    rating: 4.7,
    reviews: 67,
    badge: "Bestseller",
    stockStatus: "Còn hàng",
    description: "Dầu gội phục hồi tóc hư tổn và xơ xác với dầu argan, chiết xuất bơ và protein lúa mì. Tóc mềm mượt, sáng bóng hơn sau 2 lần dùng.",
    ingredients: ["Argan Oil", "Protein", "Bơ"],
    tags: ["haircare", "repair", "gloss"],
    gallery: [
      "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80",
    ],
    variants: [
      { id: "pv-p5-250", name: "Dung tích", label: "250ml", price: 390000, stock: 15, sku: "BT-SH-250" },
      { id: "pv-p5-400", name: "Dung tích", label: "400ml", price: 520000, stock: 8, sku: "BT-SH-400" },
    ],
  },
  {
    id: "p6",
    slug: "body-lotion-rose-hydration",
    name: "Body Lotion Rose Hydration",
    category: "Chăm sóc cơ thể",
    categorySlug: "body-care",
    brand: "BloomCare",
    price: 410000,
    originalPrice: 510000,
    rating: 4.5,
    reviews: 73,
    badge: "New",
    stockStatus: "Còn hàng",
    description: "Kem dưỡng body hương hoa hồng, dưỡng ẩm sâu, mịn da và dễ thấm. Công thức không chứa parabens, phù hợp cho da khô và nhạy cảm.",
    ingredients: ["Rose Water", "Almond Oil", "Shea Butter"],
    tags: ["body lotion", "hydrating", "rose"],
    gallery: [
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
    ],
    variants: [
      { id: "pv-p6-200", name: "Dung tích", label: "200ml", price: 410000, stock: 12, sku: "BC-BL-200" },
      { id: "pv-p6-350", name: "Dung tích", label: "350ml", price: 560000, stock: 7, sku: "BC-BL-350" },
    ],
  },
];

export const cartItems: CartItem[] = [
  {
    id: "ci-1",
    productId: "p1",
    name: "Serum Vitamin C Brightening",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
    price: 690000,
    qty: 1,
    stock: 18,
  },
  {
    id: "ci-2",
    productId: "p3",
    name: "Matte Lipstick Velvet Red",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80",
    price: 320000,
    qty: 2,
    stock: 22,
  },
];

export function getProductsByCategory(categorySlug: string) {
  return products.filter((product) => product.categorySlug === categorySlug);
}

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

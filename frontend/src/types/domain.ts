export type UserRole = "Customer" | "Staff" | "Admin";

export type StockStatus = "Còn hàng" | "Sắp hết" | "Hết hàng";

export type Category = {
  slug: string;
  name: string;
  description: string;
  accent: string;
};

export type ProductVariant = {
  id?: string;
  name: string;
  label: string;
  price: number;
  stock: number;
  sku: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  brand: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviews: number;
  badge: string;
  stockStatus: StockStatus;
  description: string;
  ingredients: string[];
  tags: string[];
  gallery: string[];
  variants: ProductVariant[];
};

export type AuthUser = {
  id?: string;
  email?: string;
  role?: UserRole | string;
  name?: string;
  fullName?: string;
  phone?: string;
};

export type CartItem = {
  id: string;
  productId: string;
  name: string;
  image: string;
  price: number;
  qty: number;
  stock: number;
};

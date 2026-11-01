import { routes } from "./routes";

export const accountNavigation = [
  {
    label: "Quản lý cá nhân",
    items: [
      { label: "Tổng quan", href: routes.account },
      { label: "Thông tin tài khoản", href: routes.profile },
      { label: "Đơn hàng của tôi", href: routes.orders },
      { label: "Sổ địa chỉ", href: routes.addresses },
      { label: "Sản phẩm yêu thích", href: routes.wishlist },
      { label: "Yêu cầu đổi trả", href: routes.returns },
      { label: "Bảo mật", href: routes.security },
    ],
  },
  {
    label: "Ưu đãi & Tích lũy",
    items: [
      { label: "Ví voucher / Đổi ưu đãi", href: routes.rewards },
      { label: "Điểm thưởng", href: routes.loyalty },
      { label: "Thông báo", href: routes.notifications },
    ],
  },
] as const;

export const siteNavigation = [
  {
    label: "Chăm sóc da",
    href: "/categories/cham-soc-da",
    tone: "skincare",
    categorySlug: "cham-soc-da",
  },
  {
    label: "Trang điểm",
    href: "/categories/trang-diem",
    tone: "makeup",
    categorySlug: "trang-diem",
  },
  {
    label: "Cơ thể & Tóc",
    href: "/categories/co-the-toc",
    tone: "bodycare",
    categorySlug: "co-the-toc",
  },
  {
    label: "Phụ kiện",
    href: "/categories/phu-kien",
    tone: "accessories",
    categorySlug: "phu-kien",
  },
  { label: "Thương hiệu", href: routes.brands, tone: "brands" },
  { label: "Khuyến mãi", href: routes.promotions, tone: "promotions" },
  { label: "Sản phẩm mới", href: routes.newArrivals, tone: "new" },
  { label: "Flash Sale", href: routes.flashSale, tone: "flash" },
  { label: "Dear Dahlia", href: "/brands/dear-dahlia", tone: "featured-brand" },
] as const;

export const navigationBrandSlugs = [
  "the-face-shop",
  "clio",
  "dear-dahlia",
  "goodal",
  "peripera",
  "maybelline",
  "cocoon",
  "banila-co",
  "3ce",
  "amuse",
  "la-roche-posay",
  "innisfree",
] as const;

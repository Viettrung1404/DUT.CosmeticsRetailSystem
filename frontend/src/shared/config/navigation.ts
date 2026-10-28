import { routes } from "./routes";

export const accountNavigation = [
  { label: "Quản lý cá nhân", items: [
    { label: "Tổng quan", href: routes.account },
    { label: "Thông tin tài khoản", href: routes.profile },
    { label: "Đơn hàng của tôi", href: routes.orders },
    { label: "Sổ địa chỉ", href: routes.addresses },
    { label: "Sản phẩm yêu thích", href: routes.wishlist },
    { label: "Yêu cầu đổi trả", href: routes.returns },
    { label: "Bảo mật", href: routes.security },
  ] },
  { label: "Ưu đãi & Tích lũy", items: [
    { label: "Ví voucher / Đổi ưu đãi", href: routes.rewards },
    { label: "Điểm thưởng", href: routes.loyalty },
    { label: "Thông báo", href: routes.notifications },
  ] },
] as const;

export const siteNavigation = [
  { label: "Thương hiệu", href: routes.brands, tone: "brands" },
  { label: "Khuyến mãi hot", href: routes.promotions, tone: "promotions" },
  { label: "Trang điểm", href: "/categories/trang-diem", tone: "makeup" },
  { label: "Chăm Sóc Da Mặt", href: "/categories/cham-soc-da", tone: "skincare" },
  { label: "Chăm sóc cơ thể", href: "/categories/cham-soc-co-the-toc", tone: "bodycare" },
  { label: "Sản Phẩm Mới", href: routes.newArrivals, tone: "new" },
  { label: "ZO&FRIENDS", href: "/brands/zo-friends", tone: "friends" },
] as const;

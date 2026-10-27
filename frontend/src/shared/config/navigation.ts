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
  { label: "Sản phẩm", href: routes.products },
  { label: "Hàng mới về", href: routes.newArrivals },
  { label: "Thương hiệu", href: routes.brands },
  { label: "Khuyến mãi", href: routes.promotions },
  { label: "Showroom", href: routes.stores },
  { label: "Góc làm đẹp", href: routes.blog },
] as const;

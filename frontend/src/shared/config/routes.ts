import inventory from "./screen-inventory.json";

export const screenInventory = inventory;

// Canonical paths. Registry does not imply that a page has been implemented.
export const routes = {
  home: "/",
  products: "/products",
  categories: "/categories",
  brands: "/brands",
  search: "/search",
  newArrivals: "/new-arrivals",
  promotions: "/promotions",
  flashSale: "/flash-sale",
  stores: "/stores",
  blog: "/blog",
  faq: "/faq",
  help: "/help",
  cart: "/cart",
  checkout: "/checkout",
  paymentReturn: "/payment/return",
  login: "/login",
  register: "/register",
  verifyEmail: "/verify-email",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  oauthContinue: "/oauth/continue",
  account: "/account",
  profile: "/account/profile",
  addresses: "/account/addresses",
  orders: "/account/orders",
  wishlist: "/account/wishlist",
  loyalty: "/account/loyalty",
  rewards: "/account/loyalty/rewards",
  returns: "/account/returns",
  newReturn: "/account/returns/new",
  notifications: "/account/notifications",
  security: "/account/security",
  maintenance: "/maintenance",
} as const;

export const resourceRoutes = {
  product: (slug: string) => `/products/${encodeURIComponent(slug)}`,
  category: (slug: string) => `/categories/${encodeURIComponent(slug)}`,
  brand: (slug: string) => `/brands/${encodeURIComponent(slug)}`,
  promotion: (id: string) => `/promotions/${encodeURIComponent(id)}`,
  store: (id: string) => `/stores/${encodeURIComponent(id)}`,
  article: (slug: string) => `/blog/${encodeURIComponent(slug)}`,
  blogCategory: (slug: string) => `/blog/category/${encodeURIComponent(slug)}`,
  order: (id: string) => `/account/orders/${encodeURIComponent(id)}`,
  tracking: (id: string) => `/account/orders/${encodeURIComponent(id)}/tracking`,
  orderSuccess: (id: string) => `/order-success/${encodeURIComponent(id)}`,
  returnDetail: (id: string) => `/account/returns/${encodeURIComponent(id)}`,
};

const reserved = new Set([
  ...Object.values(routes).map((route) => route.split("/")[1]),
  "api",
  "_next",
  "dev",
  "pages",
  "order-success",
  "payment",
  "oauth",
  "sitemap.xml",
  "sitemaps",
  "robots.txt",
  "favicon.ico",
]);

export function cmsPath(slug: string, publishedSlugs: readonly string[]): string | null {
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    reserved.has(slug) ||
    !publishedSlugs.includes(slug)
  )
    return null;
  return `/${slug}`;
}

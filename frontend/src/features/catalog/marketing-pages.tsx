import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  ShoppingBag,
  MapPin,
  Phone,
  Clock3,
  Search,
  ReceiptText,
  Truck,
  RotateCcw,
  Gem,
} from "lucide-react";
import { ApiError } from "@/shared/api/errors";
import {
  getPromotions,
  getPromotion,
  getFlashCards,
  getBrands,
  getBrand,
  getProducts,
  getStores,
  getStore,
  getFaqs,
} from "./server";
import { CatalogImage, ProductGrid, formatPrice } from "./components";
import { FavoriteButton } from "./favorite-button";
import { BrandDirectory } from "./brand-directory";
import { FaqList } from "./faq-list";
import { FlashSaleBody, FlashSaleHero } from "./flash-sale-view";
import { PromotionsHub, type PromotionsTab } from "./promotions-hub";
import { StoreLocator } from "./store-locator";
import {
  ContentBadge,
  ContentBreadcrumb,
  ContentEmpty,
  ContentPagination,
  contentDate,
} from "./content-layout";

export function requestedPage(value?: string) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? Math.min(page, 10000) : 1;
}
export async function publicDetail<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export async function PromotionsScreen({
  page,
  initialTab = "campaigns",
}: {
  page: number;
  initialTab?: PromotionsTab;
}) {
  const [campaigns, flashCards] = await Promise.all([
    getPromotions(page),
    getFlashCards(20).catch(() => []),
  ]);
  return (
    <PromotionsHub
      campaigns={campaigns}
      flashCards={flashCards}
      page={page}
      initialTab={initialTab}
    />
  );
}

export async function PromotionScreen({ id, page }: { id: string; page: number }) {
  const promotion = await publicDetail(() => getPromotion(id, page));
  return (
    <main id="main-content" className="content-page">
      <div className="content-container">
        <ContentBreadcrumb
          current={promotion.name}
          parent={{ href: "/promotions", label: "Khuyến mãi" }}
        />
        <section className="campaign-detail">
          <div className="campaign-detail-copy">
            <ContentBadge>{promotion.isFlashSale ? "FLASH SALE" : "ĐANG DIỄN RA"}</ContentBadge>
            <h1>{promotion.name}</h1>
            <p>{promotion.description}</p>
            <div className="campaign-conditions">
              <div>
                <CalendarDays size={24} />
                <div>
                  <small>THỜI GIAN ÁP DỤNG</small>
                  <strong>
                    {contentDate(promotion.startDate)} – {contentDate(promotion.endDate)}
                  </strong>
                </div>
              </div>
              <div>
                <ShoppingBag size={24} />
                <div>
                  <small>ĐIỀU KIỆN ÁP DỤNG</small>
                  <strong>
                    {promotion.minOrderAmount > 0
                      ? `Đơn từ ${formatPrice(promotion.minOrderAmount)}`
                      : "Theo sản phẩm trong chương trình"}
                  </strong>
                </div>
              </div>
            </div>
            <a className="content-primary" href="#campaign-products">
              Khám phá sản phẩm <ArrowRight size={16} />
            </a>
          </div>
          <div className="campaign-detail-media">
            <CatalogImage
              src="/images/stitch/content/campaign-detail.webp"
              alt="Bộ sưu tập chăm sóc sắc đẹp GlowUp"
            />
          </div>
        </section>
        <section className="content-section campaign-products" id="campaign-products">
          <div className="content-section-heading">
            <h2>Sản phẩm áp dụng khuyến mãi</h2>
          </div>
          {promotion.products.length ? (
            <div className="catalog-grid">
              {promotion.products.map((product) => (
                <article className="catalog-card" key={product.variantId}>
                  <Link className="catalog-card-image" href={`/products/${product.slug}`}>
                    <CatalogImage src={product.imageUrl} alt={product.name} />
                  </Link>
                  <FavoriteButton
                    productId={product.productId}
                    slug={product.slug}
                    name={product.name}
                    className="catalog-favorite"
                  />
                  <div className="catalog-card-copy">
                    <Link className="catalog-card-title" href={`/products/${product.slug}`}>
                      {product.name}
                    </Link>
                    <p className="catalog-prices">
                      <strong>{formatPrice(product.price)}</strong>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <del>{formatPrice(product.originalPrice)}</del>
                      )}
                    </p>
                    <small>
                      {product.remaining > 0
                        ? `Còn ${product.remaining} lượt ưu đãi`
                        : "Hết lượt ưu đãi"}
                    </small>
                    <Link className="content-product-link" href={`/products/${product.slug}`}>
                      Xem sản phẩm <ArrowRight size={14} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <ContentEmpty title="Chương trình áp dụng theo điều kiện đơn hàng">
              Xem thể lệ trước khi xác nhận đơn hàng tại bước thanh toán.
            </ContentEmpty>
          )}
          <ContentPagination
            page={page}
            total={promotion.total}
            limit={promotion.limit}
            base={`/promotions/${id}`}
          />
        </section>
        <section className="campaign-rules">
          <h2>Thể lệ &amp; Điều kiện chương trình</h2>
          <p>{promotion.description}</p>
          <p>
            Giá và khả năng áp dụng ưu đãi được xác nhận khi thanh toán. Số lượt ưu đãi có thể thay
            đổi khi các đơn hàng được xác nhận.
          </p>
          {promotion.maxDiscountAmount !== null && (
            <p>Mức giảm tối đa: {formatPrice(promotion.maxDiscountAmount)}.</p>
          )}
        </section>
      </div>
    </main>
  );
}

export async function FlashSaleScreen() {
  const cards = await getFlashCards(20);
  return (
    <main id="main-content" className="content-page">
      <section className="content-hero">
        <div className="content-container">
          <ContentBreadcrumb current="Flash Sale" />
          <FlashSaleHero cards={cards} />
        </div>
      </section>
      <FlashSaleBody cards={cards} />
    </main>
  );
}

export async function BrandsScreen() {
  const brands = await getBrands(100);
  return (
    <main id="main-content" className="content-page">
      <section className="content-hero content-hero-center">
        <div className="content-container">
          <ContentBreadcrumb current="Thương hiệu" />
          <ContentBadge>THẾ GIỚI LÀM ĐẸP GLOWUP</ContentBadge>
          <h1>Khám Phá Thương Hiệu Yêu Thích</h1>
          <p>Tìm thương hiệu và khám phá các sản phẩm chăm sóc sắc đẹp dành cho bạn.</p>
        </div>
      </section>
      <section className="content-container">
        <BrandDirectory brands={brands} />
      </section>
    </main>
  );
}
export async function BrandScreen({ slug }: { slug: string }) {
  const brand = await publicDetail(() => getBrand(slug));
  const products = await getProducts({ brandId: brand.id, limit: 12 });
  return (
    <main id="main-content" className="content-page">
      <div className="content-container">
        <ContentBreadcrumb
          current={brand.name}
          parent={{ label: "Thương hiệu", href: "/brands" }}
        />
        {brand.bannerUrl && (
          <CatalogImage className="brand-banner" src={brand.bannerUrl} alt={brand.name} />
        )}
        <section className="brand-hero">
          {brand.logoUrl && (
            <CatalogImage className="brand-identity" src={brand.logoUrl} alt={brand.name} />
          )}
          <div>
            <ContentBadge>THƯƠNG HIỆU TẠI GLOWUP</ContentBadge>
            <h1>{brand.name}</h1>
            <p>{brand.description}</p>
            {brand.countryOfOrigin && <p>Xuất xứ: {brand.countryOfOrigin}</p>}
          </div>
        </section>
        <section className="content-section">
          <div className="content-section-heading">
            <h2>Sản phẩm {brand.name}</h2>
            <Link href={`/products?brandId=${brand.id}`}>
              Xem tất cả &amp; bộ lọc <ArrowRight size={16} />
            </Link>
          </div>
          <ProductGrid products={products.data} />
        </section>
      </div>
    </main>
  );
}

export async function StoresScreen() {
  const stores = await getStores().catch(() => []);
  return (
    <main id="main-content">
      <StoreLocator initialStores={stores} />
    </main>
  );
}

export async function StoreScreen({ id }: { id: string }) {
  const store = await publicDetail(() => getStore(id));
  const rawHours =
    store.openingHours && typeof store.openingHours === "object"
      ? (store.openingHours as Record<string, unknown>)
      : {};
  const displayHours =
    typeof rawHours.display === "string"
      ? rawHours.display
      : typeof rawHours.mon_sun === "string"
        ? rawHours.mon_sun
        : "08:00 - 22:00";

  return (
    <main id="main-content" className="content-page">
      <div className="content-container">
        <ContentBreadcrumb
          current={store.name}
          parent={{ label: "Hệ thống cửa hàng", href: "/stores" }}
        />
        <section className="store-header">
          <ContentBadge>SHOWROOM GLOWUP</ContentBadge>
          <h1>{store.name}</h1>
          <p>
            {store.city} · {store.district}
          </p>
        </section>
        <div className="store-directory">
          <section className="store-info">
            <span className="content-icon">
              <MapPin />
            </span>
            <h2>Địa chỉ chi nhánh</h2>
            <p>
              {store.address}, {store.district}, {store.city}
            </p>
            {store.latitude !== null && store.longitude !== null && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Xem đường đi trên bản đồ <ArrowRight size={16} />
              </a>
            )}
          </section>
          <section className="store-info">
            <span className="content-icon">
              <Clock3 />
            </span>
            <h2>Giờ hoạt động &amp; liên hệ</h2>
            <p>Giờ mở cửa: {displayHours}</p>
            {store.phone && (
              <p>
                <a href={`tel:${store.phone.replace(/\s+/g, "")}`}>
                  <Phone size={16} style={{ display: "inline", marginRight: 6 }} />
                  {store.phone}
                </a>
              </p>
            )}
            {store.email && (
              <p>
                <a href={`mailto:${store.email}`}>{store.email}</a>
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export async function HelpScreen() {
  const groups = await getFaqs();
  const topics = [
    {
      icon: ReceiptText,
      title: "Đơn hàng & Thanh toán",
      body: "Tra cứu đơn hàng và hướng dẫn thanh toán bằng COD hoặc SEPAY.",
      href: "/account/orders",
      link: "Theo dõi đơn hàng",
    },
    {
      icon: Truck,
      title: "Vận chuyển & Giao nhận",
      body: "Xem thông tin giao hàng và chính sách vận chuyển cho đơn mua của bạn.",
      href: "/chinh-sach-giao-hang",
      link: "Chính sách giao hàng",
    },
    {
      icon: RotateCcw,
      title: "Đổi trả & Hoàn tiền",
      body: "Tìm hiểu điều kiện đổi trả trong 7 ngày và theo dõi yêu cầu xử lý.",
      href: "/chinh-sach-doi-tra",
      link: "Chính sách đổi trả",
    },
    {
      icon: Gem,
      title: "Hội viên GlowUp",
      body: "Khám phá số dư điểm, quyền lợi và ưu đãi dành cho thành viên.",
      href: "/account/loyalty",
      link: "Điểm & quyền lợi thành viên",
    },
  ];
  return (
    <main id="main-content" className="content-page">
      <section className="content-hero content-hero-center">
        <div className="content-container">
          <ContentBreadcrumb current="Trợ giúp & Hỗ trợ khách hàng" />
          <ContentBadge>TRUNG TÂM TRỢ GIÚP</ContentBadge>
          <h1>GlowUp luôn sẵn sàng hỗ trợ bạn</h1>
          <p>Tìm nhanh câu trả lời về đơn hàng, giao nhận, đổi trả và quyền lợi thành viên.</p>
          <form className="support-search" action="/faq" role="search">
            <Search size={22} />
            <label className="sr-only" htmlFor="help-query">
              Tìm câu trả lời
            </label>
            <input id="help-query" name="q" placeholder="Nhập vấn đề bạn cần giải đáp..." />
            <button type="submit">Tìm kiếm</button>
          </form>
          <div className="support-suggestions">
            <span>Gợi ý:</span>
            <Link href="/faq?q=đổi%20trả">Đổi trả 7 ngày</Link>
            <Link href="/faq?q=thanh%20toán">Thanh toán</Link>
            <Link href="/faq?q=điểm">Tích điểm</Link>
          </div>
        </div>
      </section>
      <section className="content-container help-topics">
        {topics.map((topic) => (
          <article className="help-topic" key={topic.title}>
            <span className="content-icon">
              <topic.icon />
            </span>
            <h2>{topic.title}</h2>
            <p>{topic.body}</p>
            <Link href={topic.href}>
              <ArrowRight size={14} />
              {topic.link}
            </Link>
          </article>
        ))}
      </section>
      <section className="content-narrow content-section">
        <div className="content-section-heading">
          <div>
            <ContentBadge>GIẢI ĐÁP NHANH</ContentBadge>
            <h2 style={{ marginTop: 12 }}>Câu hỏi phổ biến nhất</h2>
          </div>
          <Link href="/faq">
            Xem tất cả <ArrowRight size={16} />
          </Link>
        </div>
        <FaqList groups={groups} compact />
      </section>
      <section className="content-container">
        <div className="support-bottom">
          <div>
            <ContentBadge>ĐỒNG HÀNH CÙNG BẠN</ContentBadge>
            <h2>Thông tin mua sắm minh bạch</h2>
            <p>Xem điều kiện giao hàng, đổi trả và quyền riêng tư trước khi mua sắm.</p>
          </div>
          <Link href="/chinh-sach-bao-mat" className="content-primary">
            Chính sách bảo mật <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}

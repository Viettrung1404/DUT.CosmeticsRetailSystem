import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Gift,
  ShoppingBag,
  Zap,
  Info,
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
import { CatalogImage, FlashGrid, ProductGrid, formatPrice } from "./components";
import { FlashCountdown } from "./home-motion";
import { BrandDirectory } from "./brand-directory";
import { FaqList } from "./faq-list";
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

export async function PromotionsScreen({ page }: { page: number }) {
  const campaigns = await getPromotions(page);
  return (
    <main id="main-content" className="content-page">
      <section className="content-hero">
        <div className="content-container">
          <ContentBreadcrumb current="Khuyến mãi" />
          <div className="content-hero-row">
            <div>
              <ContentBadge>GLOWUP EXCLUSIVE OFFERS</ContentBadge>
              <h1>ƯU ĐÃI DÀNH RIÊNG CHO BẠN</h1>
              <p>Khám phá các chương trình làm đẹp và ưu đãi đang diễn ra tại GlowUp Beauty.</p>
            </div>
            <div className="content-metric">
              <span className="content-icon">
                <Gift />
              </span>
              <div>
                <strong>{campaigns.total.toString().padStart(2, "0")} ƯU ĐÃI</strong>
                <small>Đang áp dụng hôm nay</small>
              </div>
            </div>
          </div>
          <nav
            className="content-pills"
            aria-label="Chương trình khuyến mãi"
            style={{ marginTop: 32 }}
          >
            <Link href="/promotions" aria-current="page">
              Đang diễn ra <small>{campaigns.total}</small>
            </Link>
            <Link href="/flash-sale">
              <Zap size={15} /> Flash Sale
            </Link>
          </nav>
        </div>
      </section>
      <section className="content-container content-section">
        <div className="content-section-heading">
          <h2>Chiến dịch nổi bật</h2>
        </div>
        {campaigns.items.length ? (
          <div className="campaign-grid">
            {campaigns.items.map((campaign, index) => (
              <article key={campaign.id} className="campaign-tile">
                <Link className="campaign-art" href={`/promotions/${campaign.id}`}>
                  <CatalogImage
                    src={`/images/stitch/content/campaign-${(index % 4) + 1}.webp`}
                    alt=""
                  />
                  <span>{campaign.isFlashSale ? "FLASH SALE" : "ĐANG DIỄN RA"}</span>
                  <div>
                    <h2>{campaign.name}</h2>
                    {campaign.type === "PERCENTAGE" && <strong>{campaign.value}%</strong>}
                  </div>
                </Link>
                <div className="campaign-copy">
                  <p>
                    {campaign.description ||
                      "Xem chi tiết sản phẩm và điều kiện áp dụng của chương trình."}
                  </p>
                  <div>
                    <span>
                      <CalendarDays size={14} style={{ display: "inline", marginRight: 5 }} />
                      {contentDate(campaign.startDate)} – {contentDate(campaign.endDate)}
                    </span>
                    <Link href={`/promotions/${campaign.id}`}>
                      Khám phá ngay <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <ContentEmpty title="Chưa có chương trình đang diễn ra">
            Các ưu đãi mới sẽ được cập nhật tại đây.
          </ContentEmpty>
        )}
        <ContentPagination
          page={page}
          total={campaigns.total}
          limit={campaigns.limit}
          base="/promotions"
        />
      </section>
    </main>
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
                  <div className="catalog-card-copy">
                    <Link className="catalog-card-title" href={`/products/${product.slug}`}>
                      {product.name}
                    </Link>
                    <p className="catalog-prices">
                      <strong>{formatPrice(product.price)}</strong>
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
  const first = cards[0];
  const endDate = cards.map((card) => card.endDate).sort()[0];
  return (
    <main id="main-content" className="content-page">
      <section className="content-hero">
        <div className="content-container">
          <ContentBreadcrumb current="Flash Sale" />
          <div className="flash-hero-layout">
            <div>
              <ContentBadge>
                <Zap size={14} /> DEAL GIỚI HẠN · ƯU ĐÃI MỖI NGÀY
              </ContentBadge>
              <h1>
                FLASH SALE CỰC XINH
                <br />
                GIÁ SỐC GIỜ VÀNG
              </h1>
              <p>
                Săn ưu đãi cho những sản phẩm yêu thích. Số lượt ưu đãi và giá được xác nhận tại
                bước thanh toán.
              </p>
            </div>
            <div className="flash-clock-panel">
              <p>Ưu đãi hiện tại kết thúc sau</p>
              {first && endDate ? (
                <FlashCountdown endDate={endDate} serverTime={first.serverTime} />
              ) : (
                <span className="muted">Chờ chương trình tiếp theo</span>
              )}
            </div>
          </div>
        </div>
      </section>
      <div className="flash-active-bar">
        <div className="content-container">
          <ContentBadge>
            <Zap size={15} /> Đang diễn ra
          </ContentBadge>
          <span>{cards.length} lựa chọn đang có ưu đãi</span>
        </div>
      </div>
      <section className="content-container content-section campaign-products">
        <FlashGrid cards={cards} />
      </section>
      <section className="content-container">
        <div className="campaign-rules">
          <h2>
            <Info size={20} style={{ display: "inline", marginRight: 8 }} />
            Quy định mua hàng Flash Sale tại GlowUp Beauty
          </h2>
          <p>
            Ưu đãi có số lượt giới hạn. Thêm sản phẩm vào giỏ hàng không giữ giá hoặc giữ lượt ưu
            đãi; hệ thống xác nhận lại khi đặt hàng.
          </p>
          <p>
            Với sản phẩm có điều kiện áp dụng, xem chi tiết và tổng tiền tại bước thanh toán trước
            khi xác nhận.
          </p>
        </div>
      </section>
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
  const stores = await getStores();
  return (
    <main id="main-content" className="content-page">
      <div className="content-container">
        <ContentBreadcrumb current="Hệ thống cửa hàng" />
        <section className="store-header">
          <ContentBadge>
            <MapPin size={14} /> KHÔNG GIAN LÀM ĐẸP GLOWUP
          </ContentBadge>
          <h1>Hệ thống Showroom GlowUp</h1>
          <p>
            Tìm thông tin địa chỉ, giờ hoạt động và liên hệ cửa hàng để chuẩn bị cho chuyến ghé thăm
            của bạn.
          </p>
        </section>
        <section className="content-section">
          {stores.length ? (
            <div className="store-directory">
              {stores.map((store) => (
                <article className="store-info" key={store.id}>
                  <ContentBadge>{store.city}</ContentBadge>
                  <h2>{store.name}</h2>
                  <p>
                    <MapPin size={15} style={{ display: "inline", marginRight: 5 }} />
                    {store.address}, {store.district}
                  </p>
                  {store.phone && <p>{store.phone}</p>}
                  <Link href={`/stores/${store.id}`}>
                    Xem thông tin cửa hàng <ArrowRight size={16} />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <ContentEmpty title="Thông tin showroom đang được cập nhật">
              Danh sách địa chỉ và giờ hoạt động sẽ được công bố tại đây khi có thông tin chính
              thức.
            </ContentEmpty>
          )}
        </section>
      </div>
    </main>
  );
}
export async function StoreScreen({ id }: { id: string }) {
  const store = await publicDetail(() => getStore(id));
  const hours =
    store.openingHours && typeof store.openingHours === "object"
      ? Object.entries(store.openingHours)
      : [];
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
            {hours.map(([day, value]) => (
              <p key={day}>
                {day}: {String(value)}
              </p>
            ))}
            {store.phone && (
              <a href={`tel:${store.phone}`}>
                <Phone size={16} />
                {store.phone}
              </a>
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
      body: "Tra cứu đơn hàng và hướng dẫn thanh toán bằng COD hoặc VNPAY.",
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

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../');
const catalog = require('../../.catalog-data/catalog.json');
const snapshots = require('../../.catalog-data/collected.json');
const output = path.join(root, '.catalog-data/flash-price-references.json');
const references = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output, 'utf8')) : {};
const variants = new Map();
for (const row of snapshots) {
  for (const variant of row.product.variants || []) variants.set(String(variant.id), {
    originalPrice: Number(variant.priceBeforeDiscount || variant.price),
    price: Number(variant.price), url: row.source.url, fetchedAt: row.source.fetchedAt,
    status: 'historical-snapshot',
  });
}
let cursor = 0;
async function worker() {
  while (cursor < catalog.products.length) {
    const product = catalog.products[cursor++];
    for (const source of product.sources) {
      if (references[source.url]?.status === 'live' && references[source.url]?.pricingVersion === 2) continue;
      const result = { pricingVersion: 2, url: source.url, fetchedAt: new Date().toISOString(), status: 'unavailable', variants: {} };
      try {
        const response = await fetch(source.url, { signal: AbortSignal.timeout(15000) });
        if ([401, 403, 429].includes(response.status)) {
          throw new Error(`HTTP_${response.status}`);
        }
        if (!response.ok) throw new Error(`HTTP_${response.status}`);
        const html = await response.text();
        const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (!match) throw new Error('PUBLIC_PRODUCT_DATA_UNAVAILABLE');
        const data = JSON.parse(match[1]);
        function scan(value) {
          if (!value || typeof value !== 'object') return;
          if (Array.isArray(value.variants) && value.currentPrice != null) {
            result.productCurrentPrice = Number(value.currentPrice);
            result.productDiscountPercent = Number(value.discountPercentPrice || 0);
          }
          if (value.productId && value.id && value.price != null && value.priceBeforeDiscount != null) {
            result.variants[`GU-V-${value.id}`] = {
              originalPrice: Number(value.priceBeforeDiscount), price: Number(value.price),
            };
          }
          for (const child of Object.values(value)) if (child && typeof child === 'object') scan(child);
        }
        scan(data.props?.pageProps?.initialReduxState?.productsApi);
        result.status = Object.keys(result.variants).length ? 'live' : 'no-variant-prices';
        for (const reference of Object.values(result.variants)) {
          reference.productCurrentPrice = result.productCurrentPrice;
          reference.productDiscountPercent = result.productDiscountPercent;
        }
      } catch (error) { result.error = error.message; }
      for (const variant of product.variants) {
        if (!result.variants[variant.sku]) {
          const previous = variants.get(variant.sku.replace('GU-V-', ''));
          if (previous) result.variants[variant.sku] = previous;
        }
      }
      references[source.url] = result;
      fs.writeFileSync(output, JSON.stringify(references, null, 2));
    }
  }
}
Promise.all(Array.from({ length: 4 }, worker)).then(() => {
  console.log(JSON.stringify({ sources: Object.keys(references).length,
    liveSources: Object.values(references).filter((r) => r.status === 'live').length }));
});

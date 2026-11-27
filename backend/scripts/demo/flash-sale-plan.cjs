function charmPricesBelow(price) {
  const prices = [];
  for (let block = 0; block < price; block += 10000) {
    for (const ending of [5000, 9000]) if (block + ending < price) prices.push(block + ending);
  }
  return prices;
}

function choosePrice(candidates, target, used) {
  const price = candidates.filter((value) => !used.has(value))
    .sort((a, b) => Math.abs(a - target) - Math.abs(b - target) || a - b)[0];
  if (!price) throw new Error('Not enough distinct 5,000/9,000 prices: target=' + target + ', candidates=' + candidates.length + ', used=' + used.size);
  used.add(price);
  return price;
}

function buildSlotPlan(products, references, slot) {
  return products.flatMap((product, productRank) => {
    const useCharm = product.variants.length <= charmPricesBelow(Math.min(...product.variants.map((v) => Number(v.price))) * 0.55).length;
    const regularUsed = new Set();
    const featuredUsed = new Set();
    return [...product.variants].sort((a, b) => Number(a.price) - Number(b.price) || a.id.localeCompare(b.id))
      .map((variant, variantIndex) => {
        const originalPrice = Number(variant.price);
        const reference = references.get(variant.sku);
        const observedRate = reference?.originalPrice > reference?.price
          ? 100 * (1 - reference.price / reference.originalPrice) : (reference?.productDiscountPercent || 15);
        const normalRate = Math.min(30, Math.max(12, observedRate - 8)) +
          ((productRank * 7 + variantIndex * 3 + slot * 5) % 9);
        const candidates = useCharm ? charmPricesBelow(originalPrice)
          : Array.from({ length: Math.max(0, Math.floor((originalPrice - 1) / 1000)) }, (_, i) => (i + 1) * 1000);
        const salePrice = choosePrice(candidates.filter((price) => price <= originalPrice * 0.88), originalPrice * (1 - normalRate / 100), regularUsed);
        const featuredSalePrice = choosePrice(candidates.filter((price) => price < salePrice),
          Math.min(salePrice * 0.84, originalPrice * (1 - (normalRate + 14) / 100)), featuredUsed);
        return { productId: product.id, name: product.name, variantId: variant.id, sku: variant.sku,
          option: [variant.option1Value, variant.option2Value].filter(Boolean).join(' / '),
          slotStartHour: slot * 2, originalPrice, salePrice, featuredSalePrice, productRank,
          discountPercent: Number((100 * (1 - salePrice / originalPrice)).toFixed(2)),
          featuredDiscountPercent: Number((100 * (1 - featuredSalePrice / originalPrice)).toFixed(2)),
          roundingPolicy: useCharm ? "5000-or-9000" : "1000-low-price-many-variants",
          reference: reference ?? null };
      });
  });
}

module.exports = { charmPricesBelow, buildSlotPlan };

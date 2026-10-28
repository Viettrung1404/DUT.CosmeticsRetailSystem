# GlowUp catalog dataset

350 normalized cosmetic products, 5 demo stores and 1 warehouse. Roles and
permissions are never seeded by this pipeline.

## Completed import — 2026-10-27

- 350 imported products, 1,037 variants, 975 product-image records on Cloudflare R2.
- Every imported product has a gallery: 77 with 2 photos, 272 with 3, 1 with 5.
- 400 variants have explicitly linked photos.
- 5 stores + 1 warehouse; 6,222 inventory rows, matching batches and opening ledger entries.
- The six temporary products were replaced. One unrelated product was preserved
  (351 total products in DB). Empty legacy seed categories were removed.
- Verification found no inventory/batch mismatches. Roles, permissions and the
  unrelated product matched the pre-import snapshot. A repeat seed preserved
  stock and ledger counts. Five normalization tests passed.

Open `.catalog-data/gallery.html`, or run `npm run catalog:serve` and visit
`http://localhost:4010`. Each card has **Xem bộ ảnh** to expand its photo gallery.

## Requirements and commands

Run from `backend`. Requires Python 3.10+ with Pillow (`python -m pip install
Pillow`), installed backend npm dependencies, and the backend `.env`.

```powershell
npm run catalog:collect
npm run catalog:gallery
npm run catalog:normalize
npm run catalog:validate
npm run catalog:upload
npm run seed:stores
npm run seed:products:clean
npm run catalog:verify
```

`catalog:collect` gathers up to 390 source products to allow for family merging
and rejected data; normalization selects 350. Re-run normalization after
collection has finished. Unknown brands go to the report for explicit mapping,
not a fabricated brand. If fewer than 350 survive, expand collections or mappings.

`seed:products:clean` replaces **only** the six SKUs from the old temporary seed.
It does not truncate tables or remove unrelated products/categories/brands.
Empty categories belonging to that old seed are removed after import; categories
still referenced by a product or child category are preserved.
Legacy product graphs are backed up locally before deletion. Existing operational
foreign keys cause the transaction to abort, rather than deleting orders/history.
After the first run use `npm run seed:products`. For a read-only DB preview:

```powershell
node --env-file=.env scripts/catalog/seed.cjs --clean-legacy --dry-run
```

If cloud storage is unavailable, use local-first mode (URLs work on this computer only):

```powershell
npm run catalog:serve
# In another terminal:
node --env-file=.env scripts/catalog/seed.cjs --clean-legacy --local
```

After storage is resumed, run `catalog:upload` then `catalog:publish` to replace
the local image URLs in DB and enqueue search reindexing. Do not reseed or reset
inventory just to migrate images. If using Next.js Image, its remotePatterns must
explicitly allow the chosen storage host; the current frontend has an empty list.

## Files (local, excluded from git)

- `.catalog-data/raw/`: cached public catalog responses and image rejection reasons.
- `.catalog-data/images/`: local WebP images, never upscaled.
- `.catalog-data/collected.json`: accepted source products and source URLs.
- `.catalog-data/catalog.json`: normalized import dataset with stable identifiers.
- `.catalog-data/normalization-report.json`: unresolved brands and merged options.
- `.catalog-data/gallery.html`: local image review, produced by validation.
- `.catalog-data/uploaded.json`: checksum to cloud URL mapping, resumable uploads.
- `.catalog-data/seed-report.json` and `verification-report.json`: DB results.

Images come from the public Beauty Box product gallery, not customer reviews.
The collector uses public Next.js navigation data discovered from the page build,
with HTML fallback, three workers, pacing, retries and disk cache. HTTP 401/403/429
stops collection; it does not bypass challenges or rotate identities. The source's
robots.txt was checked during initial research; recheck source conditions before
future collection. Public availability does not itself grant image redistribution
rights; source URLs are retained for attribution and rights review.

Gallery enrichment uses up to six workers for static CDN assets. Local
`curation.json` records rejected photos, excluded low-quality sources and manually
selected primary photos after visual review. The final selection prefers products
with multiple usable images from the reserve pool.

Primary images must be at least 800px on the short edge; gallery images at least
700px, without upscaling. Images pass a conservative neutral
border filter. This filter rejects bright sale frames but is not OCR and cannot
guarantee the absence of every logo or embedded text; inspect gallery.html before
publishing. Gallery enrichment targets three distinct photos per source product,
and merged product families can retain up to five. SHA-256 and perceptual hashes
remove duplicates. Products with insufficient usable source photos are reported in
gallery-report.json. Variant photos are linked only when the source identifies
the variant unambiguously. Additional lifestyle photos are not guaranteed.

Cloud upload uses the backend's existing `STORAGE_*` settings. Objects use
`catalog/beautybox/<sha256>.webp`; no existing unrelated objects are overwritten.
Upload never changes the database. Seed refuses missing cloud URLs. The local
download remains available independently of cloud storage.

## Data rules

- Prices are a dated snapshot of source retail prices; discounts are not recreated
  as GlowUp promotions. Reviews, ratings, source sales counts and source stock are
  not imported.
- Cost price is **synthetic demo data**, 65% of the retail price rounded to 1,000 VND.
- Inventory and batches are synthetic opening balances for each variant at all six
  locations. Manufacturing/expiry dates are demo fixtures, not scraped facts.
- Each opening inventory row has a matching batch and `IN` ledger entry.
- Subsequent seed runs insert missing records and never reset existing stock,
  overwrite role permissions, replace passwords or update live prices.
- Product IDs, variant IDs, image IDs and ledger IDs are deterministic. Exact
  product titles differing only in volume are grouped. Formulations are not fuzzy
  matched. Invalid/multiple/duplicate source barcodes are omitted.
- Only explicitly labelled short key ingredient names are extracted. A full INCI
  dataset and verified concentrations need a separate editorial pass.
- Product descriptions are sanitized to simple text formatting; embedded scripts,
  styles, images, iframes and source store UI are removed.

`catalog:test` covers family grouping, stable IDs, barcode collision handling,
deduplication, HTML sanitization and unknown-brand quarantine. `catalog:validate`
checks dataset size, unique keys/options, prices, file hashes and real dimensions.
`catalog:verify` checks database counts and consistency of inventory vs batches.
Catalog search jobs are queued by existing DB triggers; the application's indexing
worker still needs to run to refresh Elasticsearch.

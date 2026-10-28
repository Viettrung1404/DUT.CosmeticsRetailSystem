"""Add distinct product/variant gallery photos from cached public product data."""
import argparse
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from collect import ROOT, CDN, download, save

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--images', type=int, default=5)
    args = parser.parse_args()
    rows = json.loads((ROOT / 'collected.json').read_text(encoding='utf-8'))
    curation_path = ROOT / 'curation.json'
    rejected = set(json.loads(curation_path.read_text(encoding='utf-8')).get('rejectedImageHashes', [])) if curation_path.exists() else set()
    def enrich(row):
        p = row['product']
        cache = ROOT / 'raw' / ('gallery-v2-' + p['id'] + '.json')
        if cache.exists():
            cached = json.loads(cache.read_text(encoding='utf-8'))
            photos = cached if isinstance(cached, list) else cached['images']
            requested = 3 if isinstance(cached, list) else cached['requested']
            if requested >= args.images and not any(im['sha256'] in rejected for im in photos):
                row['images'] = photos
                return row
        urls = []
        variants = [v for v in p.get('variants', []) if v.get('isActive') and v.get('thumbnail')]
        gallery = [m['url'] for m in sorted(p.get('medias', []), key=lambda m: m.get('priority') or 0) if m.get('type') == 'image']
        # Keep a packshot first, then interleave gallery and variant images.
        urls.extend(i['sourceUrl'] for i in row['images'] if i['sha256'] not in rejected)
        for i in range(max(len(gallery), len(variants))):
            if i < len(gallery): urls.append(gallery[i])
            if i < len(variants): urls.append(variants[i]['thumbnail'])
        images, issues = [], []
        for raw in list(dict.fromkeys(urls))[:24]:
            url = raw if raw.startswith('https://') else CDN + raw
            try:
                image = download(url, gallery=bool(images))
                if not image or image['sha256'] in rejected: continue
                image['sourceVariantIds'] = [v['id'] for v in variants if (v['thumbnail'] if v['thumbnail'].startswith('https://') else CDN + v['thumbnail']) == url]
                if any(image['sha256'] == old['sha256'] or
                       (image['sourceVariantIds'] == old.get('sourceVariantIds', []) and
                        (int(image['perceptualHash'], 16) ^ int(old['perceptualHash'], 16)).bit_count() <= 3)
                       for old in images): continue
                images.append(image)
            except (OSError, ValueError) as error:
                issues.append({'url': url, 'error': str(error)})
            if len(images) >= args.images: break
        if not images:
            # Preserve the record for review, but normalization will quarantine it.
            issues.append({'error': 'No acceptable primary photo after curation'})
        row['images'] = images
        save(cache, {'requested': args.images, 'images': images})
        if issues: save(ROOT / 'raw' / ('gallery-issues-' + p['id'] + '.json'), issues)
        return row
    result = []
    # Static CDN assets only; public product-page collection remains at 3 workers.
    with ThreadPoolExecutor(max_workers=6) as pool:
        for enriched in pool.map(enrich, rows):
            result.append(enriched)
            # Keep the complete list on disk while enriching, including pending rows.
            if len(result) % 9 == 0 or len(result) == len(rows):
                save(ROOT / 'collected.json', result + rows[len(result):])
                print(f'Gallery {len(result)}/{len(rows)}; images={sum(len(r["images"]) for r in result)}', flush=True)
    save(ROOT / 'gallery-report.json', {'products': len(result), 'images': sum(len(r['images']) for r in result),
         'withMultipleImages': sum(len(r['images']) > 1 for r in result),
         'fewerThanThree': [{'id': r['product']['id'], 'count': len(r['images'])} for r in result if len(r['images']) < 3]})

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()

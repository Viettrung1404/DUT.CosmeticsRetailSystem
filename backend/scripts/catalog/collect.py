"""Collect public Beauty Box catalog snapshots and original images. Resume-safe.
Python 3.10+, Pillow. No credentials, private APIs or browser challenge bypass.
"""
import argparse
import hashlib
import gzip
import io
import json
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2] / '.catalog-data'
BASE = 'https://beautybox.com.vn'
CDN = 'https://image.hsv-tech.io/'
BUILD = None
COLLECTIONS = [
    ('sua-rua-mat', 'Sữa rửa mặt', 'cham-soc-da'),
    ('tay-trang-da-mat', 'Tẩy trang', 'cham-soc-da'),
    ('tinh-chat-duong', 'Serum và tinh chất', 'cham-soc-da'),
    ('nuoc-can-bang', 'Toner', 'cham-soc-da'),
    ('kem-duong-da-mat-va-mat', 'Kem dưỡng da', 'cham-soc-da'),
    ('chong-nang', 'Chống nắng', 'cham-soc-da'),
    ('mat-na-giay', 'Mặt nạ', 'cham-soc-da'),
    ('son-thoi', 'Son thỏi', 'trang-diem'),
    ('son-kem', 'Son kem', 'trang-diem'),
    ('phan-nuoc-cushion', 'Cushion', 'trang-diem'),
    ('kem-nen-foundation', 'Kem nền', 'trang-diem'),
    ('phan-phu', 'Phấn phủ', 'trang-diem'),
    ('phan-ma-hong', 'Má hồng', 'trang-diem'),
    ('phan-mat', 'Phấn mắt', 'trang-diem'),
    ('mascara', 'Mascara', 'trang-diem'),
    ('chi-ke-vien-mat', 'Kẻ mắt', 'trang-diem'),
    ('sua-gel-tam', 'Sữa tắm', 'co-the-toc'),
    ('duong-the', 'Dưỡng thể', 'co-the-toc'),
    ('dau-goi-dau', 'Dầu gội', 'co-the-toc'),
    ('san-pham-duong-toc', 'Dưỡng tóc', 'co-the-toc'),
    ('co-trang-diem', 'Cọ trang điểm', 'phu-kien'),
    ('mut-trang-diem', 'Mút trang điểm', 'phu-kien'),
    ('tay-te-bao-chet-da-mat', 'Tẩy tế bào chết mặt', 'cham-soc-da'),
    ('son-duong-moi', 'Dưỡng môi', 'cham-soc-da'),
]

def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    temp.replace(path)

def request(url, attempts=3, timeout=25):
    for attempt in range(attempts):
        time.sleep(0.5)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'GlowUp-CatalogResearch/1.0', 'Accept-Encoding': 'gzip'}), timeout=timeout) as r:
                body = r.read()
                return gzip.decompress(body) if r.headers.get('Content-Encoding') == 'gzip' else body
        except urllib.error.HTTPError as e:
            if e.code in (401, 403, 429):
                raise SystemExit(f'Stop: HTTP {e.code} at {url}. Cached progress preserved.')
            if e.code < 500: raise
        except (TimeoutError, urllib.error.URLError):
            if attempt == attempts - 1: raise
        time.sleep(2 ** attempt)
    raise RuntimeError(f'Request failed: {url}')

def page(path, cache):
    if cache.exists(): return json.loads(cache.read_text(encoding='utf-8'))
    try:
        # Same public page data used by the site's Next.js client navigation.
        data = json.loads(request(f'{BASE}/_next/data/{BUILD}/vi{path}.json'))
        state = data['pageProps']['initialReduxState']
    except (urllib.error.HTTPError, KeyError, json.JSONDecodeError):
        html = request(BASE + path).decode('utf-8')
        match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
        if not match: raise ValueError('Public page did not contain NEXT_DATA')
        state = json.loads(match[1])['props']['pageProps']['initialReduxState']
    # Store catalog responses only; discard checkout, reviews and unrelated state.
    data = [q['data'] for q in state.get('productsApi', {}).get('queries', {}).values() if q.get('data')]
    save(cache, data)
    return data

def download(url, gallery=False):
    if not url.startswith(CDN): raise ValueError('Unexpected image host')
    key = hashlib.sha256(url.encode()).hexdigest()[:24]
    path = ROOT / 'images' / (key + '.webp')
    rejected = ROOT / 'raw' / ('image-rejected-' + key + '.json')
    if rejected.exists():
        reason = json.loads(rejected.read_text(encoding='utf-8')).get('reason')
        cached = json.loads(rejected.read_text(encoding='utf-8'))
        if not gallery or (reason == 'resolution' and min(cached.get('size', [0])) < 700): return None
    if not path.exists():
        body = request(url, attempts=1, timeout=12)
        with Image.open(io.BytesIO(body)) as img:
            if min(img.size) < (700 if gallery else 800):
                save(rejected, {'url': url, 'reason': 'resolution', 'size': img.size}); return None
            if img.width * img.height > 40000000: return None
            img.convert('RGB').save(path, 'WEBP', quality=90)
    with Image.open(path) as img:
        if min(img.size) < (700 if gallery else 800): return None
        # Conservative packshot filter: clean near-white borders, no sale frames.
        small = img.convert('RGB').resize((100, 100))
        edge = [small.getpixel((x, y)) for y in range(100) for x in range(100) if x < 8 or x > 91 or y < 8 or y > 91]
        white = sum(min(c) > 225 and max(c) - min(c) < 20 for c in edge) / len(edge)
        if white < (0.6 if gallery else 0.85):
            save(rejected, {'url': url, 'reason': 'non-neutral-border', 'score': white}); return None
        return {'sourceUrl': url, 'localPath': 'images/' + path.name, 'width': img.width, 'height': img.height,
                'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'whiteBorderScore': white,
                'perceptualHash': format(sum((1 << i) for i, v in enumerate(img.convert('L').resize((8, 8)).getdata()) if v >= sum(img.convert('L').resize((8, 8)).getdata()) / 64), '016x')}

def eligible(p):
    return (not p.get('isGift') and not p.get('isCombo') and p.get('isActive')
            and float(p.get('minPrice') or 0) > 0 and p.get('variants'))

def main():
    global BUILD
    parser = argparse.ArgumentParser()
    parser.add_argument('--target', type=int, default=350)
    args = parser.parse_args()
    (ROOT / 'images').mkdir(parents=True, exist_ok=True)
    html = request(BASE + '/collections/sua-rua-mat').decode('utf-8')
    match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not match: raise SystemExit('Cannot discover public Next.js page data')
    BUILD = json.loads(match[1])['buildId']
    queues = []
    for slug, name, parent in COLLECTIONS:
        rows = page('/collections/' + slug, ROOT / 'raw' / ('listing-' + slug + '.json'))
        listing = next((r for r in rows if isinstance(r, dict) and isinstance(r.get('data'), list)), {})
        queues.append([(p, {'slug': slug, 'name': name, 'parent': parent}) for p in listing.get('data', []) if eligible(p)])
        print(f'Listing {slug}: {len(queues[-1])}', flush=True)
    candidates, seen = [], set()
    # Round-robin categories to avoid filling the entire catalog with one category.
    for i in range(max(map(len, queues), default=0)):
        for queue in queues:
            if i < len(queue) and queue[i][0]['id'] not in seen:
                seen.add(queue[i][0]['id']); candidates.append(queue[i])
    accepted, errors = [], []
    def collect_one(candidate):
        p, category = candidate
        ready = ROOT / 'raw' / ('ready-' + p['id'] + '.json')
        if ready.exists(): return json.loads(ready.read_text(encoding='utf-8'))
        try:
            path = '/products/' + p['slug']
            rows = page(path, ROOT / 'raw' / ('product-' + p['id'] + '.json'))
            product = next(r for r in rows if isinstance(r, dict) and r.get('id') == p['id'])
            if not eligible(product): return None
            urls = [v.get('thumbnail') for v in product.get('variants', [])[:1]] + [m['url'] for m in sorted(product.get('medias', []), key=lambda x: x.get('priority') or 0) if m.get('type') == 'image'] + [product.get('thumbnail')]
            images = []
            for url in list(dict.fromkeys(u for u in urls if u))[:6]:
                try:
                    result = download(url if url.startswith('https://') else CDN + url)
                    if result: images.append(result)
                except (urllib.error.HTTPError, ValueError, OSError) as e:
                    errors.append({'id': p['id'], 'image': url, 'error': str(e)})
                if len(images) >= 1: break
            if not images:
                errors.append({'id': p['id'], 'error': 'No image >=800px'}); return None
            result = {'source': {'site': 'Beauty Box', 'url': BASE + path, 'externalId': p['id'],
                                        'fetchedAt': datetime.now(timezone.utc).isoformat()},
                             'category': category, 'product': product, 'images': images}
            save(ready, result)
            return result
        except (ValueError, StopIteration, urllib.error.HTTPError, OSError) as e:
            errors.append({'id': p['id'], 'error': str(e)})
            return None
    # Three workers only; bounded batches avoid fetching the full source catalog.
    with ThreadPoolExecutor(max_workers=3) as pool:
        for offset in range(0, len(candidates), 9):
            if len(accepted) >= args.target: break
            for result in pool.map(collect_one, candidates[offset:offset + 9]):
                if result and len(accepted) < args.target:
                    accepted.append(result)
                    save(ROOT / 'collected.json', accepted)
                    print(f'Accepted {len(accepted)}/{args.target}: {result["product"]["slug"]}', flush=True)
    save(ROOT / 'collection-errors.json', errors)
    print(f'Finished: {len(accepted)} products, {sum(len(x["images"]) for x in accepted)} images, {len(errors)} issues')
    if len(accepted) < args.target: raise SystemExit('Not enough qualified products; expand collections before seeding.')

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()

"""Collect public brand avatars, preserving source attribution; no invented logos."""
import hashlib
import io
import json
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'catalog'))
from collect import BASE, CDN, request, save

ROOT = Path(__file__).resolve().parents[2] / '.demo-data'
CATALOG = ROOT.parent / '.catalog-data' / 'catalog.json'

def main():
    (ROOT / 'images').mkdir(parents=True, exist_ok=True)
    brands = {p['brand']['slug']: p['brand'] for p in json.loads(CATALOG.read_text(encoding='utf8'))['products']}
    html = request(BASE + '/collections/cocoon').decode('utf8')
    payload = json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)[1])
    build = payload['buildId']
    aliases = {'the-face-shop': 'thefaceshop', 'su-m37': 'sum37', 'clio': 'clio'}
    def collect(brand):
        slug = aliases.get(brand['slug'], brand['slug'])
        cache = ROOT / 'brand-raw' / (slug + '.json')
        try:
            if cache.exists(): data = json.loads(cache.read_text(encoding='utf8'))
            else:
                payload = json.loads(request(f'{BASE}/_next/data/{build}/vi/collections/{slug}.json'))
                queries = payload['pageProps']['initialReduxState']['productCollectionsApi']['queries']
                data = next((q['data'] for q in queries.values() if isinstance(q.get('data'), dict) and q['data'].get('slug') == slug), {})
                save(cache, data)
            avatar = (data.get('metadata') or {}).get('avatar')
            def asset(raw, kind):
                if not raw: return None
                url = raw if raw.startswith('https://') else CDN + raw
                if not url.startswith(CDN): raise ValueError('Unexpected brand asset host')
                file = ROOT / 'images' / ('brand-' + brand['slug'] + '-' + kind + '.webp')
                if not file.exists():
                    with Image.open(io.BytesIO(request(url, attempts=1, timeout=15))) as image:
                        if min(image.size) < 100: return None
                        if kind == 'banner' and (image.width < 600 or image.width/image.height < 1.4): return None
                        image.convert('RGBA').save(file, 'WEBP', quality=95)
                body = file.read_bytes()
                return {'sourceImageUrl': url, 'localPath': 'images/' + file.name,
                        'sha256': hashlib.sha256(body).hexdigest(), 'contentType': 'image/webp'}
            logo = asset(avatar, 'logo')
            # Collection thumbnails are lifestyle banners, not logos.
            banner = asset(data.get('thumbnail'), 'banner')
            return {'slug': brand['slug'], 'status': 'COLLECTED' if logo or banner else 'NO_PUBLIC_ASSET',
                    'sourceUrl': BASE + '/collections/' + slug, 'logo': logo, 'banner': banner}
        except (OSError, ValueError, KeyError, StopIteration) as error:
            return {'slug': brand['slug'], 'status': 'UNAVAILABLE', 'reason': str(error)}
    result = []
    with ThreadPoolExecutor(max_workers=3) as pool:
        for brand in pool.map(collect, brands.values()):
            result.append(brand)
            save(ROOT / 'brands.json', result)
            print(f'Brand {len(result)}/{len(brands)}: {brand["slug"]} {brand["status"]}', flush=True)

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf8')
    main()

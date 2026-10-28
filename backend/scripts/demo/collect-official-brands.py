"""Read curated public brand sites once; cache evidence, never bypass a challenge."""
import concurrent.futures
import gzip
import hashlib
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / '.demo-data'
SOURCES = json.loads(Path(__file__).with_name('brand-sources.json').read_text(encoding='utf8'))
CATALOG = json.loads((ROOT.parent / '.catalog-data/catalog.json').read_text(encoding='utf8'))
BRANDS = {p['brand']['slug']: p['brand'] for p in CATALOG['products']}

class Document(HTMLParser):
    def __init__(self):
        super().__init__(); self.images = []; self.titles = []; self.in_title = False
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'title': self.in_title = True
        if tag == 'meta' and a.get('property') in ('og:title', 'og:site_name'): self.titles.append(a.get('content', ''))
        if tag == 'img': self.images.append(a)
    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
    def handle_data(self, text):
        if self.in_title: self.titles.append(text)

def request(url):
    time.sleep(.6)
    req = urllib.request.Request(url, headers={'User-Agent': 'GlowUp-CatalogResearch/1.0', 'Accept-Encoding': 'gzip'})
    with urllib.request.urlopen(req, timeout=18) as response:
        body = response.read(5_000_000)
        if response.headers.get('Content-Encoding') == 'gzip': body = gzip.decompress(body)
        return body, response.geturl(), response.headers.get('Content-Type', '')

def collect(item):
    slug, brand = item; source = SOURCES.get(slug)
    result = {'slug': slug, 'name': brand['name'], 'sourceUrl': source, 'checkedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
    if not source: return {**result, 'status': 'NO_CONFIRMED_OFFICIAL_SITE'}
    cache = ROOT / 'official-raw' / (slug + '.json')
    if cache.exists():
        previous = json.loads(cache.read_text(encoding='utf8'))
        if previous.get('sourceUrl') == source: return previous
    try:
        body, final, mime = request(source)
        html = body.decode('utf8', errors='replace')
        if not final.startswith('https://') or re.search(r'/challenge|/error\.html|ww\d+\.', final):
            raise ValueError('Unexpected redirect, challenge or error page; skipped')
        if re.search(r'just a moment|checking your browser|domain (?:is )?for sale|sedoparking|enable javascript and cookies to continue', html[:20000], re.I):
            raise ValueError('Challenge or parked domain; skipped')
        doc = Document(); doc.feed(html)
        raw = ROOT / 'official-raw' / (slug + '.html'); raw.write_text(html, encoding='utf8')
        result.update(status='FETCHED_REQUIRES_REVIEW', finalUrl=final, title=' | '.join(doc.titles)[:500], htmlPath=str(raw.relative_to(ROOT)).replace('\\', '/'))
        candidates = []
        # Parent-company or multi-brand page logos are not individual brand logos.
        if slug not in ['goodal', 'dermatory', 'peripera', 'clio', 'fmgt', 'b-by-banila', 'lipit', 'browit', 'cathy-doll', 'biaifekt', 'nara']:
            for img in doc.images:
                label = ' '.join(str(img.get(k, '')) for k in ('alt', 'class', 'id', 'src', 'data-src'))
                url = img.get('src') or img.get('data-src') or ''
                if url.startswith('data:'): url = img.get('data-src', '')
                if not url or not re.search(r'logo', label, re.I): continue
                if re.search(r'visa|mastercard|paypal|payment|apple.pay|shopee|lazada|tiktok|facebook|instagram|google|trustpilot|certif|bct|bo-cong|dmca|beiersdorf|fnco|cafe24\.svg', label, re.I): continue
                url = urllib.parse.urljoin(final, url)
                if not url.startswith('https://') or url in candidates: continue
                candidates.append(url)
            if candidates:
                for url in candidates[:2]:
                    try:
                        image, image_url, content_type = request(url)
                        if 'image' not in content_type and not image.lstrip().startswith(b'<svg'): continue
                        ext = '.svg' if 'svg' in content_type or image.lstrip().startswith(b'<svg') else '.img'
                        filename = 'official-logo-' + slug + '-' + hashlib.sha256(image).hexdigest()[:12] + ext
                        (ROOT / 'official-assets' / filename).write_bytes(image)
                        result['logoCandidate'] = {'sourceImageUrl': image_url, 'rawPath': 'official-assets/' + filename}
                        break
                    except (OSError, ValueError): pass
        result['logoCandidates'] = candidates[:4]
    except (OSError, ValueError) as error:
        result.update(status='UNAVAILABLE', reason=str(error))
    cache.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf8')
    return result

def main():
    for directory in ['official-raw', 'official-assets']: (ROOT / directory).mkdir(parents=True, exist_ok=True)
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for result in pool.map(collect, BRANDS.items()):
            results.append(result)
            (ROOT / 'official-brands.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf8')
            print(f'{len(results)}/{len(BRANDS)} {result["slug"]}: {result["status"]}', flush=True)

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf8'); main()

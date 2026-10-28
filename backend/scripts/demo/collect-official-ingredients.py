"""Collect public product-family ingredient panels, with exact English-title matches."""
import concurrent.futures
import html
import json
import re
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'catalog'))
from collect import request, save
ROOT = Path(__file__).resolve().parents[2] / '.demo-data'

def normal(text):
    return re.sub(r'[^a-z0-9]+', ' ', unicodedata.normalize('NFD', html.unescape(text)).encode('ascii', 'ignore').decode().lower()).strip()

def main():
    cache = ROOT / 'official-products'; cache.mkdir(exist_ok=True)
    listing = cache / 'clubclio-listing.json'
    if not listing.exists(): save(listing, json.loads(request('https://clubclio.shop/products.json?limit=250')))
    products = json.loads(listing.read_text(encoding='utf8'))['products']
    catalog = json.loads((ROOT.parent / '.catalog-data/catalog.json').read_text(encoding='utf8'))['products']
    matched = []
    for product in catalog:
        if product['brand']['slug'] not in ['clio', 'peripera', 'goodal', 'dermatory']: continue
        title = ' ' + normal(product['name']) + ' '
        candidates = []
        for official in products:
            name = re.sub(r'^\[[^]]+\]\s*', '', official['title'])
            core = normal(name)
            if len(core.split()) < 3 or ' ' + core + ' ' not in title: continue
            if (' original ' in title) != (' original ' in ' ' + core + ' '): continue
            brand = product['brand']['slug']
            if brand not in normal(official['title']) and brand not in official['handle']: continue
            candidates.append((len(core), official))
        if not candidates: continue
        official = max(candidates, key=lambda pair: pair[0])[1]
        matched.append((product, official))
    def collect(pair):
        product, official = pair
        file = cache / (official['handle'] + '-ingredients.json')
        url = 'https://clubclio.shop/products/' + official['handle']
        if file.exists(): data = json.loads(file.read_text(encoding='utf8'))
        else:
            page = request(url, attempts=1).decode('utf8', errors='replace')
            match = re.search(r'Key ingredients.*?<div class="accordion_body"[^>]*>(.*?)</div>', page, re.S | re.I)
            data = {'sourceUrl': url, 'officialTitle': official['title'], 'ingredientHtml': match.group(1).strip() if match else '', 'scope': 'PUBLIC_PRODUCT_FAMILY_PANEL', 'fullFormulaGuaranteed': False}
            save(file, data)
        return {'productId': product['id'], 'productName': product['name'], **data}
    results = []
    # Same handle may match multiple editions; fetch once to keep source load low.
    unique = {}; aliases = {}
    for pair in matched:
        handle = pair[1]['handle']; unique.setdefault(handle, pair); aliases.setdefault(handle, []).append(pair[0])
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for row in pool.map(collect, unique.values()):
            handle = row['sourceUrl'].rsplit('/', 1)[1]
            for product in aliases[handle]: results.append({**row, 'productId': product['id'], 'productName': product['name']})
            save(ROOT / 'official-ingredients.json', results)
            print(f'Ingredient panel {len(results)}/{len(matched)}: {row["officialTitle"]}', flush=True)

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf8'); main()

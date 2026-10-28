"""Reviewed replacements for logo candidates found on their original brand page."""
import hashlib
import json
import re
import sys
import urllib.parse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parents[1] / 'catalog'))
from collect import request, save
ROOT = Path(__file__).parents[2] / '.demo-data'
rows = json.loads((ROOT / 'official-brands.json').read_text(encoding='utf8'))
by_slug = {r['slug']: r for r in rows}

def set_logo(slug, body, source):
    filename = 'reviewed-logo-' + slug + '-' + hashlib.sha256(body).hexdigest()[:12] + ('.svg' if b'<svg' in body[:1000] else '.img')
    (ROOT / 'official-assets' / filename).write_bytes(body)
    by_slug[slug]['logoCandidate'] = {'sourceImageUrl': source, 'rawPath': 'official-assets/' + filename}

for slug, needle in [('eucerin', 'uk-logo'), ('byphasse', 'header-logo')]:
    row = by_slug[slug]; page = (ROOT / row['htmlPath']).read_text(encoding='utf8')
    link = re.search(r'<a[^>]*class="[^"]*' + needle + r'[^>]*>(.*?)</a>', page, re.S)
    svg = re.search(r'<svg\b[^>]*>.*?</svg>', link.group(1), re.S) if link else None
    if svg: set_logo(slug, svg.group(0).encode(), row['sourceUrl'] + '#header-logo')

for slug, select in [('vacosi', 1), ('momo-s-workshop', 1), ('banila-co', 0)]:
    row = by_slug[slug]; url = row['logoCandidates'][select]
    try: set_logo(slug, request(url, attempts=1), url)
    except (OSError, ValueError): pass

for slug in ['l-oreal', 'maybelline']:
    row = by_slug[slug]; page = (ROOT / row['htmlPath']).read_text(encoding='utf8')
    if slug == 'l-oreal': url = re.search(r'<header-logo logo="([^"]+)', page).group(1)
    else: url = row['logoCandidates'][0]
    url = urllib.parse.urljoin(row['sourceUrl'], url)
    try: set_logo(slug, request(url, attempts=1), url)
    except (OSError, ValueError): pass

# Never use the parent-company logo as an individual brand logo.
for slug in ['ohui', 'beyond']: by_slug[slug].pop('logoCandidate', None)
save(ROOT / 'official-brands.json', rows)
print('Reviewed logo replacements saved')

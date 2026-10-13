"""Preserve PDF text and use typography to distinguish promises from numbered prose."""
import hashlib
import json
import re
from collections import Counter
from pathlib import Path
from pypdf import PdfReader

ROOT = Path('data/mandate/evidence/territorial/cantabria')


def extract():
    meta = json.loads((ROOT/'programme.meta.json').read_text(encoding='utf-8'))
    for name, key in [('programme.pdf', 'sha256'), ('programme.pages.json', 'extractionSha256')]:
        if hashlib.sha256((ROOT/name).read_bytes()).hexdigest() != meta[key]:
            raise ValueError('Changed source: '+name)
    reader = PdfReader(ROOT/'programme.pdf')
    raw = json.loads((ROOT/'programme.pages.json').read_text(encoding='utf-8'))
    if len(reader.pages) != 202 or len(raw) != 202:
        raise ValueError('Expected 202 pages')
    pages = []
    for number in range(7, 202):
        spans = []
        def visitor(text, cm, tm, font, size):
            # Exclude repeated FormXObject headers/footers; verify every remaining character below.
            if text.strip() and font and 60 < tm[5] < 780:
                spans.append(dict(x=round(tm[4], 2), y=round(tm[5], 2), size=round(tm[0], 2),
                    font=str(font.get('/BaseFont')), text=text))
        reader.pages[number-1].extract_text(visitor_text=visitor)
        body = raw[number-1]['text']
        body = re.sub(r'Economía, Buen Gobierno y Servicio a las Personas\s+\d+', '', body)
        body = re.sub(r'#PresidentaBuruaga\s*', '', body)
        body = re.sub(r'\d+ Programa Electoral Autonómico 2023-2027', '', body)
        chars = lambda s: Counter(''.join(s.replace('\x02', '-').split()))
        if chars(body) != chars(''.join(s['text'] for s in spans)):
            raise ValueError(f'Character mismatch on page {number}')
        # Content-stream order preserves adjacent bold/regular runs and paragraph boundaries.
        pages.append(dict(page=number, spans=spans))
    if sum(s['size'] == 8.5 for p in pages for s in p['spans']) != 1228:
        raise ValueError('Expected 1228 typographic promise markers')
    return pages


if __name__ == '__main__':
    data = (json.dumps(extract(), ensure_ascii=False, indent=2)+'\n').encode('utf-8')
    target = ROOT/'programme.ordered.json'
    if target.exists() and target.read_bytes() != data:
        raise ValueError('Changed extraction; inspect before replacing')
    target.write_bytes(data)
    print('Cantabria: 1228 markers; every body character reconciled with PDFium')

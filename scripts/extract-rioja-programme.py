"""Order two-column programme text without losing characters or page provenance."""
import hashlib
import json
from collections import Counter
from pathlib import Path
from pypdf import PdfReader

ROOT = Path('data/mandate/evidence/territorial/rioja')
OPENINGS = [21, 27, 41, 47, 61, 73, 89, 105, 117, 125, 145, 153, 159, 165]
SKIP = {p+d for p in OPENINGS for d in [-1, 0, 1]}


def extract():
    meta = json.loads((ROOT/'programme.meta.json').read_text(encoding='utf-8'))
    if hashlib.sha256((ROOT/'programme.pdf').read_bytes()).hexdigest() != meta['sha256']:
        raise ValueError('Changed programme PDF')
    raw_bytes = (ROOT/'programme.pages.json').read_bytes()
    if hashlib.sha256(raw_bytes).hexdigest() != meta['extractionSha256']:
        raise ValueError('Changed full-page extraction')
    raw = json.loads(raw_bytes)
    reader = PdfReader(ROOT/'programme.pdf')
    if len(reader.pages) != 172:
        raise ValueError('Expected 172 pages')
    pages = []
    for number in range(23, 172):
        if number in SKIP:
            continue
        spans = []
        def visitor(text, cm, tm, font, size):
            if text.strip():
                spans.append(dict(x=round(tm[4], 3), y=round(tm[5], 3), text=text.strip(), font=str((font or {}).get('/BaseFont'))))
        reader.pages[number-1].extract_text(visitor_text=visitor)
        # PDFium maps nineteen hyphens to U+0002; retain its raw extraction too.
        chars = lambda text: Counter(''.join(text.replace('\x02', '-').split()))
        if chars(''.join(s['text'] for s in spans)) != chars(raw[number-1]['text']):
            raise ValueError(f'Character mismatch on page {number}')
        body = []
        marginal = []
        for span in spans:
            if 50 <= span['x'] < 520:
                body.append(span)
            else:
                marginal.append(span)
        if len(marginal) != 1 or marginal[0]['text'] != str(number-12):
            raise ValueError(f'Unexpected marginal content on page {number}')
        # Wide introductions start at the left margin above both body columns.
        quotes = sorted([s for s in body if 'Halbfett' in s['font']], key=lambda s: -s['y'])
        body = [s for s in body if 'Halbfett' not in s['font']]
        body.sort(key=lambda s: (s['x'] >= 280, -round(s['y'], 1), s['x']))
        pages.append(dict(page=number, spans=body, quotes=quotes))
    if sum(s['text'].count('•') for p in pages for s in p['spans']) != 949:
        raise ValueError('Expected 949 body bullets')
    return pages


if __name__ == '__main__':
    result = (json.dumps(extract(), ensure_ascii=False, indent=2)+'\n').encode('utf-8')
    target = ROOT/'programme.ordered.json'
    if target.exists() and target.read_bytes() != result:
        raise ValueError('Changed ordered extraction; inspect before replacing')
    target.write_bytes(result)
    print('La Rioja: 949 bullets, full character conservation in body pages')

"""Order the saved Windows OCR by geometry; preserve the uncorrected OCR separately.

Render programme.pdf at scale 2 with PDFium, then run ocr-aragon-programme.ps1.
This preparation tool requires Pillow; the importer/CI only uses the standard library.
No OCR confidence or independent human verification is inferred from this process.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path('data/mandate/evidence/territorial/aragon')
CHAPTER_LINES = {4: [2, 3], 8: [1], 11: [1], 14: [2, 3], 18: [2, 3],
    23: [2, 3, 4], 24: [2, 3], 26: [22], 29: [2, 17], 32: [3],
    35: [7], 37: [14], 38: [12]}


def extract():
    pages = json.loads((ROOT/'programme.ocr.json').read_text(encoding='utf-8'))
    result = []
    for page in pages:
        number = page['page']
        im = Image.open(f'.artifacts/aragon-pages/page-{number:02}.png').convert('RGB')
        active = [y for y in range(160, 1560)
            if sum(max(im.getpixel((x, y))) < 130 for x in range(160, 191)) >= 5]
        groups = []
        for y in active:
            if not groups or y > groups[-1][-1]+1:
                groups.append([])
            groups[-1].append(y)
        markers = set()
        if 4 <= number <= 38:
            for group in groups:
                if not 4 <= len(group) <= 18:
                    continue
                center = sum(group)/len(group)
                candidates = [(i, l) for i, l in enumerate(page['lines']) if len(l['text']) > 8
                    and abs(min(w['y'] for w in l['words'])-center) < 22]
                if candidates:
                    markers.add(min(candidates, key=lambda v: abs(min(w['y'] for w in v[1]['words'])-center))[0])
        lines = []
        for i, line in enumerate(page['lines']):
            x = min(w['x'] for w in line['words'])
            y = min(w['y'] for w in line['words'])
            kind = ('decoration' if y < 140 or y > 1580 else
                'heading' if i in CHAPTER_LINES.get(number, []) else
                'marker' if i in markers else 'body')
            lines.append(dict(index=i, text=line['text'], x=x, y=y, kind=kind))
        result.append(dict(page=number, lines=lines))
    if sum(l['kind'] == 'marker' for p in result for l in p['lines']) != 117:
        raise ValueError('Physical bullet count changed: review the scan')
    output = ROOT/'programme.ordered.json'
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    meta_path = ROOT/'programme.meta.json'
    meta = json.loads(meta_path.read_text(encoding='utf-8'))
    meta.update(ocrSha256=hashlib.sha256((ROOT/'programme.ocr.json').read_bytes()).hexdigest(),
        orderedSha256=hashlib.sha256(output.read_bytes()).hexdigest(),
        ocrEngine='Windows.Media.Ocr · es-ES · PDFium scale 2',
        transcriptionStatus='OCR con correcciones puntuales; cotejo íntegro independiente pendiente')
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print('Aragón: 39 scanned pages, 117 physical top-level bullets')


if __name__ == '__main__': extract()

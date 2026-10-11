"""Classify the preserved OCR by geometry; never silently repair source numbering."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/cyl')
HEADINGS = {4: [12, 13], 7: [18], 12: [4, 20], 15: [14], 22: [6, 24],
    24: [4], 29: [21], 33: [11], 34: [19], 37: [12], 39: [22], 44: [5],
    47: [22], 49: [7], 54: [26, 27], 58: [21], 60: [9], 61: [8]}
CORRECTIONS = {(38, 23): ('1.8', '11.8'), (44, 20): ('3.5', '13.5')}
CHAPTER_COUNTS = [12, 7, 3, 11, 4, 7, 31, 21, 7, 10, 12, 17, 20, 2, 22, 15, 12, 5, 2]


def classify(pages):
    if [p['page'] for p in pages] != list(range(1, 63)):
        raise ValueError('Missing or reordered OCR page')
    result = []
    for page in pages:
        n = page['page']; lines = []
        for i, line in enumerate(page['lines']):
            x = min(w['x'] for w in line['words']); y = min(w['y'] for w in line['words'])
            text = line['text']
            kind = 'decoration' if y < 130 or y >= 1180 else 'body'
            if kind == 'body' and i in HEADINGS.get(n, []): kind = 'heading'
            match = re.match(r'^(\d+\.\d+)\s', text)
            number = match[1] if match and 120 < x < 152 and 4 <= n <= 61 else None
            if (n, i) in CORRECTIONS:
                before, number = CORRECTIONS[n, i]
                if not text.startswith(before + ' '): raise ValueError('Changed corrected OCR line')
            if number is not None: kind = 'marker'
            lines.append(dict(index=i, text=text, x=x, y=y, kind=kind,
                **({'officialId': number} if number else {})))
        result.append(dict(page=n, lines=lines))
    actual = [line['officialId'] for p in result for line in sorted(p['lines'], key=lambda l: (l['y'], l['x'])) if line['kind'] == 'marker']
    expected = [f'{c}.{n}' for c, total in enumerate(CHAPTER_COUNTS, 1) for n in range(1, total + 1)]
    if actual != expected: raise ValueError('Missing, duplicate or reordered numbered section')
    return result


def extract():
    pages = json.loads((ROOT/'programme.ocr.json').read_text(encoding='utf-8'))
    result = classify(pages)
    path = ROOT/'programme.ordered.json'
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    mp = ROOT/'programme.meta.json'; meta = json.loads(mp.read_text(encoding='utf-8'))
    meta.update(ocrSha256=hashlib.sha256((ROOT/'programme.ocr.json').read_bytes()).hexdigest(),
        orderedSha256=hashlib.sha256(path.read_bytes()).hexdigest(),
        ocrEngine='Windows.Media.Ocr · es-ES · PDFium scale 1.5',
        transcriptionStatus='OCR provisional; correcciones de numeración y pasajes usados cotejados; revisión íntegra independiente pendiente')
    mp.write_text(json.dumps(meta, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print('Castilla y León: 62 páginas, 220 apartados principales')


if __name__ == '__main__': extract()

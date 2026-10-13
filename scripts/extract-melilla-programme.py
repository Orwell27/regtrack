"""Reproduce the left/right spread extraction using PDFium, without losing characters."""
import hashlib
import json
from collections import Counter
from pathlib import Path
import pypdfium2 as pdfium


def order_lines(textpage, text, left, right, bottom, top):
    """Resolve every extracted line to one physical start; reject ambiguity."""
    positioned, used = [], set()
    for line in text.splitlines():
        if not line.strip():
            continue
        prefix = line.split('\x02')[0].strip()
        search = textpage.search(prefix, match_case=True)
        matches = []
        while (match := search.get_next()) is not None:
            index, _ = match
            x0, y0, _, y1 = textpage.get_charbox(index, loose=True)
            previous = index-1
            while previous >= 0 and pdfium.raw.FPDFText_GetUnicode(textpage, previous) == 32:
                previous -= 1
            starts_line = previous < 0 or pdfium.raw.FPDFText_GetUnicode(textpage, previous) in (10, 13)
            if previous >= 0:
                px, py, _, py1 = textpage.get_charbox(previous, loose=True)
                starts_line = starts_line or x0 < px or abs((py+py1-y0-y1)/2) > 3
            if starts_line and index not in used and left <= x0 < right and bottom < (y0+y1)/2 < top:
                matches.append((index, (y0+y1)/2))
        search.close()
        if len(matches) != 1:
            raise ValueError(f'Ambiguous physical line: {line!r}')
        index, y = matches[0]
        used.add(index)
        positioned.append((y, line))
    return '\r\n'.join(line for _, line in sorted(positioned, key=lambda item: -item[0]))


root = Path('data/mandate/evidence/territorial/melilla')
meta = json.loads((root/'programme.meta.json').read_text(encoding='utf-8'))
digest = hashlib.sha256((root/'programme.pdf').read_bytes()).hexdigest()
if digest != meta['sha256']: raise ValueError('Changed original programme')
pdf = pdfium.PdfDocument(root/'programme.pdf')
pages = []
for n, page in enumerate(pdf, 1):
    textpage = page.get_textpage()
    width, height = page.get_size()
    whole = textpage.get_text_bounded(left=0, bottom=50, right=width, top=height-95)
    halves = [textpage.get_text_bounded(left=left, bottom=50, right=right, top=height-95)
              for left, right in [(0, width/2), (width/2, width)]] if width > 1000 else [whole]
    chars = lambda text: Counter(c for c in text if not c.isspace())
    if chars(whole) != chars(''.join(halves)): raise ValueError('Spread split loses or duplicates characters')
    if 9 <= n <= 125:
        # Large chapter numbers overlap their decorative titles; retain that half.
        chapter_starts = {9, 11, 17, 24, 28, 33, 39, 50, 56, 68, 76, 83, 89, 101, 113, 117, 119, 121}
        ordered = [half if side == 0 and n in chapter_starts else
                   order_lines(textpage, half, side*width/2, (side+1)*width/2, 50, height-95)
                   for side, half in enumerate(halves)]
        if chars(''.join(ordered)) != chars(''.join(halves)):
            raise ValueError('Physical reading order loses or duplicates characters')
        halves = ordered
    pages.append(dict(page=n, text=textpage.get_text_range(), halves=halves))
    textpage.close()
    page.close()
data = (json.dumps(dict(sourceSha256=digest, pages=pages), ensure_ascii=False, indent=2)+'\n').encode('utf-8')
if hashlib.sha256(data).hexdigest() != meta['extractionSha256']: raise ValueError('Changed extraction; inspect before replacing')
(root/'programme.columns.json').write_bytes(data)
print('127 PDF pages reproduced with left/right spread checks')

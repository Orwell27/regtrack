"""Reproduce the uncorrected, full-page PDF extraction using pypdfium2."""
import hashlib
import json
from pathlib import Path
import pypdfium2 as pdfium

ROOT = Path('data/mandate/evidence/territorial/asturias')
meta = json.loads((ROOT/'preagreement.meta.json').read_text(encoding='utf-8'))
data = (ROOT/'preagreement.pdf').read_bytes()
if hashlib.sha256(data).hexdigest() != meta['sha256']:
    raise ValueError('Changed source PDF')
document = pdfium.PdfDocument(data)
pages = []
for index in range(len(document)):
    page = document[index]
    textpage = page.get_textpage()
    pages.append(dict(page=index+1, text=textpage.get_text_bounded()))
    textpage.close()
    page.close()
document.close()
output = (json.dumps(pages, ensure_ascii=False, indent=2)+'\n').encode('utf-8')
if hashlib.sha256(output).hexdigest() != meta['extractionSha256']:
    raise ValueError('Changed extraction; inspect before replacing')
(ROOT/'preagreement.pages.json').write_bytes(output)
print('Asturias: fourteen uncorrected pages reproduced')

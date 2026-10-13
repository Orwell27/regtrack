"""Rebuild the coordinate extraction from the original PDF (requires pypdf)."""
import hashlib
import json
from importlib.metadata import version
from pathlib import Path
from pypdf import PdfReader

ROOT = Path('data/mandate/evidence/territorial/bilbao')
metadata = json.loads((ROOT/'programme.meta.json').read_text(encoding='utf-8'))
data = (ROOT/'programme.pdf').read_bytes()
if hashlib.sha256(data).hexdigest() != metadata['sha256']: raise ValueError('Changed original')
pages = []
for number,page in enumerate(PdfReader(ROOT/'programme.pdf').pages,1):
    spans = []
    def visit(text,cm,tm,font,size):
        if text.strip() and tm[4] > 0 and tm[5] > 0:
            spans.append(dict(x=round(tm[4],2), y=round(tm[5],2), text=text.strip()))
    page.extract_text(visitor_text=visit)
    pages.append(dict(page=number, text=page.extract_text(), spans=spans))
result = dict(sourceSha256=metadata['sha256'], extractor='pypdf '+version('pypdf'), pages=pages)
output = (json.dumps(result,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
if metadata.get('extractionSha256') and hashlib.sha256(output).hexdigest() != metadata['extractionSha256']:
    raise ValueError('Extraction changed; inspect before replacing the approved extraction')
(ROOT/'programme.pages.json').write_bytes(output)
print('47 programme pages extracted with coordinates')

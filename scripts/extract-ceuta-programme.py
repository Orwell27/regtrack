"""Reproduce the preserved initial programme extraction; requires pypdf."""
import hashlib
import json
from pathlib import Path
from pypdf import PdfReader

ROOT = Path('data/mandate/evidence/territorial/ceuta')
meta = json.loads((ROOT/'programme.meta.json').read_text(encoding='utf-8'))
original = (ROOT/'programme.pdf').read_bytes()
if hashlib.sha256(original).hexdigest() != meta['sha256']:
    raise ValueError('Changed original programme')
pages = [dict(page=n, text=p.extract_text()) for n, p in enumerate(PdfReader(ROOT/'programme.pdf').pages, 1)]
output = (json.dumps(pages, ensure_ascii=False, indent=2)+'\n').encode('utf-8')
if hashlib.sha256(output).hexdigest() != meta['extractionSha256']:
    raise ValueError('Changed extraction; inspect before replacing')
(ROOT/'programme.pages.json').write_bytes(output)
print('29 programme pages reproduced')

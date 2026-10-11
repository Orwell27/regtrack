"""Reproduce the archived column extraction; requires pypdfium2."""
import json,re,hashlib
from collections import Counter
from pathlib import Path
import pypdfium2 as pdfium
root=Path('data/mandate/evidence/territorial/canarias')
metadata=json.loads((root/'strategy.meta.json').read_text(encoding='utf-8'))
if hashlib.sha256((root/'strategy.pdf').read_bytes()).hexdigest()!=metadata['sha256']:raise ValueError('Changed original plan')
pdf=pdfium.PdfDocument(str(root/'strategy.pdf'))
pages=[]
for number,page in enumerate(pdf,1):
    textpage=page.get_textpage();text=textpage.get_text_range()
    record=dict(page=number,text=text)
    header=re.search(r'Objetivos estratégicos',text)
    right=re.search(r'\b[A-Z]{1,8}\.\s*OEsp\.',text)
    if header:
        if not right:raise ValueError('Table without specifics '+str(number))
        split=textpage.get_charbox(right.start())[0]-3
        top=textpage.get_charbox(header.start())[1]-2
        record.update(split=split,top=top,
            strategic=textpage.get_text_bounded(left=80,bottom=55,right=split,top=top),
            specific=textpage.get_text_bounded(left=split,bottom=55,right=540,top=top))
        body=textpage.get_text_bounded(left=80,bottom=55,right=540,top=top)
        chars=lambda text: Counter(character for character in text if not character.isspace())
        if chars(body)!=chars(record['strategic']+record['specific']):
            raise ValueError('Column split lost or duplicated characters on page '+str(number))
    pages.append(record)
result=dict(sourceSha256=hashlib.sha256((root/'strategy.pdf').read_bytes()).hexdigest(),pages=pages)
output=(json.dumps(result,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
if hashlib.sha256(output).hexdigest()!=metadata['extractionSha256']:raise ValueError('Changed extraction; inspect before replacing')
(root/'strategy.columns.json').write_bytes(output)
print('63 pages and 54 tables reproduced')

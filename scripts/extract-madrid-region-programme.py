"""Manual layout extraction. The PDF contains two printed pages per PDF page."""
from pathlib import Path
import json,hashlib
import pdfplumber

ROOT=Path('data/mandate/evidence/territorial/madrid-region')
result=[]
with pdfplumber.open(ROOT/'programme.pdf') as doc:
    for n,page in enumerate(doc.pages,1):
        lines=[]
        for column in range(2):
            half=page.crop((column*page.width/2,0,(column+1)*page.width/2,610))
            for line in half.extract_text_lines(return_chars=True):
                sizes=sorted(set(round(c['size'],2) for c in line['chars']))
                lines.append(dict(text=line['text'],sizes=sizes,column=column,x=round(line['x0'],2),y=round(line['top'],2)))
        result.append(dict(page=n,lines=lines))
path=ROOT/'programme.ordered.json'
path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
meta_path=ROOT/'programme.meta.json'
meta=json.loads(meta_path.read_text(encoding='utf-8'))
meta['orderedSha256']=hashlib.sha256(path.read_bytes()).hexdigest()
meta_path.write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print('Extracted',len(result),'PDF spreads, preserving columns, coordinates and font sizes')

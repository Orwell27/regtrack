"""Manual PDF layout extraction; the importer itself needs only the standard library."""
from pathlib import Path
import json,hashlib
import pdfplumber
ROOT=Path('data/mandate/evidence/territorial/clm')
result=[]
with pdfplumber.open(ROOT/'programme.pdf') as doc:
    for n,page in enumerate(doc.pages,1):
        lines=[]
        for column in range(2):
            half=page.crop((column*page.width/2,110,(column+1)*page.width/2,790))
            for line in half.extract_text_lines(return_chars=True):
                lines.append(dict(text=line['text'],sizes=sorted(set(round(c['size'],2) for c in line['chars'])),column=column,x=round(line['x0'],2),y=round(line['top'],2)))
        links=[dict(url=a['uri'],x=a['x0'],right=a['x1'],top=a['top'],bottom=a['bottom']) for a in page.hyperlinks if a.get('uri')]
        result.append(dict(page=n,lines=lines,links=links))
out=ROOT/'programme.ordered.json'
out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
meta_path=ROOT/'programme.meta.json';meta=json.loads(meta_path.read_text(encoding='utf-8'))
meta['orderedSha256']=hashlib.sha256(out.read_bytes()).hexdigest()
meta_path.write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print('Extracted',len(result),'spreads')

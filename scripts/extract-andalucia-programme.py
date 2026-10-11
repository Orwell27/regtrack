"""Keep raw OCR and classify its coordinates, without claiming a validated transcription."""
import hashlib,json,re
from pathlib import Path
ROOT=Path('data/mandate/evidence/territorial/andalucia')
HEADINGS={5:[3,5,6,16],8:[3,4],13:[3,4],20:[1],21:[1],27:[3,4],28:[1],32:[3,4],33:[1],43:[1],53:[1],56:[1],58:[1],59:[1]}

def extract():
    pages=json.loads((ROOT/'programme.ocr.json').read_text(encoding='utf-8'));result=[];numbers=[]
    for page in pages:
        n=page['page'];lines=[]
        for i,l in enumerate(page['lines']):
            x=min(w['x'] for w in l['words']);y=min(w['y'] for w in l['words']);text=l['text']
            kind='decoration' if y<220 or y>1580 else 'heading' if i in HEADINGS.get(n,[]) else 'body'
            match=re.match(r'^(\d+)\s*\.',text)
            ordinal=int(match[1]) if match and 200<=x<=220 and 5<=n<=59 else None
            # Only these visually checked coordinates confuse 1/11 with Roman I/II.
            if (n,i)==(5,4):ordinal=1
            if (n,i)==(7,8):ordinal=11
            if ordinal is not None:
                kind='marker';numbers.append(ordinal)
            lines.append(dict(index=i,text=text,x=x,y=y,kind=kind,**({'ordinal':ordinal} if ordinal is not None else {})))
        result.append(dict(page=n,lines=lines))
    if sorted(numbers)!=list(range(1,151)):raise ValueError('Numbering differs: '+str(numbers))
    path=ROOT/'programme.ordered.json';path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    mp=ROOT/'programme.meta.json';meta=json.loads(mp.read_text(encoding='utf-8'))
    meta.update(ocrSha256=hashlib.sha256((ROOT/'programme.ocr.json').read_bytes()).hexdigest(),orderedSha256=hashlib.sha256(path.read_bytes()).hexdigest(),ocrEngine='Windows.Media.Ocr · es-ES · PDFium scale 2',transcriptionStatus='OCR provisional; cotejo íntegro independiente pendiente')
    mp.write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Andalucía: 60 scanned pages, 150 numbered sections')

if __name__=='__main__':extract()

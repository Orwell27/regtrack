"""Extract visible table cells with pypdfium2; run manually, before the stdlib importer.

The original PDF has out-of-page overflow and nonvisual text order. Preserve
coordinates and hashes, and retain transcriptionPending until full visual cotejo.
"""
import json, hashlib, re
from pathlib import Path
from ctypes import c_uint, c_float, byref
import pypdfium2 as p

ROOT=Path('data/mandate/evidence/territorial/galicia')
doc=p.PdfDocument(ROOT/'programme.pdf'); r=p.raw; result=[]
for n,page in enumerate(doc):
    t=page.get_textpage(); regions=[]; rules=[]; outlines=[]
    for obj in page.get_objects():
        if obj.type!=r.FPDF_PAGEOBJ_PATH: continue
        c=[c_uint() for _ in range(4)]; b=[c_float() for _ in range(4)]
        r.FPDFPageObj_GetFillColor(obj,*[byref(x) for x in c])
        r.FPDFPageObj_GetBounds(obj,*[byref(x) for x in b])
        box=[round(x.value,2) for x in b]; color=[x.value for x in c]
        l,bot,right,top=box
        if right-l>400 and top-bot<10:
            rules.append((bot+top)/2)
            if abs(top-bot-4)<0.1: outlines.append((bot+top)/2)
        if 50<l<100 and 530<right<540 and top-bot>20 and color[3]==255 and color[:3]!=[255,255,255]:
            regions.append(box)
    cells=[]
    for l,bot,right,top in regions:
        cuts=sorted(set([bot,top]+[v for v in rules if bot+5<v<top-5]),reverse=True)
        for hi,lo in zip(cuts,cuts[1:]):
            number=t.get_text_bounded(57,lo+1,91,hi-1).strip()
            text=t.get_text_bounded(95,lo+1,539,hi-1).strip()
            cells.append(dict(box=[56.69,lo,538.58,hi],number=number,text=text))
    if outlines:
        cuts=sorted(set(outlines),reverse=True)
        for hi,lo in zip(cuts,cuts[1:]):
            number=t.get_text_bounded(57,lo+1,91,hi-1).strip()
            text=t.get_text_bounded(95,lo+1,539,hi-1).strip()
            cells.append(dict(box=[56.69,lo,538.58,hi],number=number,text=text))
    cells.sort(key=lambda c:-c['box'][3])
    # Context is captured from the visible gaps. Text outside the page is never
    # promoted to a promise: this file contains hidden, duplicated overflow text.
    contexts=[]; top=800
    for cell in cells:
        lo,hi=cell['box'][1],cell['box'][3]
        if top>hi+1:
            text=t.get_text_bounded(50,hi,550,top).strip()
            if text: contexts.append(dict(box=[50,hi,550,top],text=text))
        top=lo
    if top>50:
        text=t.get_text_bounded(50,50,550,top).strip()
        if text: contexts.append(dict(box=[50,50,550,top],text=text))
    result.append(dict(page=n+1,cells=cells,contexts=contexts))
raw=(json.dumps(result,ensure_ascii=False,indent=2)+'\n').encode()
(ROOT/'programme.cells.json').write_bytes(raw)
meta=json.loads((ROOT/'programme.meta.json').read_text())
meta['cellsSha256']=hashlib.sha256(raw).hexdigest()
(ROOT/'programme.meta.json').write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8',newline='\n')
print('Galicia:', len(result), 'pages;', sum(len(page['cells']) for page in result), 'visible cells')

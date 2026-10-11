"""Reproduce the 90 numbered pact points, preserving OCR and organisational context."""
import hashlib,json,re
from pathlib import Path

ROOT=Path('data/mandate/evidence/territorial/castellon')
HEADINGS={(1,32):'Familia',(2,5):'Seguridad',(2,25):'Políticas sociales',
 (3,13):'Vivienda y ocupación',(3,24):'Impuestos y presión fiscal',
 (5,5):'Comercio',(5,21):'Movilidad',(6,9):'Lenguas oficiales y señas de identidad',
 (6,36):'Topónimo de la ciudad',(7,1):'Cultura',(7,27):'Administración local',
 (8,9):'Urbanismo',(8,15):'Turismo, deportes y fiestas',(9,6):'Salud, limpieza, plagas e iluminación'}

def reading_order(lines):
    groups=[]
    for line in sorted(lines,key=lambda l:(l['y'],l['x'])):
        if not groups or line['y']-groups[-1][0]['y']>12:groups.append([])
        groups[-1].append(line)
    return [l for group in groups for l in sorted(group,key=lambda l:l['x'])]

def parse_pages(pages):
    if [p['page'] for p in pages]!=list(range(1,14)):raise ValueError('Missing or reordered scanned page')
    records=[];contexts=[];current=None;chapter='Bases del acuerdo'
    def context(page,topic):
        item=dict(id=f'm-12040-context-{len(contexts)+1}',topic=topic,page=page,endPage=page,fragments=[])
        contexts.append(item);return item
    for p in pages:
        n=p['page'];body=[]
        for i,l in enumerate(p['lines']):
            words=l['words'];x=min(w['x'] for w in words);y=min(w['y'] for w in words)
            if y<160:continue # party logos only; the original OCR remains archived
            body.append(dict(index=i,x=x,y=y,text=l['text']))
        block=None
        for l in reading_order(body):
            key=(n,l['index']);t=l['text']
            if (n==1 and l['index']<32) or n>9 or (n==9 and l['index']>=23):
                if block is None:block=context(n,'Bases, organización y firmas · texto de los autores')
                block['fragments'].append(dict(page=n,**l));current=None;continue
            if key in HEADINGS:
                chapter=HEADINGS[key];block=context(n,chapter+' · epígrafe')
                block['fragments'].append(dict(page=n,**l));current=None;continue
            if key in [(3,25),(7,28)]:
                if block is None:raise ValueError('Orphan heading continuation')
                block['fragments'].append(dict(page=n,**l));continue
            block=None
            marker=re.match(r'^(\d+)\s*-',t)
            # The 7 is visibly printed on PDF p2 but absent from Windows OCR.
            ordinal=7 if key==(2,11) else int(marker[1]) if marker else None
            if ordinal is not None:
                if ordinal!=len(records)+1:raise ValueError('Missing, duplicate or reordered point')
                current=dict(id=f'm-12040-{ordinal}',officialId=str(ordinal),topic=chapter,page=n,endPage=n,sourceId='castellon-programme',fragments=[],sourceNote='Transcripción OCR provisional de copia escaneada. Cotejar la imagen original; las submedidas se conservan dentro del punto numerado.')
                if ordinal==7:current['sourceNote']+=' El número 7, omitido por el OCR, se recupera visualmente de la página 2; el texto bruto se conserva sin modificar.'
                records.append(current)
            if current is None:raise ValueError('Orphan OCR line')
            current['fragments'].append(dict(page=n,**l));current['endPage']=n
    if len(records)!=90 or len({r['topic'] for r in records})!=14:raise ValueError('Changed inventory scope')
    for item in records+contexts:
        item['rawText']='\n'.join(f['text'] for f in item['fragments'])
        item['text']=' '.join(item['rawText'].split())
        if 'officialId' in item:item['text']=re.sub(r'^\d+\s*-\s*','',item['text'])
    return records,contexts

def build_inventory():
    meta=json.loads((ROOT/'programme.meta.json').read_text(encoding='utf-8'))
    for name,key in [('programme.pdf','sha256'),('programme.pages.json','extractionSha256'),('programme.ocr.json','ocrSha256')]:
        if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=meta[key]:raise ValueError('Changed evidence: '+name)
    records,contexts=parse_pages(json.loads((ROOT/'programme.ocr.json').read_text(encoding='utf-8-sig')))
    return dict(schemaVersion=1,jurisdictionId='m-12040',mandateId='m-12040-2023',mandateLabel='Castellón · mandato municipal 2023–2027',sourceId='castellon-programme',mandateSourceId='castellon-programme',registerSourceId='castellon-mayor-register',sourceLabel='Pacto municipal PP–VOX · agosto de 2023',sourceSha256=meta['sha256'],importedAt='2026-10-11',textLanguage='es',programmeCopy=True,inventoryKind='numbered-sections',transcriptionMethod='ocr',transcriptionPending=True,inventoryTotal=90,
      scope='90 puntos numerados en 14 áreas del pacto municipal PP–VOX presentado el 01/08/2023. Las bases y el reparto de responsabilidades se conservan como contexto. No equivale a promesas únicas ni agota los programas electorales, la investidura y los acuerdos posteriores.',
      textNote='Copia escaneada de 13 páginas alojada por Prensa Ibérica, pendiente de cotejo con copia de los firmantes. La noticia de Castellón Información acredita la presentación del pacto de 90 puntos, pero no autentica este archivo. Se conserva también el programa electoral del PP alojado por su autor: todavía no está conciliado con este inventario. OCR provisional con coordenadas; recuperación visual del número 7 y orden de lectura de números separados en la página 2. Páginas del PDF sin numeración impresa. Las valoraciones políticas se atribuyen a los firmantes. La ficha municipal identifica a Begoña Carrasco como alcaldesa. El 87 % difundido por la alcaldesa en junio de 2026 incluye puntos ejecutados o en ejecución: no es un porcentaje verificado por RegTrack. Sin revisión humana independiente registrada.',contextBlocks=contexts,records=records)

if __name__=='__main__':
    result=build_inventory();Path('data/mandate/castellon-inventory.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Castellón:',len(result['records']),'points;',len(result['contextBlocks']),'context blocks')

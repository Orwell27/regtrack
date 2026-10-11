"""Import all numbered pact sections; keep commitments outside that scope visible as context."""
import hashlib,json,re
from pathlib import Path
ROOT=Path('data/mandate/evidence/territorial/andalucia')
CHAPTERS={5:'Fiscalidad',8:'Inmigración',13:'Energía, industria y empleo',18:'Familia',20:'Cultura y turismo',21:'Vivienda',27:'Movilidad y transporte',28:'Educación',32:'Justicia',33:'Sanidad',43:'Sector primario',53:'Medio ambiente',56:'Gasto superfluo',58:'Leyes ideológicas',59:'Cláusula final'}

def reading_order(lines):
    groups=[]
    for line in sorted(lines,key=lambda l:(l['y'],l['x'])):
        if not groups or line['y']-groups[-1][0]['y']>12:groups.append([])
        groups[-1].append(line)
    return [l for group in groups for l in sorted(group,key=lambda l:l['x'])]

def parse_pages(pages):
    if [p['page'] for p in pages]!=list(range(1,61)):raise ValueError('Missing or reordered scanned page')
    records=[];contexts=[];current=None;chapter='Bases del acuerdo'
    def context(n,topic):
        item=dict(id=f'r-01-context-{len(contexts)+1}',topic=topic,page=n,endPage=n,fragments=[])
        contexts.append(item);return item
    for p in pages:
        n=p['page'];chapter=CHAPTERS.get(n,chapter)
        body=reading_order([l for l in p['lines'] if l['kind']!='decoration'])
        if n<=4 or n==60:
            block=context(n,'Bases, distribución de responsabilidades y firma · texto de los autores')
            block['fragments']=[dict(page=n,**l) for l in body];current=None;continue
        heading=None
        for l in body:
            if l['kind']=='heading':
                if heading is None:heading=context(n,chapter+' · epígrafe')
                heading['fragments'].append(dict(page=n,**l));continue
            heading=None
            if l['kind']=='marker':
                ordinal=l['ordinal']
                if ordinal!=len(records)+1:raise ValueError('Missing, duplicate or reordered section')
                current=dict(id=f'r-01-{ordinal}',officialId=str(ordinal),topic=chapter,page=n,endPage=n,sourceId='andalucia-programme',fragments=[],sourceNote='Transcripción OCR provisional de una copia escaneada. Comprobar la imagen original enlazada; las submedidas se conservan en el apartado numerado.')
                records.append(current)
            if current is None:raise ValueError('Orphan OCR line')
            current['fragments'].append(dict(page=n,**l));current['endPage']=n
    if len(records)!=150 or len({r['topic'] for r in records})!=15:raise ValueError('Changed inventory scope')
    for item in records+contexts:
        item['rawText']='\n'.join(f['text'] for f in item['fragments'])
        texts=[]
        for f in item['fragments']:
            t=f['text']
            if f['kind']=='marker':t=re.sub(r'^(?:\d+|I{1,2})\s*\.\s*','',t)
            texts.append(t)
        text=' '.join(' '.join(texts).split())
        text=re.sub(r'\beI\b','el',text);text=re.sub(r'\bEI\b','El',text)
        item['text']=text
    # Numerals checked against the page 28 image, without changing other OCR numerals.
    r=records[62];r['text']=r['text'].replace('de O a 3','de 0 a 3').replace('de 0 a I años','de 0 a 1 años')
    records[46]['text']=records[46]['text'].replace('a 10 largo','a lo largo')
    records[87]['text']=records[87]['text'].replace('Materno-lnfantil','Materno-Infantil')
    records[73]['sourceNote']+=' El plazo impreso «primer semestre de 2026» es anterior a la firma del 02/07/2026: discrepancia pendiente de aclaración, sin sustituirlo por 2027 ni deducir automáticamente incumplimiento.'
    return records,contexts

def build_inventory():
    meta=json.loads((ROOT/'programme.meta.json').read_text(encoding='utf-8'))
    for name,key in [('programme.pdf','sha256'),('programme.pages.json','extractionSha256'),('programme.ocr.json','ocrSha256'),('programme.ordered.json','orderedSha256')]:
        if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=meta[key]:raise ValueError('Changed evidence: '+name)
    records,contexts=parse_pages(json.loads((ROOT/'programme.ordered.json').read_text(encoding='utf-8')))
    return dict(schemaVersion=1,jurisdictionId='r-01',mandateId='r-01-2026',mandateLabel='Andalucía · mandato iniciado en julio de 2026',sourceId='andalucia-programme',mandateSourceId='andalucia-programme',registerSourceId='andalucia-investiture-register',sourceLabel='Acuerdo de Gobierno PP–VOX · 02/07/2026',sourceSha256=meta['sha256'],importedAt='2026-10-11',textLanguage='es',programmeCopy=True,inventoryKind='numbered-sections',transcriptionPending=True,inventoryTotal=150,
      scope='150 medidas numeradas en 15 capítulos del acuerdo PP–VOX firmado el 02/07/2026. Las bases y el reparto de responsabilidades quedan como contexto, pendientes de conciliación: este recuento no equivale a promesas únicas ni agota todos los compromisos del mandato.',
      textNote='Copia escaneada de 60 páginas publicada por elDiario.es; falta cotejar una copia alojada por los firmantes. El medio es el alojamiento, no una corroboración independiente del contenido del acuerdo. OCR provisional con correcciones puntuales y cotejo visual de los pasajes usados en las fichas; pendiente revisión íntegra independiente. Los localizadores corresponden a páginas del PDF, coincidentes con la numeración impresa. El encabezado de Familia, ilegible para el OCR, se ha identificado visualmente en la página 18. Se conserva el plazo anterior a la firma en la medida 74. Las afirmaciones y valoraciones del acuerdo se atribuyen a sus autores. Se separa el nuevo mandato de julio de 2026 de las actuaciones anteriores; no hay revisión humana independiente registrada.',contextBlocks=contexts,records=records)

if __name__=='__main__':
    result=build_inventory();Path('data/mandate/andalucia-inventory.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Andalucía:',len(result['records']),'sections;',len(result['contextBlocks']),'context blocks')

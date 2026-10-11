"""Reproduce a provisional inventory from the archived Alicante programme OCR."""
import hashlib
import json
import re
from pathlib import Path
ROOT = Path('data/mandate/evidence/territorial/alicante')
CHAPTERS = dict(zip([4,6,8,9,13,14,16,18,20,21,23,26,30,33,34,35,36,37,39,46,49,51,54,58], ['Empleo','Fiscalidad e impuestos','Conciliación familiar','Educación y sanidad','Acción social · Alicante solidaria','Familia','Mayores','Igualdad','Vivienda','Medio ambiente y sostenibilidad','Juventud','Cultura','Fiestas y tradiciones','Deportes','Limpieza','Movilidad y transporte','Bienestar animal','Seguridad y convivencia','Economía y tejido productivo','Turismo','Planificación urbana y espacio público','Modelo de ciudad','Barrios','Ayuntamiento']))

def display_text(text):
    return ' '.join(re.sub(r'\bEI\b','El',re.sub(r'\beI\b','el',text)).split())

def parse_pages(pages):
    if [p['page'] for p in pages] != list(range(1,61)):
        raise ValueError('Missing or reordered page')
    records, contexts, current, chapter = [], [], None, ''
    for page in pages:
        number=page['page']
        if number in CHAPTERS:
            chapter=CHAPTERS[number];current=None
        for line in page['lines']:
            if line['kind']=='decoration':continue
            context=line['kind']=='context'
            if line['kind']=='marker':
                current=dict(id=f'm-03014-{len(records)+1}',officialId=f'Sin número · {len(records)+1}',topic=chapter,page=number,endPage=number,sourceId='alicante-programme',fragments=[],sourceNote='Orden editorial de las viñetas principales, con sublistas conservadas. OCR provisional de una copia escaneada: comprobar la imagen del PDF. No es un recuento de promesas únicas.')
                records.append(current)
            elif current is None or (context and current in records) or number in [1,2,3,60] and current.get('page')!=number:
                current=dict(id=f'm-03014-context-{len(contexts)+1}',topic=chapter or 'Portadas e índice',page=number,endPage=number,fragments=[])
                contexts.append(current)
            current['fragments'].append(dict(page=number,**line));current['endPage']=number
    if len(records)!=901 or len({r['topic'] for r in records})!=24:
        raise ValueError('Changed inventory boundaries')
    for item in records+contexts:
        item['rawText']='\n'.join(f['text'] for f in item['fragments'])
        item['text']=display_text(' '.join(re.sub(r'^•\s*','',f['text']) if f['kind']=='marker' else f['text'] for f in item['fragments']))
        if not item['text']:raise ValueError('Empty section after OCR ordering')
    return records,contexts

def build_inventory():
    meta=json.loads((ROOT/'programme.meta.json').read_text(encoding='utf-8'))
    for name,key in [('programme.pdf','sha256'),('programme.pages.json','extractionSha256'),('programme.ocr.json','ocrSha256'),('programme.ordered.json','orderedSha256')]:
        if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=meta[key]:raise ValueError('Changed evidence: '+name)
    ordered=json.loads((ROOT/'programme.ordered.json').read_text(encoding='utf-8'))
    ocr=json.loads((ROOT/'programme.ocr.json').read_text(encoding='utf-8-sig'))
    for page,raw in zip(ordered,ocr,strict=True):
        if sorted(l['index'] for l in page['lines'])!=list(range(len(raw['lines']))):raise ValueError('Lost or duplicated OCR line')
        for line in page['lines']:
            if line['text']!=raw['lines'][line['index']]['text']:raise ValueError('Altered OCR text')
    records,contexts=parse_pages(ordered)
    return dict(schemaVersion=1,jurisdictionId='m-03014',mandateId='m-03014-2023',mandateLabel='Alicante · mandato municipal iniciado en 2023',sourceId='alicante-programme',mandateSourceId='alicante-programme',registerSourceId='alicante-register',sourceLabel='Programa electoral del PP de Alicante · 2023',sourceSha256=meta['sha256'],importedAt='2026-10-11',textLanguage='es',programmeCopy=True,inventoryKind='bullet-sections',transcriptionPending=True,inventoryTotal=len(records),scope='901 apartados provisionales de viñeta principal en 24 áreas del programa municipal de 2023. Las sublistas se mantienen con su apartado; las introducciones, epígrafes, portadas e índice se conservan como contexto. No equivalen a 901 promesas únicas ni agotan los compromisos del mandato: falta conciliar anuncios de campaña, discurso de investidura y decisiones posteriores.',textNote='Copia escaneada de 60 páginas alojada por Alicante Plaza y enlazada en su información electoral de mayo de 2023. Falta una copia publicada por la candidatura. El medio aporta procedencia, no una corroboración del cumplimiento. OCR provisional con reconstrucción del orden de las páginas a dos columnas; quedan pendientes cotejo íntegro de transcripción, segmentación y duplicidades por una persona independiente. Los títulos de las 24 áreas se toman del índice y de la imagen; el OCR omite parte de la tipografía de cabecera. Los localizadores son páginas del PDF. Las afirmaciones políticas del programa se atribuyen a sus autores. El acta constitutiva acredita el nombramiento de Luis Barcala el 17/06/2023; no se atribuyen al alcalde las intervenciones de otros candidatos.',contextBlocks=contexts,records=records)

if __name__=='__main__':
    result=build_inventory()
    Path('data/mandate/alicante-inventory.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(len(result['records']),len(result['contextBlocks']))
    for r in result['records']:
        if any(s in r['text'].lower() for s in ['centenario','unicef','ejecución de la obra del nuevo centro','bullying']):print(r['id'],r['page'],r['text'])

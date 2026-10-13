"""Import all 80 original descriptions from the archived copy, without invented follow-up."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/bilbao')
COUNTS = [10, 7, 7, 7, 8, 14, 6, 6, 4, 11]
TOPICS = ['Actividad económica y empleo', 'Políticas sociales', 'Juventud, valores, educación y formación',
          'Cultura y deporte', 'Convivencia y seguridad', 'Transformación urbana sostenible y vivienda',
          'Transporte, movilidad y accesibilidad', 'Desarrollo de barrios', 'Bilbao euskaldun',
          'Un Ayuntamiento cercano, moderno, eficaz y colaborador']
TABLE_PAGES = [13,14,16,17,19,20,22,23,25,26,28,29,30,31,33,34,36,37,39,41,42,43,44]


def normalize(text):
    # Embedded PDF fonts split the initial T from the word in both columns.
    text = re.sub(r'\bT (?=[a-záéíóú])', 'T', text)
    return re.sub(r'\s+', ' ', text).strip()


def parse_pages(pages):
    if [p['page'] for p in pages] != list(range(1,48)): raise ValueError('Incomplete programme pages')
    tables = [p for p in pages if 'ACTUACIÓN DESCRIPCIÓN DE LA ACTUACIÓN' in p['text']]
    if [p['page'] for p in tables] != TABLE_PAGES: raise ValueError('Changed table pages')
    records = []
    for page in tables:
        spans = page['spans']
        rows = sorted([s for s in spans if re.fullmatch(r'\d+\.\d+\.?-', s['text'])], key=lambda s: -s['y'])
        if not rows: raise ValueError('Missing action markers')
        for index, row in enumerate(rows):
            if not 60 <= row['x'] <= 65: raise ValueError('Changed title column')
            bottom = rows[index+1]['y'] if index+1 < len(rows) else 60
            selected = [s for s in spans if bottom < s['y'] <= row['y']+.1 and s is not row]
            # The Euskara table (p. 39) has a narrower title column.
            if any(not (60 <= s['x'] <= 65 or 218 <= s['x'] <= 810) for s in selected):
                raise ValueError('Unknown text column')
            title = normalize(' '.join(s['text'] for s in selected if s['x'] < 200))
            description = normalize(' '.join(s['text'] for s in selected if s['x'] >= 200))
            if not title or not description: raise ValueError('Missing title or description')
            official_id = row['text'].removesuffix('-').removesuffix('.')
            topic = int(official_id.split('.')[0])
            if not 1 <= topic <= 10: raise ValueError('Unknown topic')
            records.append(dict(id='m-48020-'+official_id, officialId=official_id, text=title,
                programmeText=title+'\n'+description, topic=TOPICS[topic-1], page=page['page'],
                endPage=page['page'], sourceId='bilbao-programme-copy'))
    expected = [f'{topic}.{number}' for topic,count in enumerate(COUNTS,1) for number in range(1,count+1)]
    if [r['officialId'] for r in records] != expected: raise ValueError('Missing or duplicate action')
    return records


def import_inventory():
    metadata = json.loads((ROOT/'programme.meta.json').read_text(encoding='utf-8'))
    original = (ROOT/'programme.pdf').read_bytes()
    extraction = (ROOT/'programme.pages.json').read_bytes()
    if len(original) != metadata['bytes'] or hashlib.sha256(original).hexdigest() != metadata['sha256']:
        raise ValueError('Changed programme original')
    if hashlib.sha256(extraction).hexdigest() != metadata['extractionSha256']:
        raise ValueError('Changed programme extraction')
    pages = json.loads(extraction)
    if pages['sourceSha256'] != metadata['sha256']: raise ValueError('Extraction from another source')
    return dict(schemaVersion=1, jurisdictionId='m-48020', mandateId='m-48020-2023',
        mandateLabel='Ayuntamiento de Bilbao · mandato 2023–2027', sourceId='bilbao-programme-copy',
        registerSourceId='bilbao-programme-register', sourceLabel='Programa · copia difundida por EAJ-PNV',
        sourceSha256=metadata['sha256'], inventoryTotal=80, textLanguage='es', programmeCopy=True,
        scope='Las 80 actuaciones prioritarias y sus descripciones completas del Plan de Mandato 2023–2027, en una copia difundida por EAJ-PNV. El propio documento aclara que no recoge toda la actividad municipal.',
        textNote='La copia de 47 páginas se conserva íntegra y su origen partidario queda identificado: no es corroboración independiente. El registro municipal coincide en título, estructura y 80 actuaciones, pero sus PDF devolvieron 403 y no se ha comprobado igualdad de bytes. El seguimiento municipal anunciado para junio de 2026 no se ha recuperado ni importado; no se inventan estados o porcentajes. Se separan las dos columnas del PDF y se unen espacios tipográficos en palabras como Talento o Turismo, conservando la extracción sin normalizar para cotejo.',
        records=parse_pages(pages['pages']))


if __name__ == '__main__':
    result = import_inventory()
    Path('data/mandate/bilbao-inventory.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Bilbao: 80 actuaciones y descripciones completas; seguimiento no importado.')

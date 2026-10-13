"""Import visible programme table cells; never count hidden PDF overflow as promises."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/galicia')


def normalize(text):
    return ' '.join(text.replace('\x02', '').replace('\ufffe', '').split())


def parse_cells(pages, contents):
    if [p['page'] for p in pages] != list(range(1, 184)):
        raise ValueError('Expected all 183 pages')
    topics = []
    for page in contents[1:4]:
        for line in page['text'].splitlines():
            match = re.match(r'^(.*?)\.{2,}\s*(\d+)$', line.strip())
            if match:
                topics.append(match[1].strip())
    if len(topics) != 72:
        raise ValueError('Expected 72 contents headings')
    topics.append('Refuerzo del autogobierno · demandas al Gobierno de España')
    records, contexts, section = [], [], 0
    for page in pages:
        for index, cell in enumerate(page['cells']):
            number = cell['number'].strip()
            note = None
            # The printed 4 is visible in the original, but its text-layer glyph
            # lies outside the page. This correction does not invent body text.
            if page['page'] == 169 and index == 3:
                if number or not cell['text'].startswith('INSISTIREMOS'):
                    raise ValueError('Changed visually checked autogovernment cell')
                number = '4'
                note = 'Número 4 cotejado visualmente en la página 169; la capa de texto sitúa su glifo fuera de la página. El texto de la medida se conserva de la celda visible.'
            continuation = (page['page'], index) in [(30, 0), (38, 0), (150, 0), (170, 0)]
            if continuation:
                if not records or number not in ['', records[-1]['number']]:
                    raise ValueError('Changed continuation marker')
                current = records[-1]
            else:
                if not number.isdigit():
                    raise ValueError('Missing number in visible cell')
                if number == '1':
                    section += 1
                elif not records or int(number) != int(records[-1]['number'])+1:
                    raise ValueError('Missing or reordered numbered section')
                if not 1 <= section <= len(topics):
                    raise ValueError('Unexpected section')
                current = dict(id=f'r-12-{section}-{number}', officialId=f'{section}.{number}',
                    number=number, topic=topics[section-1], page=page['page'], endPage=page['page'],
                    sourceId='galicia-programme', fragments=[])
                if note: current['sourceNote'] = note
                records.append(current)
            current['fragments'].append(dict(page=page['page'], cell=index, box=cell['box'], text=cell['text']))
            current['endPage'] = page['page']
        for index, context in enumerate(page['contexts']):
            if not context['text'].strip(): continue
            contexts.append(dict(id=f'r-12-context-{page["page"]}-{index}', topic=f'Contexto del documento · página {page["page"]}',
                page=page['page'], endPage=page['page'], rawText=context['text'], text=normalize(context['text']), box=context['box']))
    for record in records:
        record['rawText'] = '\n'.join(f['text'] for f in record['fragments'])
        record['text'] = normalize(record['rawText'])
        if not record['text']: raise ValueError('Empty programme section')
    if section != 73 or len(records) != 793:
        raise ValueError('Incomplete numbered inventory')
    return records, contexts


def build_inventory():
    meta = json.loads((ROOT/'programme.meta.json').read_text(encoding='utf-8'))
    for name, key in [('programme.pdf', 'sha256'), ('programme.pages.json', 'extractionSha256'), ('programme.cells.json', 'cellsSha256')]:
        if hashlib.sha256((ROOT/name).read_bytes()).hexdigest() != meta[key]:
            raise ValueError('Changed source or extraction: '+name)
    records, contexts = parse_cells(json.loads((ROOT/'programme.cells.json').read_text(encoding='utf-8')),
        json.loads((ROOT/'programme.pages.json').read_text(encoding='utf-8')))
    return dict(schemaVersion=1, jurisdictionId='r-12', mandateId='r-12-2024',
        mandateLabel='Galicia · mandato 2024–2028 · programa PPdeG', sourceId='galicia-programme',
        mandateSourceId='galicia-programme', registerSourceId='galicia-programme-register',
        sourceLabel='Programa de Gobierno PPdeG 2024–2028 · original en castellano', sourceSha256=meta['sha256'],
        importedAt='2026-10-11', textLanguage='es', inventoryKind='numbered-sections', transcriptionPending=True, transcriptionMethod='digital',
        inventoryTotal=len(records),
        scope='793 apartados numerados del programa original, distribuidos en 72 áreas y un bloque de demandas al Gobierno de España. Son apartados documentales, no 793 promesas atómicas: algunos contienen submedidas y repiten compromisos de otras áreas. Los balances de actuaciones anteriores se conservan como contexto. Faltan el cotejo visual integral, la descomposición de todas las submedidas y la conciliación con los compromisos posteriores de investidura y gobierno.',
        textNote='PDF digital de 183 páginas publicado por su autor. Los identificadores área.punto son editoriales y distinguen la numeración repetida de cada área. Las celdas se ordenan por su posición visible, porque la capa de texto altera el orden de varias medidas y contiene texto duplicado fuera de página. Se preservan cuatro continuaciones entre páginas y se documenta el número 4 cotejado visualmente en la página 169. Se han inspeccionado páginas de control, no las 183 completas. El 87 % anunciado por el PPdeG el 16/05/2026 reúne compromisos cumplidos o en marcha: no se interpreta como cumplimiento total ni se traslada a las fichas. El nombramiento de Alfonso Rueda se publicó el 12/04/2024. No hay revisión humana independiente registrada.',
        contextBlocks=contexts, records=records)


if __name__ == '__main__':
    result = build_inventory()
    Path('data/mandate/galicia-inventory.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print('Galicia:', result['inventoryTotal'], 'numbered sections;', len(result['contextBlocks']), 'context blocks')

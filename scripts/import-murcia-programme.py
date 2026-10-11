"""Reconstruct the 30 programme points and eight operative clauses of the pact."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/murcia')
SOURCE = 'murcia-programme-copy'
CLAUSES = ['Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto', 'Sexto', 'Séptimo', 'Octavo']


def parse_pages(pages):
    if [p['page'] for p in pages] != list(range(1, 7)):
        raise ValueError('Expected six ordered pages')
    rows, contexts = [], []
    current = dict(id='r-14-context-intro', topic='Introducción de los firmantes', page=1, endPage=1, lines=[])
    contexts.append(current)
    for page in pages:
        lines = [line.strip() for line in page['text'].splitlines() if line.strip()]
        if not lines or lines.pop(0) != str(page['page']):
            raise ValueError('Missing page marker')
        for line in lines:
            number = re.match(r'^(\d+)\.\s+(.+)', line)
            clause = re.match(r'^(Primero|Segundo|Tercero|Cuarto|Quinto|Sexto|Séptimo|Octavo)\.-\s+(.+)', line)
            if number or clause:
                marker = number or clause
                official = marker[1]
                suffix = official if number else f'acuerdo-{CLAUSES.index(official)+1}'
                current = dict(id=f'r-14-{suffix}', officialId=official,
                    topic='Puntos programáticos' if number else 'Acuerdos de organización y gobernabilidad',
                    page=page['page'], endPage=page['page'], lines=[marker[2]], sourceId=SOURCE)
                rows.append(current)
            elif line.startswith('En Cartagena, a '):
                current = dict(id='r-14-context-firma', topic='Fecha y firmantes', page=page['page'], endPage=page['page'], lines=[line])
                contexts.append(current)
            else:
                current['lines'].append(line)
                current['endPage'] = page['page']
    if [r['officialId'] for r in rows] != [str(i) for i in range(1, 31)]+CLAUSES:
        raise ValueError('Incomplete or reordered programme and operative clauses')
    if len(contexts) != 2 or '5 de septiembre de 2023' not in contexts[1]['lines'][0]:
        raise ValueError('Missing dated closing block')
    for item in rows+contexts:
        raw = '\n'.join(item.pop('lines'))
        item.update(rawText=raw, text=' '.join(raw.split()))
    if 'PORTAVOZ GRUPO PARLAMENTARIO VOX' not in contexts[1]['text']:
        raise ValueError('Missing signatories')
    return rows, contexts


def verified_pages(name):
    meta = json.loads((ROOT/f'{name}.meta.json').read_text(encoding='utf-8'))
    data = (ROOT/f'{name}.pdf').read_bytes()
    extraction = (ROOT/f'{name}.pages.json').read_bytes()
    if len(data) != meta['bytes'] or hashlib.sha256(data).hexdigest() != meta['sha256']:
        raise ValueError('Changed source PDF')
    if hashlib.sha256(extraction).hexdigest() != meta['extractionSha256']:
        raise ValueError('Changed extraction')
    return meta, json.loads(extraction)


def build_inventory():
    meta, pages = verified_pages('programme')
    _, other = verified_pages('programme-second-copy')
    if [''.join(p['text'].split()) for p in pages] != [''.join(p['text'].split()) for p in other]:
        raise ValueError('Press copies have different extracted text')
    rows, contexts = parse_pages(pages)
    return dict(schemaVersion=1, jurisdictionId='r-14', mandateId='r-14-2023',
        mandateLabel='Región de Murcia · mandato 2023–2027 · pacto de 5/09/2023',
        sourceId=SOURCE, mandateSourceId=SOURCE, registerSourceId='murcia-programme-register',
        sourceLabel='Pacto PP–VOX · copia difundida por La Verdad', sourceSha256=meta['sha256'],
        importedAt='2026-10-11', textLanguage='es', programmeCopy=True, inventoryTotal=len(rows),
        scope='Los 30 puntos programáticos y los ocho acuerdos de organización y gobernabilidad del pacto PP–VOX de 5 de septiembre de 2023. Las 38 fichas son apartados del pacto inicial, no todas las promesas electorales ni todas las actuaciones del mandato. Los acuerdos segundo y séptimo remiten al programa: no añaden 30 promesas nuevas cada uno.',
        textNote='Se conservan las seis páginas, el punto 26 que continúa en la página 5, las ocho cláusulas finales y dos bloques de contexto con introducción, fecha y firmantes. Las valoraciones políticas del texto pertenecen a sus autores. Se han cotejado dos copias difundidas por La Verdad y elDiario.es: sus bytes son distintos, pero su texto extraído coincide página por página al excluir espacios. Ambas reproducen el mismo pacto y no son dos corroboraciones independientes. Sigue pendiente el cotejo con un archivo publicado por sus firmantes. La fecha del pacto no prueba que la composición del Gobierno ni la coalición se mantengan durante todo el mandato; se documentan ceses en julio de 2024.',
        contextBlocks=contexts, records=rows)


if __name__ == '__main__':
    Path('data/mandate/murcia-inventory.json').write_text(json.dumps(build_inventory(), ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print('Murcia: 30 programme points, eight operative clauses and two context blocks')

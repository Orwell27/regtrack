"""Preserve the initial pact, including governance clauses, without claiming mandate completeness."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/balears')
CLAUSES = ['Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto', 'Sexto']
CHAPTERS = ['LIBERTAD:', 'DESARROLLO ECONÓMICO:',
    'TURISMO, INDUSTRIA, COMERCIO, RESTAURACIÓN Y SECTOR NÁUTICO:',
    'MUNDO RURAL, AGUA, LITORAL Y PATRIMONIO:', 'EFICIENCIA EN EL GASTO PÚBLICO:',
    'EDUCACIÓN Y LENGUA:', 'SANIDAD:', 'POLÍTICAS SOCIALES Y FAMILIA:',
    'ACCESO A LA VIVIENDA Y DEFENSA DE LA PROPIEDAD PRIVADA:', 'SEGURIDAD:']


def parse_pages(pages):
    if [p['page'] for p in pages] != list(range(1, 16)):
        raise ValueError('Expected all fifteen pages in order')
    records, contexts, seen = [], [], []
    chapter = 'Acuerdos de gobernabilidad'
    def context(page, topic):
        item = dict(id=f'r-04-context-{len(contexts)+1}', topic=topic, page=page, endPage=page, fragments=[])
        contexts.append(item)
        return item
    current = context(1, 'Introducción de los firmantes')
    for page in pages:
        lines = [(i, s.strip()) for i, s in enumerate(page['text'].splitlines()) if s.strip()]
        if lines.pop(0)[1] != str(page['page']):
            raise ValueError('Missing page number')
        for index, line in lines:
            number = re.match(r'^(\d+)\.\s+(.+)', line)
            clause = re.match(r'^(Primero|Segundo|Tercero|Cuarto|Quinto|Sexto)\.-\s+(.+)', line)
            if line in CHAPTERS:
                chapter = line[:-1].capitalize()
                seen.append(line)
                current = context(page['page'], chapter+' · epígrafe')
            elif line == 'RELACIÓN DE MEDIDAS':
                current = context(page['page'], 'Encabezamiento de las medidas')
            elif line.startswith('COMISIÓN DE SEGUIMIENTO Y EVALUACIÓN DEL ACUERDO CONJUNTO DE'):
                current = dict(id='r-04-comision', officialId='Comisión de seguimiento',
                    topic='Reglas de seguimiento y evaluación', page=page['page'], endPage=page['page'],
                    sourceId='balears-programme', fragments=[])
                records.append(current)
            elif line.startswith('Fdo. '):
                current = context(page['page'], 'Firmantes · grafía del original')
            elif number or clause:
                marker = number or clause
                official = marker[1]
                suffix = official if number else f'acuerdo-{CLAUSES.index(official)+1}'
                current = dict(id=f'r-04-{suffix}', officialId=official, topic=chapter,
                    page=page['page'], endPage=page['page'], sourceId='balears-programme', fragments=[])
                records.append(current)
                line = marker[2]
            current['fragments'].append(dict(page=page['page'], line=index, text=line))
            current['endPage'] = page['page']
    if [r['officialId'] for r in records] != CLAUSES+[str(i) for i in range(1, 111)]+['Comisión de seguimiento']:
        raise ValueError('Missing, duplicate or reordered pact sections')
    if seen != CHAPTERS or len(contexts) != 13:
        raise ValueError('Missing chapter or context')
    for item in records+contexts:
        item['rawText'] = '\n'.join(f['text'] for f in item['fragments'])
        item['text'] = ' '.join(item['rawText'].split())
    if 'Portavoz Grupo Parlamentario PP' not in contexts[-1]['text']:
        raise ValueError('Missing signatures')
    return records, contexts


def build_inventory():
    meta = json.loads((ROOT/'programme.meta.json').read_text(encoding='utf-8'))
    pdf = (ROOT/'programme.pdf').read_bytes()
    extraction = (ROOT/'programme.pages.json').read_bytes()
    if len(pdf) != meta['bytes'] or hashlib.sha256(pdf).hexdigest() != meta['sha256']:
        raise ValueError('Changed source PDF')
    if hashlib.sha256(extraction).hexdigest() != meta['extractionSha256']:
        raise ValueError('Changed extraction')
    records, contexts = parse_pages(json.loads(extraction))
    return dict(schemaVersion=1, jurisdictionId='r-04', mandateId='r-04-2023',
        mandateLabel='Illes Balears · mandato 2023–2027 · pacto inicial de 28/06/2023',
        sourceId='balears-programme', mandateSourceId='balears-programme', registerSourceId='balears-programme-register',
        sourceLabel='Acuerdo PP–VOX de 2023 · original publicado por VOX', sourceSha256=meta['sha256'],
        importedAt='2026-10-11', textLanguage='es', inventoryKind='initial-programme', inventoryTotal=len(records),
        scope='Los 110 puntos numerados, las seis cláusulas iniciales y las reglas finales de la comisión del pacto PP–VOX de 28 de junio de 2023: 117 apartados, no 117 promesas únicas ni todo el mandato. Las referencias a las 110 medidas no duplican su recuento. El acuerdo PP–Sa Unió de 4/07/2023, el programa del PP presentado con más de 500 medidas y los acuerdos posteriores aún deben conciliarse con este inventario.',
        textNote='Original digital de quince páginas, con diez capítulos y trece bloques de contexto; se preservan sublistas y continuaciones entre páginas. Las expresiones políticas y la grafía de los firmantes pertenecen al documento original. El 12/07/2024 el Govern anunció la ruptura del pacto y dejó de asumir sus puntos pendientes que no figuraban en el programa del PP. PP y VOX anunciaron un nuevo acuerdo presupuestario el 30/05/2025. Por ello, no se presume que el pacto inicial siguiera íntegramente vigente ni que los nuevos acuerdos borrasen las promesas originales. Se conservan por separado el acuerdo PP–Sa Unió del portal oficial y copias del programa PP y del acuerdo presupuestario, todavía sin incorporarlos al recuento.',
        contextBlocks=contexts, records=records)


if __name__ == '__main__':
    result = build_inventory()
    Path('data/mandate/balears-inventory.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print('Baleares: 110 points, six operative clauses, commission rules; 13 context blocks')

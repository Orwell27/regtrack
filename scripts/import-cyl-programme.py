"""Import parent sections with all submeasures and deadlines retained in context."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/cyl')
CHAPTERS = ['Política económica', 'Política tributaria', 'Financiación autonómica',
    'Energía e industria', 'Infraestructuras del Estado en Castilla y León',
    'Transporte, movilidad e infraestructuras autonómicas', 'Sector primario y medio rural',
    'Medio ambiente', 'Protección civil, incendios y emergencias', 'Inmigración',
    'Familia, despoblación y natalidad', 'Sanidad', 'Educación, universidades, innovación y talento',
    'Dependencia y servicios sociales', 'Vivienda', 'Eficiencia, simplificación administrativa y gasto superfluo',
    'Cultura, tradiciones y patrimonio', 'Promoción del deporte', 'Libertad frente al adoctrinamiento']
CHAPTER_COUNTS = [12, 7, 3, 11, 4, 7, 31, 21, 7, 10, 12, 17, 20, 2, 22, 15, 12, 5, 2]


def reading_order(lines):
    groups = []
    for line in sorted(lines, key=lambda l: (l['y'], l['x'])):
        if not groups or line['y'] - groups[-1][0]['y'] > 9: groups.append([])
        groups[-1].append(line)
    return [line for group in groups for line in sorted(group, key=lambda l: l['x'])]


def parse_pages(pages):
    if [p['page'] for p in pages] != list(range(1, 63)): raise ValueError('Missing or reordered page')
    records = []; contexts = []; current = None
    def context(page, topic):
        item = dict(id=f'r-07-context-{len(contexts)+1}', topic=topic, page=page, endPage=page, fragments=[])
        contexts.append(item); return item
    for page in pages:
        n = page['page']; heading = None; block = None
        for line in reading_order([l for l in page['lines'] if l['kind'] != 'decoration']):
            fragment = dict(page=n, **line)
            if n <= 3 or n == 62 or (n == 4 and line['y'] < 440) or (n == 61 and line['y'] >= 805):
                if block is None: block = context(n, 'Portada, índice, bases, responsabilidades o firma · texto de los autores')
                block['fragments'].append(fragment); current = None; continue
            if line['kind'] == 'heading':
                if heading is None: heading = context(n, 'Epígrafe del acuerdo')
                heading['fragments'].append(fragment); continue
            heading = None
            if line['kind'] == 'marker':
                number = line['officialId']; chapter = int(number.split('.')[0])
                current = dict(id='r-07-'+number.replace('.', '-'), officialId=number,
                    topic=CHAPTERS[chapter-1], page=n, endPage=n, sourceId='cyl-programme', fragments=[],
                    sourceNote='Apartado principal con sus submedidas y plazos. Transcripción OCR provisional de una copia escaneada; consultar la imagen original enlazada.')
                records.append(current)
            if current is None: raise ValueError('Orphan OCR line')
            current['fragments'].append(fragment); current['endPage'] = n
    expected = [f'{c}.{i}' for c, total in enumerate(CHAPTER_COUNTS, 1) for i in range(1, total+1)]
    if [r['officialId'] for r in records] != expected: raise ValueError('Missing, duplicate or reordered section')
    for item in records+contexts:
        item['rawText'] = '\n'.join(f['text'] for f in item['fragments'])
        lines = []
        for f in item['fragments']:
            text = re.sub(r'^\d+\.\d+\s+', '', f['text']) if f['kind'] == 'marker' else f['text']
            lines.append(text)
        text = ' '.join(' '.join(lines).split())
        text = re.sub(r'\bEI\b', 'El', text); text = re.sub(r'\beI\b', 'el', text)
        item['text'] = text
    for number in ['11.8', '13.5']:
        next(r for r in records if r['officialId'] == number)['sourceNote'] += ' Numeración cotejada en la imagen: el OCR omite el primer dígito, conservado en el identificador mostrado.'
    return records, contexts


def build_inventory():
    meta = json.loads((ROOT/'programme.meta.json').read_text(encoding='utf-8'))
    for name, key in [('programme.pdf', 'sha256'), ('programme.pages.json', 'extractionSha256'),
        ('programme.ocr.json', 'ocrSha256'), ('programme.ordered.json', 'orderedSha256')]:
        if hashlib.sha256((ROOT/name).read_bytes()).hexdigest() != meta[key]: raise ValueError('Changed evidence: '+name)
    records, contexts = parse_pages(json.loads((ROOT/'programme.ordered.json').read_text(encoding='utf-8')))
    return dict(schemaVersion=1, jurisdictionId='r-07', mandateId='r-07-2026',
        mandateLabel='Castilla y León · mandato iniciado en junio de 2026', sourceId='cyl-programme',
        mandateSourceId='cyl-programme', registerSourceId='cyl-appointment',
        sourceLabel='Acuerdo de Gobierno PP–VOX · 03/06/2026', sourceSha256=meta['sha256'], importedAt='2026-10-11',
        textLanguage='es', programmeCopy=True, inventoryKind='numbered-sections', transcriptionPending=True,
        inventoryTotal=220,
        scope='220 apartados principales en 19 ejes del acuerdo PP–VOX de 03/06/2026. Cada apartado conserva sus submedidas y plazos. No es un recuento de promesas únicas ni equivale a las 324 medidas anunciadas por los firmantes; esa conciliación sigue pendiente.',
        textNote='Copia escaneada de 62 páginas alojada por elDiario.es; falta copia publicada por los firmantes. El alojamiento no es una corroboración independiente. La capa de texto incrustada omite pasajes y confunde números: se conserva y se usa un nuevo OCR con ordenación geométrica, provisional y pendiente de cotejo íntegro independiente. Se corrigen los números 11.8 y 13.5 tras leer la imagen. Los localizadores son páginas del PDF. Bases, reparto de responsabilidades y firma se conservan como contexto, pendientes de conciliación con los apartados. Las afirmaciones políticas se atribuyen a los autores. El nombramiento del BOE separa el mandato de junio de 2026 de las actuaciones previas; no hay revisión humana independiente registrada.',
        contextBlocks=contexts, records=records)


if __name__ == '__main__':
    result = build_inventory()
    Path('data/mandate/cyl-inventory.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print('Castilla y León:', len(result['records']), 'apartados;', len(result['contextBlocks']), 'contextos')

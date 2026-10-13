"""Import scanned agreement sections without pretending OCR is an original transcription."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/aragon')
CHAPTERS = ['Fiscalidad', 'Inmigración', 'Seguridad', 'Vivienda', 'Sector primario',
    'Apuesta por el medio rural y contra la despoblación', 'Medio ambiente',
    'Economía, energía e industria', 'Educación y universidad',
    'Familia, sanidad, vida y hábitos saludables', 'Eficiencia frente a derroche de gasto público',
    'Libertad frente a adoctrinamiento e imposición', 'Posiciones de VOX en el Gobierno de Aragón']
HEADING_PAGES = [4, 8, 11, 14, 18, 23, 24, 26, 29, 32, 35, 37, 38]


def reading_order(lines):
    groups = []
    for line in sorted(lines, key=lambda l: (l['y'], l['x'])):
        if not groups or line['y']-groups[-1][0]['y'] > 12:
            groups.append([])
        groups[-1].append(line)
    return [line for group in groups for line in sorted(group, key=lambda l: l['x'])]


def display_text(text):
    text = re.sub(r'\beI\b', 'el', text)
    text = re.sub(r'\bEI\b', 'El', text)
    # Context-specific OCR confusions; never replace every numeric 10, I or O.
    for before, after in [('a 10 largo', 'a lo largo'), ('que así 10 acredite', 'que así lo acredite'),
        ('y 10 protegerá', 'y lo protegerá'), ('con 10 dispuesto', 'con lo dispuesto'),
        ('que 10 necesiten', 'que lo necesiten'), ('reforzará 10 previsto', 'reforzará lo previsto'),
        ('de 10 anterior', 'de lo anterior'), ('del IRPF de I .OOO€', 'del IRPF de 1.000€'),
        ('de I punto porcentual', 'de 1 punto porcentual'), ('de O a 3 años', 'de 0 a 3 años'),
        ('Infanto-JuveniI', 'Infanto-Juvenil')]:
        text = text.replace(before, after)
    return ' '.join(text.split())


def parse_pages(pages):
    if [p['page'] for p in pages] != list(range(1, 40)):
        raise ValueError('Missing scanned page')
    records, contexts, current, chapter = [], [], None, ''
    def context(page, topic):
        item = dict(id=f'r-02-context-{len(contexts)+1}', topic=topic, page=page,
            endPage=page, fragments=[])
        contexts.append(item)
        return item
    for page in pages:
        number = page['page']
        body = [l for l in page['lines'] if l['kind'] != 'decoration']
        if number in [1, 2, 3, 39]:
            current = context(number, 'Índice, bases o firma · texto de los autores')
            for line in reading_order(body):
                current['fragments'].append(dict(page=number, **line))
            current = None
            continue
        heading = [l for l in body if l['kind'] == 'heading']
        # A multi-column OCR block can put "9." before the continuation above it.
        heading_y = min(l['y'] for l in heading) if heading else None
        heading_written = False
        for line in reading_order(body):
            if line['kind'] == 'heading':
                if not heading_written:
                    chapter = CHAPTERS[HEADING_PAGES.index(number)]
                    block = context(number, chapter+' · epígrafe')
                    block['fragments'] = [dict(page=number, **l) for l in heading]
                    heading_written = True
                continue
            if heading_y is not None and line['y'] > heading_y:
                chapter = CHAPTERS[HEADING_PAGES.index(number)]
            if line['kind'] == 'marker':
                ordinal = len(records)+1
                current = dict(id=f'r-02-{ordinal}', officialId=f'Sin número · {ordinal}',
                    topic=chapter, page=number, endPage=number, sourceId='aragon-programme', fragments=[],
                    sourceNote='Orden editorial de las viñetas principales. Transcripción OCR provisional de una copia escaneada; comprobar la imagen enlazada. Las sublistas permanecen en su apartado.')
                records.append(current)
            if current is None:
                raise ValueError('Orphan OCR line')
            current['fragments'].append(dict(page=number, **line))
            current['endPage'] = number
    if len(records) != 117 or len(contexts) != 17 or len({r['topic'] for r in records}) != 13:
        raise ValueError('Changed section count or headings')
    for item in records+contexts:
        item['rawText'] = '\n'.join(f['text'] for f in item['fragments'])
        # Remove physical glyphs only at their OCR coordinates, keeping text provenance.
        lines = []
        table_written = False
        for f in item['fragments']:
            if f['page'] == 4 and f['index'] in list(range(32, 44))+list(range(45, 51)):
                if not table_written:
                    lines.append('Descendientes computables en la unidad familiar / renta familiar igual o inferior a / deducción máxima anual por descendiente: 1 persona / 20.000 € / 150 €; 2 personas / 30.000 € / 175 €; 3 o más personas / 40.000 € / 300 €.')
                    table_written = True
                continue
            t = f['text']
            if f['kind'] == 'marker' and f['x'] < 190:
                t = re.sub(r'^[•eo]\s+', '', t)
            if t == 'o':
                continue
            lines.append(t)
        item['text'] = display_text(' '.join(lines))
        if item['page'] == 39:
            item['text'] = 'Zaragoza, a 22 de abril de 2026. D. Jorge Azcón Navarro, Presidente del PP Aragón. D. Alejandro Nolasco Asensio, Portavoz del Grupo Parlamentario VOX en las Cortes de Aragón.'
    # Preserve both contradictory deadlines; do not silently choose a fiscal year.
    for item in records:
        if item['id'] in ['r-02-2', 'r-02-81']:
            item['sourceNote'] += ' El plan fiscal (p. 4) fija 2028 para las deducciones y el apartado educativo (p. 30) remite a ese plan pero fija 2027: discrepancia del documento pendiente de aclaración.'
    return records, contexts


def build_inventory():
    meta = json.loads((ROOT/'programme.meta.json').read_text(encoding='utf-8'))
    for name, key in [('programme.pdf', 'sha256'), ('programme.pages.json', 'extractionSha256'),
        ('programme.ocr.json', 'ocrSha256'), ('programme.ordered.json', 'orderedSha256')]:
        if hashlib.sha256((ROOT/name).read_bytes()).hexdigest() != meta[key]:
            raise ValueError('Changed evidence: '+name)
    rows, contexts = parse_pages(json.loads((ROOT/'programme.ordered.json').read_text(encoding='utf-8')))
    return dict(schemaVersion=1, jurisdictionId='r-02', mandateId='r-02-2026',
        mandateLabel='Aragón · mandato iniciado en 2026', sourceId='aragon-programme',
        mandateSourceId='aragon-programme', registerSourceId='aragon-programme-register',
        sourceLabel='Acuerdo de Gobierno PP–VOX · 22/04/2026', sourceSha256=meta['sha256'],
        importedAt='2026-10-11', textLanguage='es', programmeCopy=True, inventoryKind='bullet-sections',
        transcriptionPending=True, inventoryTotal=len(rows),
        scope='117 apartados con viñeta principal en 13 capítulos del acuerdo PP–VOX firmado el 22/04/2026. Las sublistas se conservan dentro de cada apartado. Las bases sobre coalición y presupuestos de 2027–2030 permanecen como contexto y requieren su propia conciliación; este recuento no representa promesas únicas ni agota los compromisos del mandato.',
        textNote='Copia escaneada de 39 páginas alojada por La Vanguardia, idéntica byte a byte a la publicada por Cadena SER. Ambas reproducen el mismo acuerdo y no constituyen dos corroboraciones independientes. Falta cotejar un archivo publicado por los firmantes. Texto obtenido mediante OCR con correcciones puntuales y revisión visual de los pasajes utilizados en las fichas; falta el cotejo íntegro independiente de la transcripción. Los localizadores son páginas del PDF, coincidentes con la numeración impresa. Los apartados no tienen numeración propia: su orden es editorial. Se conserva la discrepancia entre el plazo fiscal de 2028 (p. 4) y el educativo de 2027 (p. 30) para las clases de refuerzo. Las afirmaciones y valoraciones políticas del acuerdo se atribuyen a sus autores, no se presentan como hechos comprobados. El nombramiento presidencial se publicó el 30/04/2026; no se mezcla este mandato con el de 2023.',
        contextBlocks=contexts, records=rows)


if __name__ == '__main__':
    result = build_inventory()
    Path('data/mandate/aragon-inventory.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print('Aragón:', result['inventoryTotal'], 'provisional OCR sections')

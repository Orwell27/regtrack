"""Import every main bullet, preserving sublists and distinct mandate context."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/extremadura')
HEADINGS = ['ENERGÍA E INDUSTRIA', 'SECTOR PRIMARIO', 'SANIDAD', 'INMIGRACIÓN',
    'REBAJA DE IMPUESTOS', 'VIVIENDA', 'SEGURIDAD, LIBERTAD Y PRIORIDAD NACIONAL',
    'EDUCACIÓN', 'FAMILIA, NATALIDAD Y DEMOGRAFÍA', 'GASTO IMPRODUCTIVO',
    'POSICIONES DE VOX EN EL GOBIERNO DE EXTREMADURA']
HEADING_PAGES = [3, 4, 8, 10, 14, 15, 18, 20, 21, 22, 23]
COUNTS = [4, 10, 5, 12, 4, 8, 5, 4, 3, 4, 3]


def body_lines(page):
    lines = [(i, line.strip()) for i, line in enumerate(page['text'].splitlines()) if line.strip()]
    if not lines or lines[0][1] != str(page['page']):
        raise ValueError('Missing or changed printed page')
    return lines[1:]


def parse_pages(pages):
    if [p['page'] for p in pages] != list(range(1, 24)):
        raise ValueError('Missing, duplicate or reordered page')
    records, contexts, current, chapter, observed = [], [], None, '', []
    def context(n, topic):
        item = dict(id=f'r-11-context-{len(contexts)+1}', topic=topic, page=n, endPage=n, fragments=[])
        contexts.append(item)
        return item
    for page in pages:
        n = page['page']
        for i, text in body_lines(page):
            fragment = dict(page=n, index=i, text=text)
            if n <= 2:
                if current is None or current['page'] != n:
                    current = context(n, 'Índice o bases del acuerdo · texto de los autores')
                current['fragments'].append(fragment)
                continue
            if text == 'MEDIDAS':
                context(n, 'Medidas · encabezamiento')['fragments'].append(fragment)
                current = None
                continue
            heading = re.match(r'^(\d+)\. (.+)$', text)
            if heading and heading[2] in HEADINGS:
                chapter = heading[2]
                observed.append((int(heading[1]), n))
                context(n, chapter+' · epígrafe')['fragments'].append(fragment)
                current = None
                continue
            if re.match(r'^[●\uf0b7] ', text):
                ordinal = len(records)+1
                current = dict(id=f'r-11-{ordinal}', officialId=f'Sin número · {ordinal}',
                    text='', topic=chapter, page=n, endPage=n, sourceId='extremadura-programme',
                    sourceNote='Orden editorial de las viñetas principales; el acuerdo no las numera. Las sublistas y sus condiciones permanecen en el apartado. Texto atribuido a los firmantes.', fragments=[])
                records.append(current)
            if current is None or not chapter:
                raise ValueError('Orphan programme line')
            current['fragments'].append(fragment);current['endPage'] = n
    if observed != list(zip(range(1, 12), HEADING_PAGES)):
        raise ValueError('Changed chapter sequence')
    if [sum(r['topic'] == h for r in records) for h in HEADINGS] != COUNTS or len(contexts) != 14:
        raise ValueError('Missing, duplicate or changed main bullet')
    for item in records+contexts:
        item['rawText'] = '\n'.join(f['text'] for f in item['fragments'])
        item['text'] = ' '.join(re.sub(r'^[●\uf0b7] ', '', item['rawText']).split())
    return records, contexts


def build_inventory():
    meta = json.loads((ROOT/'programme.meta.json').read_text(encoding='utf-8'))
    for name, key in [('programme.pdf', 'sha256'), ('programme.pages.json', 'extractionSha256')]:
        if hashlib.sha256((ROOT/name).read_bytes()).hexdigest() != meta[key]:
            raise ValueError('Changed evidence: '+name)
    records, contexts = parse_pages(json.loads((ROOT/'programme.pages.json').read_text(encoding='utf-8')))
    return dict(schemaVersion=1, jurisdictionId='r-11', mandateId='r-11-2026',
        mandateLabel='Extremadura · mandato iniciado en abril de 2026', sourceId='extremadura-programme',
        mandateSourceId='extremadura-programme', registerSourceId='extremadura-appointment',
        sourceLabel='Acuerdo de Gobierno PP–VOX · abril de 2026', sourceSha256=meta['sha256'],
        importedAt='2026-10-11', textLanguage='es', inventoryKind='bullet-sections',
        transcriptionPending=True, transcriptionMethod='digital', inventoryTotal=len(records),
        scope='62 apartados con viñeta principal en los 11 capítulos del acuerdo PP–VOX publicado en abril de 2026, incluidos tres de reparto institucional. Las submedidas permanecen en cada apartado. Las bases se conservan como contexto; este recuento no equivale a promesas únicas exhaustivas.',
        textNote='Documento digital de 23 páginas publicado por VOX, uno de los firmantes. Se conserva el archivo y su extracción textual con huellas. El PDF usa dos caracteres de viñeta principal; se incluyen ambos y se mantienen las sublistas. La numeración de las fichas es editorial y los localizadores son páginas del PDF, coincidentes con las impresas. El anuncio de VOX habla de 61 puntos y 74 medidas: su unidad no está conciliada con estas 62 viñetas principales. Pendientes el cotejo íntegro independiente, la conciliación de compromisos en las bases, reiteraciones y medidas posteriores. Las afirmaciones políticas se atribuyen a los autores, no a RegTrack. El nombramiento oficial de abril de 2026 separa este mandato del de 2023. No hay revisión humana independiente registrada.',
        contextBlocks=contexts, records=records)


if __name__ == '__main__':
    result = build_inventory()
    Path('data/mandate/extremadura-inventory.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print('Extremadura:', result['inventoryTotal'], 'apartados; 14 contextos')

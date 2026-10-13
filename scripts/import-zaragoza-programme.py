"""Preserve programme sections in visual order, without counting them as promises.

Run --extract with pypdfium2 to reproduce the archived digital text and geometry.
Normal imports and CI use the hashed extraction and need only the standard library.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/zaragoza')
HEADERS = ['@ N ATAL IACHUECA_ WWW. N ATAL IACHUECA. E S', 'ZARA G O ZA CIUDAD L Í D ER E N EUR O PA E N 2030']
STARTS = [(6, 27), (7, 18), (16, 27), (18, 28), (24, 25), (27, 18), (32, 25), (34, 21), (36, 30), (37, 11), (37, 26), (38, 24), (38, 25), (39, 33), (39, 34), (40, 16), (40, 17), (41, 22), (41, 23), (41, 24), (42, 20), (42, 21), (43, 21), (43, 22), (44, 19), (44, 22), (45, 22), (45, 25), (46, 14), (46, 17), (47, 24), (47, 27), (48, 12), (48, 15), (49, 16), (49, 19), (50, 18), (50, 21)]
CONTINUATIONS = {4: 'INVERSIONES Y TALENTO', 5: 'VIDA', 7: 'LAS PERSONAS', 9: 'PARTICIPAMOS TODOS'}


def save(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')


def extract():
    import pypdfium2 as pdfium
    pages, layout = [], []
    for n, page in enumerate(pdfium.PdfDocument(ROOT/'programme.pdf'), 1):
        tp = page.get_textpage()
        text = tp.get_text_range()
        if len(text) != tp.count_chars():
            raise ValueError('Character offsets differ from PDFium indices')
        lines, start = [], 0
        for i, line in enumerate(text.splitlines(keepends=True)):
            raw = line.rstrip('\r\n')
            if raw.strip():
                boxes = [tp.get_charbox(k) for k in range(start, start+len(raw)) if raw[k-start].strip()]
                bounds = [min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)]
                lines.append(dict(index=i, start=start, end=start+len(raw), text=raw, bounds=[round(x, 3) for x in bounds]))
            start += len(line)
        pages.append(dict(page=n, text=text))
        layout.append(dict(page=n, lines=sorted(lines, key=lambda l: (-l['bounds'][3], l['bounds'][0]))))
    save(ROOT/'programme.pages.json', pages)
    save(ROOT/'programme.layout.json', layout)
    meta = json.loads((ROOT/'programme.meta.json').read_text(encoding='utf-8'))
    meta.update(extractionMethod='pypdfium2 get_text_range; line bounds; descending top coordinate, then left', extractionVersion=pdfium.PYPDFIUM_INFO.version)
    for name, key in [('programme.pages.json', 'extractionSha256'), ('programme.layout.json', 'layoutSha256')]:
        meta[key] = hashlib.sha256((ROOT/name).read_bytes()).hexdigest()
    save(ROOT/'programme.meta.json', meta)


def body_lines(pages, layout):
    if [p['page'] for p in pages] != list(range(1, 52)) or [p['page'] for p in layout] != list(range(1, 52)):
        raise ValueError('Changed page sequence')
    result = []
    for page, position in zip(pages[1:50], layout[1:50]):
        raw = page['text'].splitlines()
        lines = position['lines']
        if sorted(l['index'] for l in lines) != [i for i, t in enumerate(raw) if t.strip()]:
            raise ValueError('Missing or repeated line')
        if lines != sorted(lines, key=lambda l: (-l['bounds'][3], l['bounds'][0])):
            raise ValueError('Changed reading order')
        for header in HEADERS:
            if sum(l['text'] == header for l in lines) != 1:
                raise ValueError('Changed header or footer')
        for l in lines:
            if raw[l['index']] != l['text'] or page['text'][l['start']:l['end']] != l['text']:
                raise ValueError('Changed line text or offset')
            if l['text'] not in HEADERS:
                result.append(dict(page=page['page'], **l))
    return result


def parse_pages(pages, layout):
    lines = body_lines(pages, layout)
    starts = [i for i, l in enumerate(lines) if re.match(r'^(\d+\.-|JUNTA (MUNICIPAL|VECINAL) )', l['text'])]
    if [(lines[i]['page'], lines[i]['index']) for i in starts] != STARTS:
        raise ValueError('Changed section boundaries')

    def block(id, topic, chunk):
        raw = '\n'.join(l['text'] for l in chunk)
        return dict(id=id, topic=topic, page=chunk[0]['page'], endPage=chunk[-1]['page'], rawText=raw, text=' '.join(raw.split()), fragments=chunk)

    contexts = [block('m-50297-context-intro', 'Introducción: balance previo y aspiraciones', lines[:starts[0]])]
    records = []
    for n, (a, b) in enumerate(zip(starts, starts[1:]+[len(lines)]), 1):
        topic = lines[a]['text']
        if n in CONTINUATIONS:
            if lines[a+1]['text'] != CONTINUATIONS[n]:
                raise ValueError('Changed heading continuation')
            topic += ' '+CONTINUATIONS[n]
        if n == 10:
            contexts.append(block('m-50297-context-barrios', 'Presentación y balance previo del capítulo 10', lines[a:b]))
            continue
        row = block(f'm-50297-{n}', topic, lines[a:b])
        row.update(officialId=f'Capítulo {n}' if n < 10 else topic, sourceId='zaragoza-programme', sourceNote='Unidad de inventario por capítulo o junta, no promesa única. Conserva introducciones, subapartados, condiciones, repeticiones y actuaciones de convenios anteriores. Los números internos de juntas son editoriales; no se suman como medidas nuevas las actuaciones repetidas entre capítulos y barrios.')
        records.append(row)
    return records, contexts


def build_inventory():
    meta = json.loads((ROOT/'programme.meta.json').read_text(encoding='utf-8'))
    for name, key in [('programme.pdf', 'sha256'), ('programme.pages.json', 'extractionSha256'), ('programme.layout.json', 'layoutSha256')]:
        if hashlib.sha256((ROOT/name).read_bytes()).hexdigest() != meta[key]:
            raise ValueError('Changed evidence: '+name)
    records, contexts = parse_pages(json.loads((ROOT/'programme.pages.json').read_text(encoding='utf-8')), json.loads((ROOT/'programme.layout.json').read_text(encoding='utf-8')))
    return dict(schemaVersion=1, jurisdictionId='m-50297', mandateId='m-50297-2023', mandateLabel='Zaragoza · mandato municipal 2023–2027', sourceId='zaragoza-programme', mandateSourceId='zaragoza-programme', registerSourceId='zaragoza-register', sourceLabel='Programa electoral de Natalia Chueca · 2023', sourceSha256=meta['sha256'], importedAt='2026-10-11', inventoryKind='programme-sections', transcriptionPending=True, transcriptionMethod='digital', inventoryTotal=len(records), scope='37 unidades documentales: nueve capítulos temáticos y 28 juntas municipales o vecinales del programa de 51 páginas. La introducción y la presentación del capítulo 10 se conservan como contexto. No son 37 promesas únicas ni 37 políticas completamente revisadas.', textNote='Municipio de Zaragoza, distinto del Gobierno de Aragón. El acta de 17/06/2023 (p. 9) acredita 15 votos a Natalia Chueca, 10 a Lola Ranera, 4 a Julio Calvo y 2 a Elena Tomás: fue proclamada por encabezar la lista más votada, sin mayoría absoluta de concejales. El programa procede de la web de la candidata. El orden digital de sus títulos no coincide siempre con el visual: se reordena por coordenadas conservando cada línea original. Las páginas 2–5 mezclan balance anterior y aspiraciones; el preámbulo del capítulo 10 se conserva aparte. Las juntas rurales incluyen remanentes pendientes y convenios 2021–2024, que no se convierten en nuevas promesas de 2023. Se mantienen duplicados y condiciones. Portada y contraportada no se cuentan; la contraportada es gráfica. Cotejo íntegro, desagregación de medidas y revisión humana independiente pendientes.', contextBlocks=contexts, records=records)


if __name__ == '__main__':
    if '--extract' in sys.argv:
        extract()
    inventory = build_inventory()
    save(Path('data/mandate/zaragoza-inventory.json'), inventory)
    print('Zaragoza:', inventory['inventoryTotal'], 'unidades documentales')

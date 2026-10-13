"""Import physical bullet sections; summaries and narrative remain separate context."""
import hashlib
import json
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/rioja')
CHAPTERS = [(23, 'Buen gobierno'), (29, 'Administración, economía y empleo'), (43, 'Justicia e interior'),
    (49, 'Medio ambiente'), (63, 'Agricultura y desarrollo rural'), (75, 'Infraestructuras y municipios'),
    (91, 'Sanidad'), (107, 'Vivienda y políticas sociales'), (119, 'Mujer e igualdad'),
    (127, 'Educación y universidad'), (147, 'Cultura y turismo'), (155, 'Juventud'),
    (161, 'Deporte'), (167, 'Europa y acción exterior')]


def parse_pages(pages, raw):
    rows, contexts = [], []
    def context(page, topic):
        item = dict(id=f'r-17-context-{len(contexts)+1}', topic=topic, page=page, endPage=page, lines=[])
        contexts.append(item)
        return item
    for page in raw:
        if 9 <= page['page'] <= 19:
            item = context(page['page'], 'Introducción y resumen inicial · texto de los autores')
            item['lines'] = [page['text']]
    current = None
    previous_heading = False
    chapter = ''
    for page in pages:
        number = page['page']
        if number in dict(CHAPTERS):
            chapter = dict(CHAPTERS)[number]
            current = context(number, chapter+' · introducción de los autores')
        if page.get('quotes'):
            quote = context(number, chapter+' · cita destacada de los autores')
            quote['lines'] = [s['text'] for s in page['quotes']]
        for span in page['spans']:
            text = span['text']
            if 'AkzidenzGrotesk' in span['font']:
                if not previous_heading:
                    current = context(number, chapter+' · epígrafe y contexto')
                current['lines'].append(text)
            elif text.startswith('•'):
                ordinal = len(rows)+1
                current = dict(id=f'r-17-{ordinal}', officialId=f'Sin número · {ordinal}', topic=chapter,
                    page=number, endPage=number, sourceId='rioja-programme', lines=[text[1:].lstrip()],
                    sourceNote='Orden editorial de los apartados con viñeta. Incluye objetivos y medidas; las sublistas con guion permanecen en su apartado. No representa promesas únicas ni acciones atómicas.')
                rows.append(current)
            else:
                if current is None:
                    raise ValueError('Orphan content')
                current['lines'].append(text)
            current['endPage'] = number
            previous_heading = 'AkzidenzGrotesk' in span['font']
    if len(rows) != 949:
        raise ValueError('Expected 949 bullet sections')
    for item in rows+contexts:
        item['rawText'] = '\n'.join(item.pop('lines'))
        item['text'] = ' '.join(item['rawText'].split())
    return rows, [c for c in contexts if c['text']]


def build_inventory():
    meta = json.loads((ROOT/'programme.meta.json').read_text(encoding='utf-8'))
    for filename, key in [('programme.pdf', 'sha256'), ('programme.pages.json', 'extractionSha256'), ('programme.ordered.json', 'orderedSha256')]:
        if hashlib.sha256((ROOT/filename).read_bytes()).hexdigest() != meta[key]:
            raise ValueError('Changed source or extraction: '+filename)
    pages = json.loads((ROOT/'programme.ordered.json').read_text(encoding='utf-8'))
    rows, contexts = parse_pages(pages, json.loads((ROOT/'programme.pages.json').read_text(encoding='utf-8')))
    return dict(schemaVersion=1, jurisdictionId='r-17', mandateId='r-17-2023', mandateLabel='La Rioja · mandato 2023–2027',
        sourceId='rioja-programme', mandateSourceId='rioja-programme', registerSourceId='rioja-programme-register',
        sourceLabel='Programa electoral del PP', sourceSha256=meta['sha256'], importedAt='2026-10-11',
        textLanguage='es', inventoryKind='bullet-sections', inventoryTotal=len(rows),
        scope='949 apartados con viñeta del cuerpo del programa autonómico del PP de 2023, distribuidos en 14 capítulos. Se incluyen objetivos estratégicos y medidas, con sus sublistas y continuaciones. Es un inventario documental de apartados, no un recuento de promesas únicas. El resumen de doce ejes de las páginas iniciales se conserva como contexto, sin contarlo otra vez.',
        textNote='Original de 172 páginas publicado por la candidatura de Gonzalo Capellán y presentado el 12/05/2023. Los localizadores usan páginas del PDF; en el cuerpo, la página impresa es doce unidades menor. La numeración de las fichas es editorial. Las introducciones y epígrafes se conservan como contexto atribuido a los autores; el texto intercalado entre viñetas permanece junto al apartado. Hay compromisos formulados en prosa y reiteraciones entre capítulos: falta su conciliación para obtener un inventario de promesas únicas. Se conserva el resumen inicial porque algunos detalles, como los beneficiarios de la deducción deportiva, no se repiten en el apartado desarrollado. Las valoraciones partidistas no se presentan como hechos comprobados.',
        contextBlocks=contexts, records=rows)


if __name__ == '__main__':
    result = build_inventory()
    Path('data/mandate/rioja-inventory.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print('La Rioja:', result['inventoryTotal'], 'bullet sections;', len(result['contextBlocks']), 'context blocks')

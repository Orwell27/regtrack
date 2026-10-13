"""Import numbered proposals, preserving the duplicate 388 and unnumbered context."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/melilla')
SOURCE = 'melilla-programme-2023'
CHAPTERS = [
    (9, 'I. Melilla conectada'), (11, 'II. Melilla más próspera'),
    (17, 'III. Melilla digital'), (24, 'IV. Melilla universitaria'),
    (28, 'V. Melilla turística'), (33, 'VI. Melilla y sus recintos fortificados'),
    (39, 'VII. Melilla cultural y patrimonial'), (50, 'VIII. Melilla formativa'),
    (56, 'IX. Melilla y el bienestar'), (68, 'X. Melilla joven'),
    (76, 'XI. Melilla es deporte'), (83, 'XII. Melilla verde'),
    (89, 'XIII. Melilla sostenible'), (101, 'XIV. Melilla urbana'),
    (113, 'XV. Melilla segura'), (117, 'XVI. Melilla mirando al norte'),
    (119, 'XVII. Melilla frontera europea'), (121, 'XVIII. Melilla administración cercana'),
]


def clean(text):
    # PDF discretionary word-break glyphs; original bytes and extraction retained.
    return ' '.join(re.sub(r'[\x02\ufffe]\s*', '', text).split())


def parse_pages(pages):
    if [p['page'] for p in pages] != list(range(1, 128)):
        raise ValueError('Expected all 127 PDF pages')
    if '2023 - 2027' not in pages[0]['text']:
        raise ValueError('Changed mandate period')
    records, contexts = [], []
    current, context = None, None
    topic = ''
    chapters = dict(CHAPTERS)
    for page in pages[8:125]:
        number = page['page']
        if number in chapters:
            topic = chapters[number]
            current, context = None, None
        if len(page['halves']) != 2:
            raise ValueError('Missing spread half')
        for half in page['halves']:
            for line in half.splitlines():
                if not line.strip(): continue
                if line.startswith('>'):
                    current, context = None, None
                marker = re.match(r'^(\d+)\s*\.(?!\d)\s*(.+)', line)
                if marker and number == 97 and marker[1] in ('5', '11', '13'):
                    if current is None or current['officialId'] != '606':
                        raise ValueError('Park list detached from proposal 606')
                    marker = None
                if marker:
                    current = dict(officialId=marker[1], topic=topic, page=number, endPage=number, lines=[marker[2]])
                    records.append(current)
                    context = None
                elif current is not None:
                    current['lines'].append(line)
                    current['endPage'] = number
                else:
                    if context is None:
                        context = dict(topic=topic, page=number, endPage=number, lines=[])
                        contexts.append(context)
                    context['lines'].append(line)
                    context['endPage'] = number
    expected = list(range(1, 391)) + [388] + list(range(391, 816))
    if [int(r['officialId']) for r in records] != expected:
        raise ValueError('Missing, reordered or silently corrected proposal')
    occurrences = {}
    for record in records:
        official = record['officialId']
        occurrences[official] = occurrences.get(official, 0) + 1
        record['id'] = f'r-19-{official}' + ('-bis' if occurrences[official] > 1 else '')
        record['rawText'] = '\n'.join(record.pop('lines'))
        record['text'] = clean(record['rawText'])
        record['sourceId'] = SOURCE
        if official == '388':
            record['sourceNote'] = 'El número 388 aparece dos veces en la página 130 impresa (página 66 del PDF): conciliación y protocolo contra la violencia de género. Se conservan ambas propuestas con identidades internas distintas, sin corregir la numeración del autor.'
    for index, context in enumerate(contexts, 1):
        context['id'] = f'r-19-context-{index}'
        context['rawText'] = '\n'.join(context.pop('lines'))
        context['text'] = clean(context['rawText'])
    return records, contexts


def build_inventory():
    meta = json.loads((ROOT/'programme.meta.json').read_text(encoding='utf-8'))
    original = (ROOT/'programme.pdf').read_bytes()
    extraction = (ROOT/'programme.columns.json').read_bytes()
    if hashlib.sha256(original).hexdigest() != meta['sha256'] or len(original) != meta['bytes']:
        raise ValueError('Changed original programme')
    if hashlib.sha256(extraction).hexdigest() != meta['extractionSha256']:
        raise ValueError('Changed column extraction')
    parsed = json.loads(extraction)
    if parsed['sourceSha256'] != meta['sha256']:
        raise ValueError('Extraction detached from original')
    records, contexts = parse_pages(parsed['pages'])
    return dict(schemaVersion=1, jurisdictionId='r-19', mandateId='r-19-2023',
        mandateLabel='Melilla · mandato 2023–2027', sourceId=SOURCE, mandateSourceId=SOURCE,
        sourceLabel='Programa de gobierno del PP 2023–2027', registerSourceId='melilla-programme-register',
        sourceSha256=meta['sha256'], importedAt='2026-10-11', inventoryTotal=len(records),
        scope='Las 816 propuestas numeradas de los 18 capítulos del programa de gobierno del PP de Melilla 2023–2027, publicado por su autor. La secuencia llega a 815, pero repite el número 388 con dos propuestas diferentes. Las introducciones y otros textos sin número se conservan aparte, sin convertirlos en promesas adicionales ni en resultados comprobados.',
        textNote='El archivo tiene 127 páginas PDF, muchas con dos páginas impresas: los enlaces usan la página PDF. Se leen primero la mitad izquierda y después la derecha, conservando continuaciones y subapartados. Se normalizan espacios y cortes de palabra del PDF; el original y la extracción se conservan. La portada identifica 2023–2027; la fecha de carga del archivo en el registro web, 31 de julio de 2025, no fecha cada promesa ni su ejecución. El número 388 se conserva duplicado. Las introducciones aportan condiciones y contexto; el texto partidista se atribuye a su autor. No todas las actuaciones dependen solo de la Ciudad: las competencias y colaboraciones se examinan por ficha.',
        records=records, contextBlocks=contexts)


if __name__ == '__main__':
    data = build_inventory()
    Path('data/mandate/melilla-inventory.json').write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print(f"Melilla: {len(data['records'])} numbered proposals; {len(data['contextBlocks'])} context blocks")

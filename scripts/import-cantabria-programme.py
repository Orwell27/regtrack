"""Import the author's numbered series, retaining unnumbered prose as attributed context."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/cantabria')


def parse_pages(pages, raw):
    rows, contexts = [], []
    chapter = ''
    chapter_titles = {}
    current = None
    heading = False
    previous_position = None
    def context(page):
        item = dict(id=f'r-06-context-{len(contexts)+1}', topic=chapter, page=page, endPage=page, parts=[])
        contexts.append(item)
        return item
    for page in raw:
        if page['page'] <= 6:
            item = context(page['page'])
            item['topic'] = 'Presentación e índice · texto de los autores'
            item['parts'] = [page['text']]
    for page in pages:
        number = page['page']
        for span in page['spans']:
            text, size = span['text'], span['size']
            position = (number, span['y'])
            if current is not None and previous_position != position:
                current['parts'].append('\n')
            previous_position = position
            if size == 48:
                chapter = text.strip()
                chapter_titles[chapter] = []
            if size in (14, 18, 48, 84.05):
                if not heading or size == 48:
                    current = context(number)
                if size == 18:
                    chapter_titles[chapter].append(text.strip())
                current['parts'].append(text+'\n')
            elif size == 8.5:
                match = re.match(r'([\d ]+)\.\s*', text)
                if not match or int(match[1].replace(' ', '')) != len(rows)+1:
                    raise ValueError(f'Broken official sequence on page {number}: {text!r}')
                ordinal = len(rows)+1
                current = dict(id=f'r-06-{ordinal}', officialId=str(ordinal), topic=chapter,
                    page=number, endPage=number, sourceId='cantabria-programme', parts=[text[match.end():]])
                rows.append(current)
            else:
                if current is None:
                    raise ValueError('Orphan body text')
                current['parts'].append(text)
            current['endPage'] = number
            heading = size in (14, 18, 48, 84.05)
    if len(rows) != 1228 or len(chapter_titles) != 20:
        raise ValueError('Expected 1228 numbered measures in 20 chapters')
    for item in rows+contexts:
        item['rawText'] = ''.join(item.pop('parts'))
        # Join line-end discretionary hyphens only. The terminal hyphen in 978 remains.
        cleaned = re.sub(r'(?<=\w)\s*-\s*\n\s*(?=\w)', '', item['rawText'])
        # Two adjacent runs omit a visual word-space; do not split genuine intra-word font changes.
        cleaned = cleaned.replace('enCantabria', 'en Cantabria').replace('Jovencon', 'Joven con')
        item['text'] = ' '.join(cleaned.split())
        if item['topic'] in chapter_titles:
            item['topic'] += ' · '+' '.join(chapter_titles[item['topic']])
    return rows, [c for c in contexts if c['text']]


def build_inventory():
    meta = json.loads((ROOT/'programme.meta.json').read_text(encoding='utf-8'))
    for filename, key in [('programme.pdf', 'sha256'), ('programme.pages.json', 'extractionSha256'), ('programme.ordered.json', 'orderedSha256')]:
        if hashlib.sha256((ROOT/filename).read_bytes()).hexdigest() != meta[key]:
            raise ValueError('Changed source or extraction: '+filename)
    rows, contexts = parse_pages(json.loads((ROOT/'programme.ordered.json').read_text(encoding='utf-8')),
        json.loads((ROOT/'programme.pages.json').read_text(encoding='utf-8')))
    return dict(schemaVersion=1, jurisdictionId='r-06', mandateId='r-06-2023', mandateLabel='Cantabria · mandato 2023–2027',
        sourceId='cantabria-programme', mandateSourceId='cantabria-programme', registerSourceId='cantabria-programme-register',
        sourceLabel='Programa electoral del PP', sourceSha256=meta['sha256'], importedAt='2026-10-11', textLanguage='es',
        inventoryTotal=len(rows),
        scope='Las 1.228 medidas numeradas del programa autonómico del PP de 2023, distribuidas en 20 capítulos. Las sublistas pertenecen a su medida y las reiteraciones mantienen su número original. Este recuento documental no equivale a 1.228 acciones independientes ni a todo compromiso posterior del mandato.',
        textNote='Original de 202 páginas publicado por el PP de Cantabria y presentado el 5/05/2023. Los localizadores coinciden con la página impresa. Las introducciones, epígrafes y principios no numerados en la serie principal se conservan como contexto atribuido a los autores; el texto intercalado sin epígrafe permanece asociado a la medida anterior. Sus valoraciones partidistas no se presentan como hechos comprobados. Se recuperan por tipografía los 1.228 números, incluido el 979 que un extractor fusionaba con el final del 978. Programa electoral, acuerdo de investidura y acuerdos presupuestarios son documentos distintos; este inventario corresponde solo al programa electoral.',
        contextBlocks=contexts, records=rows)


if __name__ == '__main__':
    result = build_inventory()
    Path('data/mandate/cantabria-inventory.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print('Cantabria:', result['inventoryTotal'], 'numbered measures;', len(result['contextBlocks']), 'context blocks')

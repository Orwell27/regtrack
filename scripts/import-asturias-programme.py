"""Conserve the preagreement without presenting it as the final signed pact."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/asturias')
SOURCE = 'asturias-preagreement'
HEADERS = ['PREACUERDO DE GOBIERNO DE UNIDAD PROGRESISTA', 'FSA PSOE - Convocatoria por Asturies']
# The font's U maps to n in extracted text. Checked against rendered PDF pages.
CORRECTIONS = {'nn': 'Un', 'nniversal': 'Universal', 'SEKnENS': 'SEKUENS', 'nrbana': 'Urbana', 'AnRA': 'AURA'}


def body_lines(page):
    lines = [line.strip() for line in page['text'].splitlines() if line.strip()]
    prefix = [str(page['page']), *HEADERS] if page['page'] == 1 else [*HEADERS, str(page['page'])]
    if lines[:3] != prefix:
        raise ValueError('Changed page header')
    return lines[3:]


def display_text(raw):
    text = ' '.join(raw.split())
    return re.sub(r'\b(?:nniversal|SEKnENS|nrbana|AnRA|nn)\b', lambda match: CORRECTIONS[match[0]], text)


def parse_pages(pages):
    if [p['page'] for p in pages] != list(range(1, 15)):
        raise ValueError('Expected fourteen ordered pages')
    rows = []
    current = dict(id='r-03-context-intro', topic='Introducción de los autores', page=1, endPage=1, lines=[])
    contexts = [current]
    for page in pages:
        for line in body_lines(page):
            bullet = line.startswith('\uf0b7 ')
            closing = line.startswith('Las fuerzas políticas que suscriben este acuerdo de gobierno nombrarán una')
            if bullet or closing:
                ordinal = len(rows) + 1
                current = dict(id=f'r-03-{ordinal}', officialId=f'Sin número · {ordinal}',
                    topic='Seguimiento y cooperación' if closing else 'Apartados del preacuerdo',
                    page=page['page'], endPage=page['page'], lines=[line[2:] if bullet else line],
                    sourceId=SOURCE, sourceNote='Orden editorial para localizar el apartado. El documento no numera sus medidas y se titula preacuerdo; falta cotejarlo con el texto final firmado.')
                rows.append(current)
            else:
                current['lines'].append(line)
                current['endPage'] = page['page']
    if len(rows) != 37 or rows[-1]['topic'] != 'Seguimiento y cooperación':
        raise ValueError('Expected 36 bullets and a separate closing clause')
    for item in rows+contexts:
        raw = '\n'.join(item.pop('lines'))
        item.update(rawText=raw, text=display_text(raw))
    if 'ocho personas' not in rows[-1]['text'] or 'forma semestral' not in rows[-1]['text'] or not rows[-1]['text'].endswith('consecución de los objetivos acordados.'):
        raise ValueError('Missing closing conditions')
    return rows, contexts


def build_inventory():
    meta = json.loads((ROOT/'preagreement.meta.json').read_text(encoding='utf-8'))
    data = (ROOT/'preagreement.pdf').read_bytes()
    extraction = (ROOT/'preagreement.pages.json').read_bytes()
    if len(data) != meta['bytes'] or hashlib.sha256(data).hexdigest() != meta['sha256']:
        raise ValueError('Changed source PDF')
    if hashlib.sha256(extraction).hexdigest() != meta['extractionSha256']:
        raise ValueError('Changed extraction')
    rows, contexts = parse_pages(json.loads(extraction))
    return dict(schemaVersion=1, jurisdictionId='r-03', mandateId='r-03-2023',
        mandateLabel='Asturias · mandato 2023–2027 · preacuerdo pendiente de cotejo final',
        sourceId=SOURCE, mandateSourceId=SOURCE, registerSourceId='asturias-documents-register',
        sourceLabel='Preacuerdo publicado por IU', sourceSha256=meta['sha256'], importedAt='2026-10-11',
        textLanguage='es', inventoryKind='preagreement', inventoryTotal=len(rows),
        scope='Los 36 apartados con viñeta y la cláusula final de seguimiento y cooperación del preacuerdo FSA–PSOE y Convocatoria por Asturies publicado por IU. Son 37 apartados, con varias acciones en algunos de ellos; no un recuento de todas las promesas ni un inventario confirmado del pacto final.',
        textNote='La comunicación oficial de 29/07/2023 confirma la ratificación socialista del 26 y la firma pública del 28 de julio, pero no permite comprobar la identidad entre el texto firmado y este preacuerdo. No se asigna al PDF una fecha de firma ni se le atribuyen firmas que no contiene. La numeración es editorial. Se conservan íntegramente las catorce páginas, las continuaciones y la cláusula de seguimiento semestral por ocho personas. El texto extraído conserva en bruto un error de codificación de la U; tras cotejo visual, la presentación corrige únicamente Un, Universal, SEKUENS, Urbana y AURA. Las valoraciones políticas de la introducción corresponden a sus autores.',
        contextBlocks=contexts, records=rows)


if __name__ == '__main__':
    result = build_inventory()
    Path('data/mandate/asturias-inventory.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print('Asturias: 36 bullets, one closing clause, one introduction; final pact unverified')

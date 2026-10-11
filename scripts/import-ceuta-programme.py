"""Import all 138 numbered measures of the explicitly non-exhaustive initial programme."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/ceuta')
SOURCE = 'ceuta-initial-programme-2023'
DEPARTMENTS = [
    ('PC', 'Presidencia de la Ciudad', 3, 3, 7),
    ('F', 'Fomento, Medio Ambiente y Servicios Urbanos', 5, 8, 35),
    ('H', 'Hacienda, Transición Económica y Transformación Digital', 10, 11, 14),
    ('E', 'Educación, Cultura, Juventud y Deporte', 13, 15, 19),
    ('P', 'Presidencia y Gobernación', 17, 18, 21),
    ('S', 'Sanidad y Servicios Sociales', 20, 22, 20),
    ('C', 'Comercio, Turismo y Empleo', 24, 26, 22),
]
HEADINGS = {
    'Urbanismo', 'Obras y barriadas', 'Vivienda', 'Medio Ambiente y Servicios Urbanos',
    'Transporte y Movilidad', 'Hacienda', 'Transición Económica y Transformación Digital',
    'Educación', 'Cultura', 'Juventud', 'Deporte', 'Presidencia',
    'Recursos Humanos y Administración Pública', 'Gobernación', 'Menores', 'Sanidad',
    'Cementerios', 'Mataderos', 'Servicios Sociales', 'Comercio', 'Hostelería',
    'Turismo', 'Empleo', 'Mercados',
}


def body(page):
    lines = page['text'].strip().splitlines()
    if not lines or lines[0].strip() != str(page['page']):
        raise ValueError('Missing page marker')
    return [line.strip() for line in lines[1:] if line.strip()]


def parse_pages(pages):
    if [p['page'] for p in pages] != list(range(1, 30)):
        raise ValueError('Expected all 29 ordered pages')
    cover = ' '.join(pages[0]['text'].split())
    if '1 de julio y el 31 de octubre de 2023' not in cover:
        raise ValueError('Changed initial programme period')
    notes = ' '.join(body(pages[28]))
    if 'no tiene carácter exhaustivo' not in notes or 'incorporación al proyecto de Presupuesto para 2024' not in notes:
        raise ValueError('Programme conditions missing')
    records = []
    for code, department, start, end, count in DEPARTMENTS:
        current = None
        section = department
        rows = []
        for page in pages[start-1:end]:
            for line in body(page):
                if line in HEADINGS:
                    section = line
                    current = None
                    continue
                marker = re.match(r'^(\d+)\.\s+(.+)', line)
                if marker:
                    current = dict(officialId=marker[1], topic=department if section == department else f'{department} · {section}',
                        section=section, page=page['page'], endPage=page['page'], lines=[marker[2]])
                    rows.append(current)
                elif current is not None:
                    current['lines'].append(line)
                    current['endPage'] = page['page']
                else:
                    raise ValueError('Unidentified text before objective: '+line)
        expected = list(range(1, count+1)) if code != 'F' else list(range(1, 28))+list(range(26, 34))
        if [int(row['officialId']) for row in rows] != expected:
            raise ValueError('Missing, duplicated or reordered programme measures')
        for ordinal, row in enumerate(rows, 1):
            text = '\n'.join(row.pop('lines'))
            row.update(id=f'r-18-{code}-{ordinal}', text=' '.join(text.split()), rawText=text, sourceId=SOURCE)
            if code == 'F' and row['officialId'] in ('26', '27'):
                row['sourceNote'] = f'El número {row["officialId"]} se repite en el original de Fomento, en Medio Ambiente y Servicios Urbanos y en Transporte y Movilidad. Esta ficha corresponde a {row["section"]}; se conservan las dos medidas con identidades internas distintas.'
            row.pop('section')
            records.append(row)
    # The annex is explicitly incorporated by Fomento measure 7. Its five phases
    # are nested here, not counted as additional independent promises.
    phases = []
    current = None
    for page in pages[26:28]:
        for line in body(page):
            if line in ('Anexo', 'Hitos en obras para los próximos meses'):
                continue
            marker = re.match(r'^(\d+)\)\s+(.+)', line)
            if marker:
                current = dict(officialId=marker[1], page=page['page'], endPage=page['page'], lines=[marker[2]])
                phases.append(current)
            elif current is not None:
                current['lines'].append(line)
                current['endPage'] = page['page']
            else:
                raise ValueError('Unidentified annex text')
    if [p['officialId'] for p in phases] != ['1', '2', '3', '4', '5']:
        raise ValueError('Incomplete annex phases')
    for phase in phases:
        text = '\n'.join(phase.pop('lines'))
        phase.update(text=text, rawText=text)
    annex_record = next(r for r in records if r['id'] == 'r-18-F-7')
    annex_record.update(initiatives=phases, endPage=28,
                        sourceNote='La medida figura en la página 5 y remite al anexo de las páginas 27–28. Se conservan sus cinco fases, que no se cuentan como medidas adicionales.')
    if len(records) != 138:
        raise ValueError('Incomplete initial programme')
    return records, notes


def build_inventory():
    meta = json.loads((ROOT/'programme.meta.json').read_text(encoding='utf-8'))
    original = (ROOT/'programme.pdf').read_bytes()
    extraction = (ROOT/'programme.pages.json').read_bytes()
    if hashlib.sha256(original).hexdigest() != meta['sha256'] or len(original) != meta['bytes']:
        raise ValueError('Changed original programme')
    if hashlib.sha256(extraction).hexdigest() != meta['extractionSha256']:
        raise ValueError('Changed extraction')
    records, notes = parse_pages(json.loads(extraction))
    return dict(schemaVersion=1, jurisdictionId='r-18', mandateId='r-18-2023',
        mandateLabel='Ceuta · mandato 2023–2027 · programa inicial julio–octubre de 2023',
        sourceId=SOURCE, mandateSourceId=SOURCE, sourceLabel='Programa inicial julio–octubre de 2023',
        sourceSha256=meta['sha256'], registerSourceId='ceuta-programme-register', importedAt='2026-10-11',
        inventoryKind='initial-programme', inventoryTotal=len(records),
        scope='Las 138 medidas numeradas de las siete áreas del documento de trabajo del Gobierno de Ceuta para el periodo del 1 de julio al 31 de octubre de 2023. La medida 7 de Fomento incorpora el anexo de obras, conservado dentro de esa ficha. Es un programa inicial expresamente no exhaustivo y modificable, no el inventario completo de promesas del mandato 2023–2027.',
        textNote='Se conservan los textos completos, las condiciones y las fases del anexo. La numeración 26 y 27 se repite en Fomento: son medidas distintas y no se eliminan. Las páginas corresponden al PDF de 29 páginas. La nota final de la página 29 dice: '+notes.rstrip('.')+'. Esa regla pertenece al Gobierno; una inclusión presupuestaria no se convierte en ejecución o resultado verificado por RegTrack. Siguen pendientes el inventario del mandato completo y las modificaciones posteriores.',
        records=records)


if __name__ == '__main__':
    inventory = build_inventory()
    Path('data/mandate/ceuta-inventory.json').write_text(json.dumps(inventory, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print('Ceuta: 138 initial measures, five annex phases and final conditions preserved')

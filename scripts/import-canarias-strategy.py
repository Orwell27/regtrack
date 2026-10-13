"""Import the published plan, preserving printed identifiers and source anomalies.

The 2024 administrative plan is not the universe of political promises of 2023.
PDF column extraction is separate so these checks need only the standard library.
"""
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/canarias')
SOURCE = 'canarias-strategic-plan-2024'
DEPARTMENTS = {
    'PG': ('Presidencia del Gobierno', 8, 22),
    'EICA': ('Economía, Industria, Comercio y Autónomos', 13, 47),
    'OPVM': ('Obras Públicas, Vivienda y Movilidad', 5, 33),
    'HRUE': ('Hacienda y Relaciones con la Unión Europea', 15, 65),
    'PAPJS': ('Presidencia, Administraciones Públicas, Justicia y Seguridad', 7, 49),
    'EFPAFD': ('Educación, Formación Profesional, Actividad Física y Deportes', 25, 112),
    'PTCTA': ('Política Territorial, Cohesión Territorial y Aguas', 7, 26),
    'TE': ('Turismo y Empleo', 14, 169),
    'UCIC': ('Universidades, Ciencia e Innovación y Cultura', 10, 30),
    'TEE': ('Transición Ecológica y Energía', 10, 56),
    'BSIJIF': ('Bienestar Social, Igualdad, Juventud, Infancia y Familias', 4, 100),
    'S': ('Sanidad', 17, 19),
    'AGPSA': ('Agricultura, Ganadería, Pesca y Soberanía Alimentaria', 10, 60),
}
PATTERNS = {
    'strategic': re.compile(r'([A-Z]{1,8})\.\s*OEst\.\s*(\d+)\.?\s'),
    'specific': re.compile(r'([A-Z]{1,8})\.\s*OEsp\.\s*(\d+)\.(\d+)\.?\s'),
}


def column_records(pages, column):
    stream = ''
    ranges = []
    for page in pages:
        if column not in page:
            continue
        text = page[column].strip()
        ranges.append((len(stream), len(stream) + len(text), page['page']))
        stream += text + '\n'
    matches = list(PATTERNS[column].finditer(stream))
    if not matches or stream[:matches[0].start()].strip():
        raise ValueError('Unidentified column prelude')
    result = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(stream)
        raw = stream[match.end():end].strip()
        if not raw or re.search(r'OEst\.|OEsp\.', raw):
            raise ValueError('Empty or contaminated objective')
        # Ignore page whitespace, but retain hyphens and the original wording.
        last_character = match.end() + len(stream[match.end():end].rstrip()) - 1
        covered = [number for start, stop, number in ranges if start <= last_character and stop > match.start()]
        result.append(dict(parts=match.groups(), text=' '.join(raw.split()), rawText=raw,
                           page=min(covered), endPage=max(covered)))
    return result


def parse_pages(pages):
    if [p['page'] for p in pages] != list(range(1, 64)):
        raise ValueError('Expected all 63 ordered pages')
    if [p['page'] for p in pages if 'strategic' in p] != [n for n in range(8, 64) if n not in (16, 50)]:
        raise ValueError('Incomplete plan tables')
    strategic = column_records(pages, 'strategic')
    specific = column_records(pages, 'specific')
    expected_parents = [(code, str(n)) for code, (_, count, _) in DEPARTMENTS.items() for n in range(1, count + 1)]
    if [row['parts'] for row in strategic] != expected_parents:
        raise ValueError('Strategic objectives missing, duplicated or reordered')
    if Counter(row['parts'][0] for row in specific) != Counter({key: value[2] for key, value in DEPARTMENTS.items()}):
        raise ValueError('Specific objective count changed')
    codes = Counter(row['parts'] for row in specific)
    if {key: count for key, count in codes.items() if count > 1} != {('BSIJIF', '3', '2'): 2}:
        raise ValueError('Unexpected duplicate or corrected original identifier')
    by_parent = {row['parts']: [] for row in strategic}
    for row in specific:
        parent = row['parts'][:2]
        if parent not in by_parent:
            raise ValueError('Orphan specific objective')
        by_parent[parent].append(row)
    result = []
    for row in strategic:
        code, number = row.pop('parts')
        children = by_parent[(code, number)]
        sequence = [int(child['parts'][2]) for child in children]
        unique = set(sequence)
        missing = set(range(1, max(unique, default=0) + 1)) - unique
        if not children or missing != ({6} if (code, number) == ('OPVM', '4') else set()):
            raise ValueError('Unexpected numbering gap')
        expected = sorted(unique)
        if (code, number) == ('BSIJIF', '3'):
            expected.insert(expected.index(23), 2)  # The page 55 original repeats 3.2 after 3.22.
        if sequence != expected:
            raise ValueError('Specific objectives reordered')
        official_id = f'{code}.OEst.{number}'
        record = dict(row, id=f'r-05-{official_id}', officialId=official_id,
                      topic=DEPARTMENTS[code][0], sourceId=SOURCE, initiatives=[])
        for ordinal, child in enumerate(children, 1):
            parts = child.pop('parts')
            child.update(id=f'{record["id"]}-specific-{ordinal}', officialId=f'{code}.OEsp.{number}.{parts[2]}')
            if parts == ('BSIJIF', '3', '2'):
                child['sourceNote'] = 'El original repite BSIJIF.OEsp.3.2 en las páginas 54 y 55 con textos distintos. Se conservan ambos; no se corrige ni se deduplica el código oficial.'
            record['initiatives'].append(child)
        record['page'] = min(record['page'], *(c['page'] for c in children))
        record['endPage'] = max(record['endPage'], *(c['endPage'] for c in children))
        result.append(record)
    return result


def build_inventory():
    meta = json.loads((ROOT/'strategy.meta.json').read_text(encoding='utf-8'))
    original = (ROOT/'strategy.pdf').read_bytes()
    extraction = (ROOT/'strategy.columns.json').read_bytes()
    extracted = json.loads(extraction)
    if hashlib.sha256(original).hexdigest() != meta['sha256'] or len(original) != meta['bytes']:
        raise ValueError('Changed original plan')
    if extracted['sourceSha256'] != meta['sha256'] or hashlib.sha256(extraction).hexdigest() != meta['extractionSha256']:
        raise ValueError('Changed extraction')
    records = parse_pages(extracted['pages'])
    return dict(schemaVersion=1, jurisdictionId='r-05', mandateId='r-05-2023',
        mandateLabel='Canarias · XI legislatura 2023–2027 · plan 2024–2027', sourceId=SOURCE,
        mandateSourceId='canarias-agreement-cc-pp', sourceLabel='Plan estratégico 2024–2027',
        sourceSha256=meta['sha256'], registerSourceId='canarias-plan-register', importedAt='2026-10-11',
        inventoryKind='strategic-plan', inventoryTotal=len(records),
        scope='Los 145 objetivos estratégicos y 788 objetivos específicos de los 13 departamentos del PEGobCan 2024–2027, aprobado el 26 de diciembre de 2024. Los objetivos específicos se conservan dentro de sus objetivos estratégicos y no se cuentan como promesas adicionales. Este plan administrativo no constituye el inventario completo de las promesas políticas de 2023: su correspondencia con los acuerdos CC–PP, AHI y ASG sigue pendiente.',
        textNote='Texto íntegro de las dos columnas de objetivos, con espacios normalizados. Se conserva el código BSIJIF.OEsp.3.2 repetido en las páginas 54 y 55 y la ausencia de OPVM.OEsp.4.6; no se inventan objetivos para completar la numeración. La asociación entre el objetivo S.OEst.1 (decisiones sanitarias anticipadas) y S.OEsp.1.1 (espera máxima) figura así en el original y requiere aclaración. Las páginas corresponden al PDF de 63 páginas. Esta versión publicada en 2024 no acredita las modificaciones posteriores, la ejecución ni los resultados.',
        records=records)


if __name__ == '__main__':
    inventory = build_inventory()
    Path('data/mandate/canarias-inventory.json').write_text(json.dumps(inventory, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print('Canarias: 145 strategic and 788 specific objectives; original anomalies preserved')

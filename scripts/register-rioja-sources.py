"""Validate every saved source, retaining editorial-note and origin distinctions."""
import hashlib
import json
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/rioja')
SOURCES = [
    ('programme.pdf', 'programme', 'Programa electoral autonómico del PP · La Rioja 2023', 'Candidatura de Gonzalo Capellán · Partido Popular', 'pp-rioja', 'programme', None),
    ('programme-register.html', 'programme-register', 'Presentación del programa electoral · 12/05/2023', 'Candidatura de Gonzalo Capellán · Partido Popular', 'pp-rioja', 'register', '2023-05-12'),
    ('programme-portal.html', 'programme-portal', 'Portal del programa Buen Gobierno', 'Candidatura de Gonzalo Capellán · Partido Popular', 'pp-rioja', 'register', None),
    ('sports-law-2023.html', 'sports-law-2023', 'Ley 11/2023 · creación de la deducción deportiva', 'Comunidad Autónoma de La Rioja · publicación en el BOE', 'gob-rioja', 'action', '2023-11-24'),
    ('sports-law-2024.html', 'sports-law-2024', 'Ley 13/2023 · modificación del alcance personal de la deducción', 'Comunidad Autónoma de La Rioja · publicación en el BOE', 'gob-rioja', 'action', '2024-01-31'),
    ('sports-guide-2025.html', 'sports-guide-2025', 'AEAT · deducción deportiva de La Rioja, ejercicio 2025', 'Agencia Estatal de Administración Tributaria', 'aeat', 'action', None),
    ('sports-statistics-total-2023.html', 'sports-statistics-total-2023', 'AEAT · deducciones autonómicas de La Rioja, ejercicio 2023 · total', 'Agencia Estatal de Administración Tributaria', 'aeat', 'government-report', None),
    ('sports-statistics-individual-2023.html', 'sports-statistics-individual-2023', 'AEAT · deducciones de La Rioja 2023 · declaraciones individuales', 'Agencia Estatal de Administración Tributaria', 'aeat', 'government-report', None),
    ('sports-statistics-joint-2023.html', 'sports-statistics-joint-2023', 'AEAT · deducciones de La Rioja 2023 · declaraciones conjuntas', 'Agencia Estatal de Administración Tributaria', 'aeat', 'government-report', None),
    ('sports-statistics-methodology.pdf', 'sports-statistics-methodology', 'AEAT · metodología de la estadística de declarantes del IRPF 2023', 'Agencia Estatal de Administración Tributaria', 'aeat', 'register', None),
    ('sports-government-2024.txt', 'sports-government-2024', 'Gobierno de La Rioja · balance de la deducción deportiva de Renta 2023', 'Gobierno de La Rioja', 'gob-rioja', 'government-report', '2024-09-18'),
    ('medicine-documents.html', 'medicine-documents', 'Universidad de La Rioja · registro de documentación oficial de Medicina', 'Universidad de La Rioja', 'universidad-rioja', 'register', None),
    ('medicine-courses-2026.html', 'medicine-courses-2026', 'Universidad de La Rioja · asignaturas y guías de Medicina 2026–2027', 'Universidad de La Rioja', 'universidad-rioja', 'action', None),
    ('medicine-opening-2026.html', 'medicine-opening-2026', 'Universidad de La Rioja · apertura del curso 2026–2027', 'Universidad de La Rioja', 'universidad-rioja', 'government-report', '2026-09-16'),
    ('medicine-aneca-register.html', 'medicine-aneca-register', 'ANECA · registro de informes de verificación de grados y másteres', 'Agencia Nacional de Evaluación de la Calidad y Acreditación', 'aneca', 'control', None),
]


def build_sources():
    result = []
    for filename, suffix, title, publisher, family, role, date in SOURCES:
        path = ROOT/filename
        meta = json.loads(path.with_suffix('.meta.json').read_text(encoding='utf-8'))
        data = path.read_bytes()
        if meta['snapshotPath'] != path.as_posix() or len(data) != meta['bytes'] or hashlib.sha256(data).hexdigest() != meta['sha256']:
            raise ValueError('Changed evidence: '+filename)
        if path.suffix == '.pdf' and not data.startswith(b'%PDF-'):
            raise ValueError('Invalid PDF: '+filename)
        result.append(dict(meta, id='rioja-'+suffix, jurisdictionId='r-17', title=title, publisher=publisher,
            family=family, role=role, publicationDate=date,
            captureType='extracto_editorial' if path.suffix == '.txt' else 'bytes_originales'))
    return result


if __name__ == '__main__':
    path = ROOT.parent/'sources.json'
    sources = json.loads(path.read_text(encoding='utf-8'))
    existing = {s['id']: s for s in sources}
    for source in build_sources():
        if source['id'] in existing and existing[source['id']] != source:
            raise ValueError('Changed registered source')
        if source['id'] not in existing:
            sources.append(source)
    path.write_text(json.dumps(sources, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print('La Rioja: fifteen references, five source families, one editorial capture')

"""Source authorship, document dates and captured bytes are separate facts."""
import hashlib
import json
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/galicia')
SOURCES = [
    ('programme.pdf', 'Programa de Gobierno PPdeG 2024–2028 · original en castellano', 'PPdeG', 'pp-galicia', 'programme', None),
    ('programme-register.txt', 'Registro oficial del programa 2024–2028 · nota editorial', 'PPdeG', 'pp-galicia', 'register', None),
    ('appointment.html', 'Real Decreto 380/2024 · nombramiento del presidente', 'Presidencia del Gobierno · BOE', 'gob-espana', 'register', '2024-04-12'),
    ('party-balance.txt', 'Balance del PPdeG: 87 % cumplido o en marcha · nota editorial', 'PPdeG', 'pp-galicia', 'reporting', '2026-05-16'),
    ('housing-pact.pdf', 'II Pacto de Vivenda de Galicia 2026–2030 · documento del IGVS', 'Xunta de Galicia · IGVS', 'gob-galicia', 'action', None),
    ('housing-pact-register.html', 'Firma del II Pacto y objetivos de 2028 y 2030', 'Xunta de Galicia', 'gob-galicia', 'government-report', '2026-02-10'),
    ('housing-coafga.html', 'COAFGA confirma su participación en la firma del II Pacto', 'Colegio Oficial de Administradores de Fincas de Galicia', 'coafga', 'reporting', '2026-02-10'),
    ('housing-delivery.html', 'Entrega de 74 viviendas en Valdecorvos y estado de las promociones', 'Xunta de Galicia · IGVS', 'gob-galicia', 'government-report', '2026-07-28'),
    ('opposition-balance.pdf', 'Balance del BNG · objeciones sobre anuncios, demanda y vivienda', 'BNG', 'bng-galicia', 'reporting', '2026-04-05'),
    ('university-law-2024.pdf', 'Decreto 164/2024 · primera bonificación; PDF del DOG alojado por la UDC', 'Xunta de Galicia · DOG, alojado por la UDC', 'gob-galicia', 'action', '2024-07-03'),
    ('university-launch.html', 'Anuncio de gratuidad de matrícula y aprobación del decreto', 'Xunta de Galicia', 'gob-galicia', 'government-report', '2024-06-24'),
    ('university-law-2025.html', 'Decreto 55/2025 · precios universitarios y bonificaciones 2025–2026', 'Xunta de Galicia · DOG', 'gob-galicia', 'action', '2025-07-09'),
    ('university-law-2026.pdf', 'Decreto 72/2026 · precios universitarios y bonificaciones 2026–2027', 'Xunta de Galicia · DOG', 'gob-galicia', 'action', '2026-07-09'),
    ('university-correction.html', 'Corrección del Decreto 72/2026 · referencia del artículo 13.2.f', 'Xunta de Galicia · DOG', 'gob-galicia', 'action', '2026-07-14'),
    ('university-udc.pdf', 'Resolución rectoral de 7/07/2026 · normativa de matrícula 2026–2027', 'Universidade da Coruña', 'udc', 'action', '2026-07-09'),
]


def build_sources():
    result = []
    for filename, title, publisher, family, role, date in SOURCES:
        path = ROOT/filename
        meta = json.loads(path.with_suffix('.meta.json').read_text(encoding='utf-8'))
        data = path.read_bytes()
        if meta['snapshotPath'] != path.as_posix() or len(data) != meta['bytes'] or hashlib.sha256(data).hexdigest() != meta['sha256']:
            raise ValueError('Changed evidence: '+filename)
        if path.suffix == '.pdf' and not data.startswith(b'%PDF-'):
            raise ValueError('Invalid PDF: '+filename)
        if 'extractionSha256' in meta and hashlib.sha256(path.with_suffix('.pages.json').read_bytes()).hexdigest() != meta['extractionSha256']:
            raise ValueError('Changed extraction: '+filename)
        result.append(dict(meta, id='galicia-'+path.stem, jurisdictionId='r-12', title=title,
            publisher=publisher, family=family, role=role, publicationDate=date,
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
    print('Galicia: 15 sources, six origin families; party claims and implementation are distinguished')

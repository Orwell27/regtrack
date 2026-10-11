"""Retain original bytes and distinguish the author of parliamentary answers from their host."""
import hashlib
import json
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/cantabria')
SOURCES = [
    ('programme.pdf', 'programme', 'Programa electoral autonómico del PP de Cantabria · 2023–2027', 'Partido Popular de Cantabria', 'pp-cantabria', 'programme', None),
    ('programme-register.html', 'programme-register', 'Presentación del programa de 1.228 medidas · 5/05/2023', 'Partido Popular de Cantabria', 'pp-cantabria', 'register', '2023-05-05'),
    ('investiture-register.html', 'investiture-register', 'Firma del acuerdo de investidura PP–PRC · 16/06/2023', 'Partido Popular de Cantabria', 'pp-cantabria', 'register', '2023-06-16'),
    ('quota-law.pdf', 'quota-law', 'Decreto 43/2024 · ayudas de Cuota Cero', 'Gobierno de Cantabria · BOC', 'gob-cantabria', 'action', '2024-06-21'),
    ('quota-procedure.pdf', 'quota-procedure', 'Sede de Cantabria · trámite de Cuota Cero', 'Gobierno de Cantabria', 'gob-cantabria', 'register', None),
    ('quota-response.pdf', 'quota-response', 'Respuesta del Gobierno al balance del Plan de Autónomos · BOPC 199', 'Gobierno de Cantabria · publicado por el Parlamento', 'gob-cantabria', 'government-report', '2025-03-25'),
    ('parliament-resolutions.pdf', 'parliament-resolutions', 'Resoluciones del debate del estado de la región · BOPC 231', 'Parlamento de Cantabria', 'parlamento-cantabria', 'control', '2025-07-01'),
    ('transport-law-2025.pdf', 'transport-law-2025', 'Decreto 40/2025 · descuento joven en transporte autonómico', 'Gobierno de Cantabria · BOC', 'gob-cantabria', 'action', '2025-06-27'),
    ('transport-law-2026.pdf', 'transport-law-2026', 'Decreto 48/2026 · transporte para menores de 31 años', 'Gobierno de Cantabria · BOC', 'gob-cantabria', 'action', '2026-06-30'),
    ('transport-card.txt', 'transport-card', 'Transporte de Cantabria · condiciones de la TITC · nota de lectura', 'Gobierno de Cantabria · Fundación CTL', 'gob-cantabria', 'register', None),
    ('transport-portal.txt', 'transport-portal', 'Transporte de Cantabria · aviso de perfiles y descuentos · nota de lectura', 'Gobierno de Cantabria · Fundación CTL', 'gob-cantabria', 'government-report', None),
    ('transport-torrelavega.pdf', 'transport-torrelavega', 'Torrelavega · bonificaciones del transporte urbano en 2026', 'Ayuntamiento de Torrelavega · BOC', 'ayto-torrelavega', 'action', '2026-01-07'),
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
        if 'extractionSha256' in meta and hashlib.sha256(path.with_suffix('.pages.json').read_bytes()).hexdigest() != meta['extractionSha256']:
            raise ValueError('Changed extraction: '+filename)
        result.append(dict(meta, id='cantabria-'+suffix, jurisdictionId='r-06', title=title, publisher=publisher,
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
    print('Cantabria: ten original sources, two editorial notes, four origin families')

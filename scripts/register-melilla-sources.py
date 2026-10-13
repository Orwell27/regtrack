"""Register original documents, with attribution to the producer of each source."""
import hashlib
import json
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/melilla')
SOURCES = [
    ('programme.pdf', 'melilla-programme-2023', 'Programa de gobierno del PP de Melilla 2023–2027', 'PP de Melilla', 'pp-melilla', 'programme', None),
    ('programme-register.json', 'melilla-programme-register', 'Registro público del archivo del programa · carga de 31/07/2025', 'PP de Melilla', 'pp-melilla', 'register', None),
    ('quality-register-2025.html', 'melilla-quality-register-2025', 'Registro de informes de calidad · Presidencia · ejercicio 2025', 'Ciudad Autónoma de Melilla', 'ciudad-melilla', 'register', None),
    ('quality-oiac-2025.pdf', 'melilla-quality-oiac-2025', 'Estudio de calidad de las oficinas de atención al ciudadano · 2025', 'Dirección General de Administración Pública de Melilla', 'ciudad-melilla', 'government-report', None),
    ('quality-charters-2025.pdf', 'melilla-quality-charters-2025', 'Evaluación global de compromisos de las cartas de servicios · 2025', 'Dirección General de Administración Pública de Melilla', 'ciudad-melilla', 'government-report', None),
    ('correos-start-2025.html', 'melilla-correos-start-2025', 'Anuncio de inicio de las obras del antiguo edificio de Correos', 'Ciudad Autónoma de Melilla', 'ciudad-melilla', 'government-report', '2025-01-20'),
    ('correos-ugr-report.pdf', 'melilla-correos-ugr-report', 'Informe de gestión 2023/24 · aprobado el 28/02/2025', 'Universidad de Granada · Facultad de Ciencias de la Educación y del Deporte de Melilla', 'ugr', 'reporting', None),
    ('correos-rtve-2026.html', 'melilla-correos-rtve-2026', 'Información de RNE sobre necesidades de espacio y retrasos de las obras universitarias', 'RTVE · RNE Melilla', 'rtve', 'reporting', '2026-09-16'),
    ('correos-tender-2024.pdf', 'melilla-correos-tender-2024', 'Convocatoria de la mesa de contratación de 13/11/2024 · expediente 211/2024/CMA', 'Ciudad Autónoma de Melilla · Plataforma de Contratación del Sector Público', 'ciudad-melilla', 'action', None),
]


def build_sources():
    result = []
    for filename, key, title, publisher, family, role, date in SOURCES:
        path = ROOT/filename
        meta = json.loads(path.with_suffix('.meta.json').read_text(encoding='utf-8'))
        data = path.read_bytes()
        if meta['snapshotPath'] != path.as_posix() or len(data) != meta['bytes'] or hashlib.sha256(data).hexdigest() != meta['sha256']:
            raise ValueError('Changed source original: '+filename)
        result.append(dict(meta, id=key, jurisdictionId='r-19', title=title, publisher=publisher,
            family=family, role=role, publicationDate=date, captureType='bytes_originales'))
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
    print('Melilla: nine original sources registered')

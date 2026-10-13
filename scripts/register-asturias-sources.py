"""Register source origin separately from its publisher/host."""
import hashlib
import json
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/asturias')
SOURCES = [
    ('preagreement.pdf', 'preagreement', 'Preacuerdo de gobierno FSA–PSOE y Convocatoria por Asturies', 'FSA–PSOE y Convocatoria por Asturies · archivo publicado por IU', 'pacto-fsa-convocatoria', 'programme', None),
    ('documents-register.html', 'documents-register', 'Repositorio de documentos de Izquierda Xunida', 'Izquierda Xunida', 'pacto-fsa-convocatoria', 'register', None),
    ('signature-register.html', 'signature-register', 'Formación del Gobierno y constancia de ratificación y firma del pacto', 'Gobierno del Principado de Asturias', 'gobierno-asturias', 'register', '2023-07-29'),
    ('concertation.pdf', 'concertation', 'Concertación Social Asturias 2024–2027 · documento de 285 páginas', 'Gobierno de Asturias, FADE, UGT y CCOO · archivo de SEKUENS', 'concertacion-asturias-firmantes', 'action', None),
    ('concertation-ccoo.pdf', 'concertation-ccoo', 'Concertación 2024–2027 · copia idéntica publicada por CCOO', 'Gobierno de Asturias, FADE, UGT y CCOO · archivo de CCOO', 'concertacion-asturias-firmantes', 'action', None),
    ('concertation-register.html', 'concertation-register', 'Registro de Concertación Social 2024–2027 en Transparencia', 'Gobierno del Principado de Asturias', 'gobierno-asturias', 'register', None),
    ('concertation-signature.html', 'concertation-signature', 'Firma del acuerdo de concertación de 19/09/2024', 'Gobierno del Principado de Asturias', 'gobierno-asturias', 'government-report', '2024-09-19'),
    ('schools-law.html', 'schools-law', 'Ley 5/2024 · Red Autonómica de Escuelas Infantiles', 'Principado de Asturias · publicación en el BOE', 'gobierno-asturias', 'action', '2024-12-02'),
    ('budget-law-2024.html', 'budget-law-2024', 'Ley 4/2023 · bonificación de precios públicos desde el curso 2024–2025', 'Principado de Asturias · publicación en el BOE', 'gobierno-asturias', 'action', '2024-01-31'),
    ('schools-admissions-2024.html', 'schools-admissions-2024', 'Admisión de la primera fase de Les Escuelines · junio de 2024', 'Consejería de Educación de Asturias', 'gobierno-asturias', 'government-report', '2024-06-06'),
    ('schools-opening-2024.html', 'schools-opening-2024', 'Anuncio de apertura de las cinco primeras escuelas autonómicas', 'Gobierno del Principado de Asturias', 'gobierno-asturias', 'government-report', '2024-08-29'),
    ('schools-extension-2026.html', 'schools-extension-2026', 'Extensión de Les Escuelines · situación y previsiones de septiembre de 2026', 'Consejería de Educación de Asturias', 'gobierno-asturias', 'government-report', '2026-09-04'),
    ('schools-gijon-2024.pdf', 'schools-gijon-2024', 'Bases de admisión de escuelas infantiles de Gijón · curso 2024–2025', 'Ayuntamiento de Gijón/Xixón', 'ayto-gijon', 'action', None),
    ('schools-gijon-2026.pdf', 'schools-gijon-2026', 'Bases de admisión de escuelas infantiles de Gijón · curso 2026–2027', 'Ayuntamiento de Gijón/Xixón', 'ayto-gijon', 'action', None),
]


def build_sources():
    result = []
    for filename, suffix, title, publisher, family, role, date in SOURCES:
        path = ROOT/filename
        meta = json.loads(path.with_suffix('.meta.json').read_text(encoding='utf-8'))
        data = path.read_bytes()
        if meta['snapshotPath'] != path.as_posix() or len(data) != meta['bytes'] or hashlib.sha256(data).hexdigest() != meta['sha256']:
            raise ValueError('Changed evidence: '+filename)
        if b'Radware Captcha Page' in data or (path.suffix == '.pdf' and not data.startswith(b'%PDF-')):
            raise ValueError('Invalid source capture: '+filename)
        result.append(dict(meta, id='asturias-'+suffix, jurisdictionId='r-03', title=title, publisher=publisher,
            family=family, role=role, publicationDate=date, captureType='bytes_originales'))
    if result[3]['sha256'] != result[4]['sha256']:
        raise ValueError('Concertation copies changed; recheck identity')
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
    print('Asturias: fourteen references; identical joint-author concertation copies')

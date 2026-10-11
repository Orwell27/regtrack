"""Register originals and explicitly labelled editorial extracts separately."""
import hashlib
import json
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/murcia')
SOURCES = [
    ('programme.pdf', 'murcia-programme-copy', 'Pacto PP–VOX de 5/09/2023 · copia de La Verdad', 'PP y VOX · copia alojada por La Verdad', 'pp-vox-murcia', 'programme', None),
    ('programme-second-copy.pdf', 'murcia-programme-second-copy', 'Pacto PP–VOX · segunda copia para cotejo textual', 'PP y VOX · copia alojada por elDiario.es', 'pp-vox-murcia', 'programme', None),
    ('programme-register.html', 'murcia-programme-register', 'Registro periodístico del pacto firmado el 5 de septiembre de 2023', 'Onda Regional de Murcia', 'rtv-murcia', 'register', '2023-09-05'),
    ('antelo-appointment-2023.pdf', 'murcia-antelo-appointment-2023', 'Decreto 32/2023 · nombramiento de José Ángel Antelo', 'Presidencia de la Región de Murcia · BORM', 'gobierno-murcia', 'action', '2023-09-14'),
    ('pancorbo-appointment-excerpt.txt', 'murcia-pancorbo-appointment-2023', 'Decreto 39/2023 · nombramiento de José Manuel Pancorbo · extracto editorial', 'Presidencia de la Región de Murcia · BORM', 'gobierno-murcia', 'action', '2023-09-14'),
    ('government-cessations-2024.pdf', 'murcia-government-cessations-2024', 'Decretos 17 y 18/2024 · ceses de Antelo y Pancorbo', 'Presidencia de la Región de Murcia · BORM', 'gobierno-murcia', 'action', '2024-07-15'),
    ('tax-history-2023.html', 'murcia-tax-history-2023', 'Tributos cedidos · texto consolidado histórico de 8/03/2023', 'Región de Murcia · consolidación informativa del BOE', 'gobierno-murcia', 'action', None),
    ('budget-law-2024.html', 'murcia-budget-law-2024', 'Ley 4/2023 · presupuesto de 2024 y ampliación del ITP reducido para jóvenes', 'Región de Murcia · texto original publicado en el BOE', 'gobierno-murcia', 'action', '2024-02-03'),
    ('budget-law-2025.html', 'murcia-budget-law-2025', 'Ley 3/2025 · presupuesto de 2025 y rebaja del ITP general', 'Región de Murcia · texto original publicado en el BOE', 'gobierno-murcia', 'action', '2025-08-05'),
    ('tax-note-2025.html', 'murcia-tax-note-2025', 'Explicación de las modificaciones tributarias de 2025', 'Agencia Tributaria de la Región de Murcia', 'gobierno-murcia', 'government-report', '2025-07-29'),
    ('waiting-register.html', 'murcia-waiting-register', 'Formulario público de listas de espera · sin resultados seleccionados', 'Servicio Murciano de Salud', 'gobierno-murcia', 'register', None),
    ('waiting-announcement-excerpt.txt', 'murcia-waiting-announcement-2026', 'Comunicación de Salud sobre junio de 2026 · extracto editorial', 'Consejería de Salud de la Región de Murcia', 'gobierno-murcia', 'government-report', '2026-07-27'),
    ('waiting-adsp-2026.pdf', 'murcia-waiting-adsp-2026', 'Informe sobre listas de espera · junio de 2026', 'Asociación para la Defensa de la Sanidad Pública de la Región de Murcia', 'adsp-murcia', 'reporting', None),
    ('waiting-adsp-register.html', 'murcia-waiting-adsp-register', 'Registro de publicación del informe sobre junio de 2026', 'ADSP Región de Murcia', 'adsp-murcia', 'register', '2026-09-21'),
    ('waiting-reply-excerpt.txt', 'murcia-waiting-reply-2026', 'Respuesta de Salud al informe de ADSP · extracto editorial de Radio Murcia', 'Consejería de Salud · declaraciones recogidas por Radio Murcia', 'gobierno-murcia', 'government-report', '2026-09-16'),
    ('../canarias/waiting-national-2025.pdf', 'murcia-waiting-national-2025', 'SISLE-SNS · datos de Murcia de diciembre de 2025', 'Servicio Murciano de Salud · recopilación del Ministerio de Sanidad', 'gobierno-murcia', 'government-report', None),
]


def build_sources():
    result = []
    for filename, key, title, publisher, family, role, date in SOURCES:
        path = (ROOT/filename).resolve().relative_to(Path.cwd())
        meta = json.loads(path.with_suffix('.meta.json').read_text(encoding='utf-8'))
        data = path.read_bytes()
        if meta['snapshotPath'] != path.as_posix() or len(data) != meta['bytes'] or hashlib.sha256(data).hexdigest() != meta['sha256']:
            raise ValueError('Changed evidence: '+filename)
        if b'Radware Captcha Page' in data or (path.suffix == '.pdf' and not data.startswith(b'%PDF-')):
            raise ValueError('Invalid source capture: '+filename)
        result.append(dict(meta, id=key, jurisdictionId='r-14', title=title, publisher=publisher,
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
    print('Murcia: 16 sources, three labelled editorial extracts; SNS original reused')

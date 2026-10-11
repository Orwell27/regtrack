"""Source authorship, document dates and captured bytes are separate facts."""
import hashlib
import json
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/balears')
SOURCES = [
    ('programme.pdf', 'Acuerdo PP–VOX de 2023 · original publicado por VOX', 'PP y VOX', 'pp-vox-balears', 'programme', '2023-06-28'),
    ('programme-register.txt', 'Anuncio del acuerdo de investidura y sus 110 puntos · nota editorial', 'PP Balears', 'pp-vox-balears', 'register', '2023-06-28'),
    ('appointment.html', 'Real Decreto 603/2023 · nombramiento tras la investidura de julio', 'Presidencia del Gobierno · BOE', 'gob-espana', 'register', '2023-07-07'),
    ('pact-break.html', 'El Govern anuncia la ruptura y el cambio de compromisos asumidos', 'Govern de les Illes Balears', 'gob-balears', 'government-report', '2024-07-12'),
    ('agreements-register.html', 'Portal de transparencia · acuerdos de gobernabilidad', 'Govern de les Illes Balears', 'gob-balears', 'register', None),
    ('formentera-pact.pdf', 'Acuerdo PP–Sa Unió de 4/07/2023 · escaneado, pendiente de incorporar al inventario', 'PP y Sa Unió · alojado en el portal del Govern', 'pp-sa-unio-balears', 'programme', None),
    ('pp-programme-register.txt', 'Presentación del programa PP con más de 500 propuestas · nota editorial', 'PP Balears', 'pp-balears', 'register', '2023-04-16'),
    ('pp-programme-copy.pdf', 'Programa PP 2023 · copia del Col·legi d’Economistes, pendiente de cotejo e inventario', 'PP Balears · alojado por el Col·legi d’Economistes', 'pp-balears', 'programme', None),
    ('budget-pact-register.txt', 'PP y VOX anuncian el acuerdo presupuestario de 2025 · nota editorial', 'PP Balears', 'pp-vox-balears', 'register', '2025-05-30'),
    ('budget-pact-copy.pdf', 'Acuerdo presupuestario de 2025 · copia de Prensa Ibérica, pendiente de cotejo e inventario', 'PP y VOX · alojado por Prensa Ibérica', 'pp-vox-balears', 'programme', '2025-05-30'),
    ('succession-law.html', 'Decreto ley 4/2023 · bonificaciones sucesorias e ITP; reproducción del BOE', 'Govern de les Illes Balears · BOE', 'gob-balears', 'action', '2023-11-30'),
    ('succession-atib.html', 'ATIB · información sobre las bonificaciones con efectos desde 18/07/2023', 'Agència Tributària de les Illes Balears', 'gob-balears', 'government-report', None),
    ('succession-law-2025.html', 'Ley 6/2025 · reforma sucesoria; reproducción del BOE', 'Comunidad Autónoma de las Illes Balears · BOE', 'gob-balears', 'action', '2025-11-01'),
    ('budget-law-boib.pdf', 'Ley 6/2025 · publicación original en BOIB de 24/07/2025', 'Comunidad Autónoma de las Illes Balears · BOIB alojado por BOE', 'gob-balears', 'action', '2025-07-24'),
    ('education-law.html', 'Decreto ley 5/2023 · gratuidad del primer ciclo de infantil; reproducción del BOE', 'Govern de les Illes Balears · BOE', 'gob-balears', 'action', '2023-11-30'),
    ('education-vacancies.html', 'Educación anuncia el mapa de vacantes y las plazas de 2025–2026', 'Govern de les Illes Balears', 'gob-balears', 'government-report', '2025-08-19'),
    ('education-2026.html', 'Inicio del curso 2026–2027 · 15.451 plazas gratuitas comunicadas', 'Govern de les Illes Balears', 'gob-balears', 'government-report', '2026-09-10'),
    ('education-admission.html', 'Escolarización 0–3 · registro de normas y correcciones de 2026–2027', 'Govern de les Illes Balears', 'gob-balears', 'register', None),
    ('education-admission-order.html', 'Admisión 2026–2027 · resolución, listas de espera y vacantes', 'Govern de les Illes Balears · BOIB', 'gob-balears', 'action', '2026-03-05'),
    ('education-admission-correction.html', 'Corrección de zonas, años de nacimiento y formulario de admisión', 'Govern de les Illes Balears · BOIB', 'gob-balears', 'action', '2026-03-24'),
    ('education-late.html', 'Solicitud fuera de plazo · adjudicación supeditada a vacantes', 'Govern de les Illes Balears', 'gob-balears', 'government-report', None),
    ('education-fapa.html', 'FAPA Mallorca · observaciones sobre plazas y gastos en 2024–2025', 'FAPA Mallorca', 'fapa-mallorca', 'reporting', '2024-07-12'),
    ('education-fapa-2026.html', 'FAPA Mallorca · balance del curso 2025–2026 y conciliación en 0–3', 'FAPA Mallorca', 'fapa-mallorca', 'reporting', '2026-07-03'),
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
        result.append(dict(meta, id='balears-'+path.stem, jurisdictionId='r-04', title=title,
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
    print('Baleares: 23 sources, six origin families; duplicate publications are not independent corroboration')

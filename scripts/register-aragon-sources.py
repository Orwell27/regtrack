"""Keep authorship distinct from hosting and consultation separate from enactment."""
import hashlib
import json
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/aragon')
SOURCES = [
    ('programme.pdf', 'programme', 'Acuerdo PP–VOX de 22/04/2026 · copia escaneada alojada por La Vanguardia', 'PP y VOX · copia alojada por La Vanguardia', 'pp-vox-aragon', 'programme', '2026-04-22'),
    ('programme-ser.pdf', 'programme-ser', 'Mismo acuerdo · copia idéntica alojada por Cadena SER', 'PP y VOX · copia alojada por Cadena SER', 'pp-vox-aragon', 'programme', '2026-04-22'),
    ('programme-register.txt', 'programme-register', 'Anuncio de firma del acuerdo · nota editorial de lectura', 'VOX', 'pp-vox-aragon', 'register', '2026-04-22'),
    ('appointment.pdf', 'appointment', 'Real Decreto 367/2026 · nombramiento del presidente tras la investidura de abril', 'Presidencia del Gobierno · BOE', 'gob-espana', 'register', '2026-04-30'),
    ('vicepresident.pdf', 'vicepresident', 'Nombramiento de Alejandro Nolasco · decreto de 3/05/2026', 'Presidencia del Gobierno de Aragón · BOA', 'gob-aragon', 'action', '2026-05-04'),
    ('education-order.pdf', 'education-order', 'Orden ECD/515/2026 · convocatoria de conciertos singulares para enseñanzas postobligatorias', 'Gobierno de Aragón · BOA', 'gob-aragon', 'action', '2026-04-08'),
    ('education-announcement.html', 'education-announcement', 'Anuncio de concertación para 2026–2027 por la consejera en funciones', 'Gobierno de Aragón', 'gob-aragon', 'government-report', '2026-04-07'),
    ('education-plaintiff.html', 'education-plaintiff', 'Comunicado de las organizaciones recurrentes sobre la suspensión cautelar', 'Organizaciones recurrentes · publicado por FAPAR', 'plataforma-escuela-publica-aragon', 'reporting', '2026-06-11'),
    ('education-city.html', 'education-city', 'Aplazamiento del área de formación de Distrito7 tras las medidas cautelares', 'Ayuntamiento de Zaragoza', 'ayto-zaragoza', 'government-report', '2026-06-25'),
    ('education-provider.html', 'education-provider', 'San Valero anuncia que no formalizará la concesión de Distrito7 en 2026–2027', 'Grupo San Valero', 'grupo-san-valero', 'reporting', '2026-06-26'),
    ('education-consultation.html', 'education-consultation', 'Consulta previa sobre el régimen de conciertos · 21/08–9/09/2026', 'Gobierno de Aragón', 'gob-aragon', 'register', '2026-08-21'),
    ('education-consultation-memo.pdf', 'education-consultation-memo', 'Memoria de la consulta previa sobre conciertos educativos', 'Gobierno de Aragón', 'gob-aragon', 'action', None),
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
        for key, extension in [('extractionSha256', '.pages.json'), ('ocrSha256', '.ocr.json'), ('orderedSha256', '.ordered.json')]:
            if key in meta and hashlib.sha256(path.with_suffix(extension).read_bytes()).hexdigest() != meta[key]:
                raise ValueError('Changed extraction: '+filename)
        result.append(dict(meta, id='aragon-'+suffix, jurisdictionId='r-02', title=title,
            publisher=publisher, family=family, role=role, publicationDate=date,
            captureType='extracto_editorial' if path.suffix == '.txt' else 'bytes_originales'))
    if result[0]['sha256'] != result[1]['sha256']:
        raise ValueError('Programme copies differ: reconcile before publication')
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
    print('Aragón: 12 sources; six origin families; identical copies are one document')

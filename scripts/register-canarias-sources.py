"""Register exact original bytes; common data origin is not independent assurance."""
import hashlib
import json
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/canarias')
SOURCES = [
    ('programme.pdf', 'canarias-agreement-cc-pp', 'Acuerdo de gobernabilidad CC–PP · 6 de junio de 2023', 'Coalición Canaria y Partido Popular', 'coalicion-gobierno-canarias', 'programme', '2023-06-06'),
    ('ahi.pdf', 'canarias-agreement-ahi', 'Acuerdo de gobernabilidad AHI–CC · 7 de junio de 2023', 'Agrupación Herreña Independiente y Coalición Canaria', 'coalicion-gobierno-canarias', 'programme', '2023-06-07'),
    ('asg.pdf', 'canarias-agreement-asg', 'Acuerdo de gobernabilidad ASG–CC–PP · 8 de junio de 2023', 'Agrupación Socialista Gomera, Coalición Canaria y Partido Popular', 'coalicion-gobierno-canarias', 'programme', '2023-06-08'),
    ('register.html', 'canarias-agreement-register', 'Registro de acuerdos publicados por Coalición Canaria', 'Coalición Canaria', 'coalicion-gobierno-canarias', 'register', None),
    ('objectives-register.html', 'canarias-objectives-2023', 'BOC · misión, visión y objetivos del Gobierno 2024–2027', 'Gobierno de Canarias · BOC', 'gob-canarias', 'action', '2023-11-08'),
    ('strategy.pdf', 'canarias-strategic-plan-2024', 'PEGobCan 2024–2027 · plan estratégico publicado en el BOC', 'Gobierno de Canarias · BOC', 'gob-canarias', 'programme', '2024-12-31'),
    ('plan-register.html', 'canarias-plan-register', 'BOC · aprobación del plan estratégico el 26 de diciembre de 2024', 'Gobierno de Canarias · BOC', 'gob-canarias', 'register', '2024-12-31'),
    ('waiting-2025.html', 'canarias-waiting-2025', 'SCS · espera quirúrgica a 31 de diciembre de 2025', 'Servicio Canario de la Salud', 'gob-canarias', 'government-report', '2026-02-04'),
    ('waiting-2026.html', 'canarias-waiting-2026', 'SCS · espera quirúrgica a 30 de junio de 2026', 'Servicio Canario de la Salud', 'gob-canarias', 'government-report', '2026-09-01'),
    ('waiting-national-2025.pdf', 'canarias-waiting-national-2025', 'Ministerio de Sanidad · listas de espera SNS · diciembre de 2025', 'Ministerio de Sanidad · cifras remitidas por las comunidades autónomas', 'gob-canarias', 'reporting', None),
    ('blood-2025.html', 'canarias-blood-2025', 'SCS · balance de donantes y donaciones de sangre de 2025', 'Servicio Canario de la Salud', 'gob-canarias', 'government-report', '2026-03-10'),
    ('blood-national-2025.pdf', 'canarias-blood-national-2025', 'Ministerio de Sanidad · actividad de centros y servicios de transfusión · 2025', 'Ministerio de Sanidad · registros de centros y servicios validados por las comunidades autónomas', 'gob-canarias', 'reporting', None),
]


def build_sources():
    result = []
    for filename, key, title, publisher, family, role, date in SOURCES:
        path = ROOT/filename
        meta = json.loads(path.with_suffix('.meta.json').read_text(encoding='utf-8'))
        data = path.read_bytes()
        if meta['snapshotPath'] != path.as_posix() or len(data) != meta['bytes'] or hashlib.sha256(data).hexdigest() != meta['sha256']:
            raise ValueError('Changed source original: '+filename)
        result.append(dict(meta, id=key, jurisdictionId='r-05', title=title, publisher=publisher,
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
    print('Canarias: 12 original sources registered')

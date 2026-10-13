"""Keep emitter, capture type and date separate from the document host."""
import hashlib
import json
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/cyl')
ITEMS = [
 ('programme', 'programme', 'pp-vox-cyl', 'Acuerdo PP–VOX de Castilla y León · copia del documento firmado', 'PP de Castilla y León y VOX; copia alojada por elDiario.es', '2026-06-03'),
 ('appointment', 'register', 'gob-espana', 'Real Decreto 476/2026 · nombramiento y fecha de investidura', 'Boletín Oficial del Estado', '2026-06-11'),
 ('buscyl-rule', 'action', 'gob-cyl', 'Orden MTD/589/2025 · condiciones de gratuidad de Buscyl', 'Boletín Oficial de Castilla y León', '2025-06-10'),
 ('buscyl-register', 'government-report', 'gob-cyl', 'Sede electrónica · tarjeta Buscyl, requisitos y ámbito', 'Junta de Castilla y León', None),
 ('buscyl-routes', 'government-report', 'gob-cyl', 'Relación oficial de rutas Buscyl · archivo identificado como actualizado el 02/09/2026', 'Junta de Castilla y León', None),
 ('university-bases', 'action', 'gob-cyl', 'Orden IEM/621/2026 · bases de ayudas a la primera matrícula universitaria', 'Boletín Oficial de Castilla y León', '2026-07-09'),
 ('university-modification', 'action', 'gob-cyl', 'Orden IEM/869/2026 · acreditación del pago de matrícula', 'Boletín Oficial de Castilla y León', '2026-09-07'),
 ('university-call', 'action', 'gob-cyl', 'Convocatoria de ayudas a la primera matrícula · curso 2026–2027', 'Boletín Oficial de Castilla y León', '2026-09-21'),
 ('housing-bases', 'action', 'gob-cyl', 'Orden MAV/669/2023 · regulación original de Mi primera vivienda', 'Boletín Oficial de Castilla y León', '2023-05-23'),
 ('housing-extension', 'action', 'gob-cyl', 'Orden MAV/1418/2025 · extensión a 2026 de Mi primera vivienda', 'Boletín Oficial de Castilla y León', '2025-12-16'),
 ('housing-debate', 'government-report', 'gob-cyl', 'Diario de Sesiones 5/12 · respuesta del Gobierno sobre vivienda y debate parlamentario', 'Cortes de Castilla y León · intervención del Gobierno y de la oposición', '2026-09-11'),
]


def build_sources():
    result = []
    for stem, role, family, title, publisher, date in ITEMS:
        m = json.loads((ROOT/(stem+'.meta.json')).read_text(encoding='utf-8'))
        result.append(dict(id='cyl-'+stem, jurisdictionId='r-07', role=role, family=family, title=title,
            publisher=publisher, publicationDate=date, format=Path(m['snapshotPath']).suffix[1:],
            url=m['url'], snapshotPath=m['snapshotPath'], sha256=m['sha256'], bytes=m['bytes'],
            retrievedAt=m['retrievedAt'], captureType='bytes_originales'))
    path = ROOT/'buscyl-facua.md'; data = path.read_bytes()
    result.append(dict(id='cyl-buscyl-facua', jurisdictionId='r-07', role='reporting', family='facua-cyl',
        title='FACUA · antecedente de reclamación por cobros de septiembre de 2025', publisher='FACUA Castilla y León',
        publicationDate='2025-10-30', format='editorial-excerpt',
        url='https://facua.org/noticias/nuevas-tarjetas-buscyl-facua-castilla-y-leon-reclama-la-devolucion-de-las-cuantias-abonadas-por-trayectos-que-tenian-que-ser-gratuitos/',
        snapshotPath=path.as_posix(), sha256=hashlib.sha256(data).hexdigest(), bytes=len(data),
        retrievedAt='2026-10-11', captureType='extracto_editorial'))
    return result


if __name__ == '__main__':
    path = Path('data/mandate/evidence/territorial/sources.json')
    sources = json.loads(path.read_text(encoding='utf-8'))
    sources = [s for s in sources if s['jurisdictionId'] != 'r-07'] + build_sources()
    path.write_text(json.dumps(sources, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')

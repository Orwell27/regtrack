"""Register originals and the identified press note, preserving issuer families."""
import json
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/clm')
ITEMS = [
    ('programme', 'programme', 'gob-clm', 'Programa de Gobierno inicial 2023–2027: 861 compromisos', 'Junta de Comunidades de Castilla-La Mancha', None),
    ('programme-register', 'register', 'gob-clm', 'Portal de compromisos: programa e informes por legislatura', 'Junta de Comunidades de Castilla-La Mancha', None),
    ('appointment', 'action', 'gob-espana', 'Real Decreto 602/2023: nombramiento de Emiliano García-Page', 'Boletín Oficial del Estado', '2023-07-08'),
    ('reports', 'register', 'gob-clm', 'Índice de informes anuales 2024, 2025 y 2026', 'Junta de Comunidades de Castilla-La Mancha', None),
    ('methodology', 'government-report', 'gob-clm', 'Metodología de seguimiento: fases y porcentajes orientativos', 'Oficina de Transparencia, Integridad y Participación', None),
    ('annual-followup', 'government-report', 'gob-clm', 'Seguimiento oficial del compromiso 446: informes anuales y porcentajes', 'Oficina de Transparencia, Integridad y Participación', None),
    ('dependency-register', 'register', 'gob-clm', 'Índice de estadísticas del Sistema de Atención a la Dependencia', 'Consejería de Bienestar Social', None),
    ('dependency-2024', 'government-report', 'gob-clm', 'Dependencia: informe con corte a 31 de diciembre de 2024', 'Consejería de Bienestar Social', None),
    ('dependency-july', 'government-report', 'gob-clm', 'Balance comunicado en agosto: prestaciones de julio y personas del primer semestre de 2026', 'Gobierno de Castilla-La Mancha', '2026-08-20'),
    ('books-law', 'action', 'gob-clm', 'Decreto 26/2024: creación y regulación del banco de libros', 'Diario Oficial de Castilla-La Mancha', '2024-06-10'),
    ('books-guide', 'action', 'gob-clm', 'Banco de libros 2026–2027: preguntas frecuentes y condiciones', 'Consejería de Educación, Cultura y Deportes', None),
    ('books-school', 'action', 'gob-clm', 'Banco de libros: procedimiento del IES Peñas Negras para 2026–2027', 'IES Peñas Negras, Mora', None),
    ('tv-press', 'reporting', 'diario-sanitario', 'Televisión gratuita en los hospitales: antecedente de Albacete de enero de 2023', 'Diario Sanitario', '2023-01-03'),
    ('tv-followup', 'government-report', 'gob-clm', 'Seguimiento oficial del compromiso 166: televisión hospitalaria', 'Secretaría General del SESCAM', None),
    ('university-law', 'action', 'gob-clm', 'Orden 74/2026: precios universitarios y bonificación del 99 % para 2026–2027', 'Diario Oficial de Castilla-La Mancha', '2026-05-27'),
]

def build_sources():
    entries = []
    for stem, role, family, title, publisher, date in ITEMS:
        meta = json.loads((ROOT/(stem+'.meta.json')).read_text(encoding='utf-8'))
        entries.append(dict(id='clm-'+stem, jurisdictionId='r-08', role=role, family=family,
            title=title, publisher=publisher, publicationDate=date, format=Path(meta['snapshotPath']).suffix[1:],
            url=meta['url'], snapshotPath=meta['snapshotPath'], sha256=meta['sha256'], bytes=meta['bytes'],
            retrievedAt=meta['retrievedAt'], captureType='extracto_editorial' if stem == 'tv-press' else 'bytes_originales'))
    return entries

if __name__ == '__main__':
    path = Path('data/mandate/evidence/territorial/sources.json')
    sources = json.loads(path.read_text(encoding='utf-8'))
    sources = [s for s in sources if s['jurisdictionId'] != 'r-08'] + build_sources()
    path.write_text(json.dumps(sources, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')

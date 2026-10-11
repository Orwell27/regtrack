"""Register captured primary evidence without confusing hosting with authorship."""
import hashlib
import json
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/extremadura')
ITEMS = [
 ('programme', 'programme', 'pp-vox-extremadura', 'Acuerdo de Gobierno PP–VOX · abril de 2026', 'PP de Extremadura y VOX; publicado por VOX', '2026-04-16'),
 ('appointment', 'register', 'gob-espana', 'Real Decreto 361/2026 · nombramiento de la presidenta de Extremadura', 'Diario Oficial de Extremadura · real decreto estatal', '2026-04-23'),
 ('budget', 'action', 'gob-extremadura', 'Ley 2/2026 · presupuestos de Extremadura para 2026', 'Comunidad Autónoma de Extremadura; publicación en el BOE', '2026-08-17'),
 ('almaraz-authorization', 'action', 'gob-espana', 'Orden TED/864/2026 · autorización de explotación de Almaraz', 'Ministerio para la Transición Ecológica y el Reto Demográfico · BOE', '2026-08-14'),
 ('almaraz-csn', 'control', 'csn', 'Informe favorable condicionado del CSN sobre Almaraz', 'Consejo de Seguridad Nuclear', '2026-07-16'),
 ('regadio-structure', 'action', 'gob-extremadura', 'Decreto 110/2026 · Dirección General de Regadíos y competencias', 'Diario Oficial de Extremadura', '2026-06-03'),
 ('regadio-september', 'government-report', 'gob-extremadura', 'Presentación del proyecto de regadío de Tierra de Barros', 'Junta de Extremadura', '2026-09-16'),
 ('regadio-union', 'reporting', 'la-union-extremadura', 'Petición de transparencia sobre los 20 millones del regadío', 'La Unión Extremadura', '2026-08-17'),
 ('ecotasa-union', 'reporting', 'la-union-extremadura', 'Objeción al coste de la eliminación de la ecotasa', 'La Unión Extremadura', '2026-08-25'),
 ('infantil-call', 'action', 'gob-extremadura', 'Resolución de 30/07/2026 · ayudas al primer ciclo de Infantil 2026–2027', 'Diario Oficial de Extremadura', '2026-08-06'),
 ('irpf-baseline', 'government-report', 'gob-espana', 'Manual IRPF 2025 · escala autonómica de Extremadura', 'Agencia Estatal de Administración Tributaria', None),
]

def build_sources():
    result = []
    for stem, role, family, title, publisher, date in ITEMS:
        m = json.loads((ROOT/(stem+'.meta.json')).read_text(encoding='utf-8'))
        result.append(dict(id='extremadura-'+stem, jurisdictionId='r-11', role=role, family=family,
            title=title, publisher=publisher, publicationDate=date, format=Path(m['snapshotPath']).suffix[1:],
            url=m['url'], snapshotPath=m['snapshotPath'], sha256=m['sha256'], bytes=m['bytes'],
            retrievedAt=m['retrievedAt'], captureType='bytes_originales'))
    path = ROOT/'programme-announcement.md'; data = path.read_bytes()
    result.append(dict(id='extremadura-programme-announcement', jurisdictionId='r-11', role='programme',
        family='pp-vox-extremadura', title='Anuncio del acuerdo: 61 puntos y 74 medidas, recuento por conciliar',
        publisher='VOX', publicationDate='2026-04-16', format='editorial-excerpt',
        url='https://www.voxespana.es/noticias/vox-y-pp-sellan-un-acuerdo-de-gobierno-en-extremadura-tras-semanas-de-negociacion-20260416?provincia=badajoz-caceres',
        snapshotPath=path.as_posix(), sha256=hashlib.sha256(data).hexdigest(), bytes=len(data),
        retrievedAt='2026-10-11', captureType='extracto_editorial'))
    return result

if __name__ == '__main__':
    path = Path('data/mandate/evidence/territorial/sources.json')
    sources = json.loads(path.read_text(encoding='utf-8'))
    sources = [s for s in sources if s['jurisdictionId'] != 'r-11'] + build_sources()
    path.write_text(json.dumps(sources, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')

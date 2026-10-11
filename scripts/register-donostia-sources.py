"""Register verified original captures; catalogue import remains a separate operation."""
import hashlib
import json
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/donostia')


def build_sources():
    capture = json.loads((ROOT/'capture.json').read_text(encoding='utf-8'))
    result = []

    def add(metadata, key, role, title, date=None):
        path = Path(metadata['snapshotPath'])
        if path.parent != ROOT: raise ValueError('Unexpected source path')
        data = path.read_bytes()
        if len(data) != metadata['bytes'] or hashlib.sha256(data).hexdigest() != metadata['sha256']:
            raise ValueError('Changed source original')
        result.append(dict(metadata, id=key, jurisdictionId='m-20069', role=role,
            family='ayto-donostia', title=title, publisher='Ayuntamiento de Donostia / San Sebastián',
            publicationDate=date, captureType='bytes_originales'))

    add(capture['portal'], 'donostia-plan-portal', 'programme', 'Portal municipal del Programa de Gobierno 2023–2027 · anuncia 127 proyectos')
    add(capture['catalogue'], 'donostia-catalogue-2026', 'government-report', 'Catálogo consultado · 129 fichas distintas')
    for project in capture['projects']:
        if project['followup']:
            add(project['followup'], 'donostia-followup-'+project['officialId'], 'government-report', 'Seguimiento municipal · '+project['slug'].replace('-', ' '))
        if project['slug'] in ('generacion-nueva-vivienda', 'definicion-nueva-movilidad-urbana-sostenible'):
            add(project['detail'], 'donostia-project-'+project['slug'], 'government-report', 'Ficha municipal · '+project['slug'].replace('-', ' '))
    for filename, key, role, title, date in [
        ('register', 'donostia-plan-register', 'register', 'Mapa web municipal · enlace al programa y al catálogo', None),
        ('illarra', 'donostia-illarra', 'action', 'Illarra · dictamen de modificación del PGOU en ejecución de sentencia', None),
        ('illarra-register', 'donostia-illarra-register', 'action', 'Registro del pleno de 24 de septiembre de 2026 · aprobación inicial de Illarra', None),
        ('zbe-register', 'donostia-zbe-register', 'action', 'Registro municipal de la ordenanza ZBE · fechas de aprobación y vigencia', None),
        ('zbe-ordinance', 'donostia-zbe-ordinance', 'action', 'BOG 241 · corrección de errores y texto íntegro de la ordenanza ZBE', '2024-12-16'),
        ('zbe-october', 'donostia-zbe-october', 'government-report', 'Seguimiento municipal del aire · datos de enero a agosto de 2026', '2026-10-06'),
    ]:
        add(json.loads((ROOT/(filename+'.meta.json')).read_text(encoding='utf-8')), key, role, title, date)
    return result


if __name__ == '__main__':
    path = ROOT.parent/'sources.json'
    sources = json.loads(path.read_text(encoding='utf-8'))
    updates = build_sources()
    existing = {s['id']: s for s in sources}
    for source in updates:
        if source['id'] in existing and existing[source['id']] != source:
            raise ValueError('Changed registered source')
        if source['id'] not in existing: sources.append(source)
    path.write_text(json.dumps(sources,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(f'{len(updates)} Donostia sources verified and registered')

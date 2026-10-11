"""Register preserved originals and explicitly identified editorial reading notes."""
import hashlib
import json
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/bilbao')


def build_sources():
    result = []
    for filename, key, title, publisher, family, role, date in [
        ('programme', 'bilbao-programme-copy', 'Plan de Mandato 2023–2027 · copia difundida por EAJ-PNV', 'Ayuntamiento de Bilbao · copia difundida por EAJ-PNV', 'ayto-bilbao', 'programme', None),
        ('bolueta-order', 'bilbao-bolueta-order', 'BOPV · orden de 13 de mayo de 2026 · titularidad municipal de 63 viviendas y procedimiento autonómico', 'Gobierno Vasco · BOPV', 'gob-euskadi', 'action', '2026-05-26'),
    ]:
        meta = json.loads((ROOT/(filename+'.meta.json')).read_text(encoding='utf-8'))
        path = Path(meta['snapshotPath'])
        if path != ROOT/(filename+'.pdf'): raise ValueError('Unexpected source path')
        data = path.read_bytes()
        if len(data) != meta['bytes'] or hashlib.sha256(data).hexdigest() != meta['sha256']:
            raise ValueError('Changed source original')
        result.append(dict(meta, id=key, jurisdictionId='m-48020', title=title, publisher=publisher,
            family=family, role=role, publicationDate=date, captureType='bytes_originales'))
    notes = json.loads((ROOT/'notes.json').read_text(encoding='utf-8'))
    for note in notes:
        path = Path(note['snapshotPath'])
        if path.parent != ROOT or path.suffix != '.md': raise ValueError('Unexpected note path')
        data = path.read_bytes()
        if len(data) != note['bytes'] or hashlib.sha256(data).hexdigest() != note['sha256']:
            raise ValueError('Changed editorial note')
        result.append(dict(note, jurisdictionId='m-48020', captureType='extracto_editorial'))
    if len(result) != 6 or len({s['id'] for s in result}) != 6: raise ValueError('Incomplete sources')
    return result


if __name__ == '__main__':
    path = ROOT.parent/'sources.json'
    sources = json.loads(path.read_text(encoding='utf-8'))
    existing = {s['id']: s for s in sources}
    for source in build_sources():
        if source['id'] in existing and existing[source['id']] != source:
            raise ValueError('Changed registered source')
        if source['id'] not in existing: sources.append(source)
    path.write_text(json.dumps(sources,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Bilbao: two originals and four editorial notes verified and registered')

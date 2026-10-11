"""Reproduce all project descriptions and the 27 separately archived follow-ups."""
import hashlib
import html
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit

ROOT = Path('data/mandate/evidence/territorial/donostia')
BASE = 'https://www.donostia.eus/es/programa-gobierno-23-27'


class Text(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []; self.links = []; self.skip = 0
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('style', 'script', 'svg'): self.skip += 1
        if tag == 'br': self.parts.append('\n')
        if tag == 'a' and attrs.get('href'):
            url = urljoin(BASE, attrs['href'])
            if urlsplit(url).scheme in ('http', 'https'): self.links.append(url)
    def handle_endtag(self, tag):
        if tag in ('style', 'script', 'svg'): self.skip -= 1
        if tag in ('p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'section'): self.parts.append('\n')
    def handle_data(self, data):
        if not self.skip: self.parts.append(data)
    def text(self):
        return '\n'.join(line for part in ''.join(self.parts).split('\n') if (line := re.sub(r'\s+', ' ', part).strip()))


def plain(value):
    parser = Text(); parser.feed(value); return parser.text()


def read_verified(metadata):
    path = Path(metadata['snapshotPath'])
    if path.parent != ROOT or path.suffix != '.html': raise ValueError('Unexpected archive path')
    data = path.read_bytes()
    if len(data) != metadata['bytes'] or hashlib.sha256(data).hexdigest() != metadata['sha256']:
        raise ValueError('Changed original: '+metadata['id'])
    return data.decode('utf-8')


def import_inventory(capture):
    portal = read_verified(capture['portal'])
    if not re.search(r'>\s*127\s*</h2>',portal): raise ValueError('Changed portal total')
    catalogue = read_verified(capture['catalogue'])
    links = list(dict.fromkeys(html.unescape(u) for u in re.findall(r'href="('+re.escape(BASE)+r'/proyectos/[^"?#]+)"', catalogue)))
    projects = capture['projects']
    if len(links) != 129 or len(projects) != 129 or [p['detail']['url'] for p in projects] != links:
        raise ValueError('Missing, duplicated or reassigned project')
    records = []; report_ids = []
    for project in projects:
        original = read_verified(project['detail'])
        slug = project['slug']
        if not re.fullmatch(r'[a-z0-9-]+', slug) or project['detail']['url'] != BASE+'/proyectos/'+slug:
            raise ValueError('Project URL mismatch')
        parts = original.split('<h1 class="dtik-wave__item__text">')
        if len(parts) != 2: raise ValueError('Missing project heading')
        body_parts = parts[1].split('<div class="component-button text-break">')
        if len(body_parts) != 2: raise ValueError('Unknown project content boundary')
        title, remainder = body_parts[0].split('</h1>',1)
        title = plain(title)
        parser = Text(); parser.feed(remainder)
        body = parser.text()
        if not title or not body: raise ValueError('Empty project')
        topics = re.findall(r'<div class="c-vertical-card__text__title[^>]*>(.*?)</div>',remainder,re.S)
        record = dict(id='m-20069-'+slug, officialId=slug, text=title, topic=' · '.join(plain(t) for t in topics) or 'Proyecto municipal',
                      page=None,endPage=None,sourceId='donostia-catalogue-2026',detailText=body,detailLinks=list(dict.fromkeys(parser.links)),
                      webSource={k:project['detail'][k] for k in ['url','sha256','retrievedAt']})
        ids = re.findall(r'<input type="hidden" id="projectId" value="(\d+)"', original)
        if project['followup'] is None:
            if ids: raise ValueError('Follow-up omitted for identified project')
        else:
            if ids != [project['officialId']]: raise ValueError('Reassigned follow-up identifier')
            urls = re.findall(r"(?:const|var|let) urlPortlet\s*=\s*'([^']+)'", original)
            if len(urls) != 1 or project['followup']['url'] != html.unescape(urls[0])+'&projectId='+ids[0]:
                raise ValueError('Reassigned follow-up URL')
            report_ids.append(ids[0])
            report = Text(); report.feed(read_verified(project['followup']))
            text = report.text()
            progress = re.search(r'Progreso:\s*([\d.]+)%',text)
            if not progress or not 0 <= float(progress[1]) <= 100: raise ValueError('Invalid follow-up percentage')
            if 'Última actualización:' not in text or 'Indicadores' not in text or 'Iniciativas' not in text:
                raise ValueError('Incomplete follow-up sections')
            record['governmentReport'] = dict(officialId=ids[0],title=title,text=text,percentage=float(progress[1]),
                sourceId='donostia-followup-'+ids[0],url=project['followup']['url'],links=list(dict.fromkeys(report.links)))
        records.append(record)
    if sorted(map(int,report_ids)) != list(range(1,28)): raise ValueError('Missing or duplicate follow-up')
    return dict(schemaVersion=1,jurisdictionId='m-20069',mandateId='m-20069-2023',mandateLabel='Ayuntamiento de Donostia / San Sebastián · mandato 2023–2027',
        sourceId='donostia-catalogue-2026',mandateSourceId='donostia-plan-portal',registerSourceId='donostia-plan-register',sourceLabel='Catálogo municipal',
        sourceSha256=capture['catalogue']['sha256'],inventoryTotal=129,textLanguage='es',inventoryKind='action-catalogue',
        governmentCutoff=capture['catalogue']['retrievedAt'][:10],governmentDateKind='capture',
        scope='Las 129 fichas distintas del catálogo municipal consultado, con su descripción completa. La portada anuncia 127 proyectos; se conserva la discrepancia sin excluir fichas. Hay seguimiento detallado en 27 y no se ha encontrado en las otras 102. El inventario de promesas originales y los cambios del programa siguen pendientes de reconstrucción.',
        textNote='Se conservan las iniciativas y los 27 seguimientos con estado, porcentaje, fecha, presupuestos e indicadores cuando aparecen. Cada indicador mantiene su periodo y notas: una actualización en 2026 puede incluir datos de 2023–2024. Los porcentajes son municipales, no resultados verificados por RegTrack. Las fichas se identifican por su ruta web; los números del seguimiento son identificadores del portal. Los enlaces antiguos al PDF devuelven una portada, por lo que no se consideran programa original recuperado.',records=records)


def main():
    capture = json.loads((ROOT/'capture.json').read_text(encoding='utf-8'))
    inventory = import_inventory(capture)
    Path('data/mandate/donostia-inventory.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Donostia: 129 fichas y 27 seguimientos conservados; 127 anunciados, discrepancia pendiente.')


if __name__ == '__main__': main()

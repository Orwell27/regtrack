"""Import every archived public detail, without converting municipal states into verdicts."""
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

ROOT = Path('data/mandate/evidence/territorial/barcelona')
ORIGIN = 'https://ajuntament.barcelona.cat/pla-accio-govern2023-2027/ca/'

class ArticleText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.links = []
        self.skip = 0
        self.title_parts = []
        self.in_title = False
    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag in ('script', 'style', 'svg'): self.skip += 1
        if tag == 'h2' and not self.title_parts: self.in_title = True
        if tag == 'br': self.parts.append('\n')
        if tag == 'a' and attrs.get('href'):
            url = urljoin(ORIGIN, attrs['href'])
            if urlparse(url).scheme in ('http', 'https'): self.links.append(url)
    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'svg'): self.skip -= 1
        if tag == 'h2': self.in_title = False
        if tag in ('p', 'div', 'section', 'li', 'h2', 'h3', 'h4', 'dt', 'dd'): self.parts.append('\n')
    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)
            if self.in_title: self.title_parts.append(data)

def read_verified(metadata):
    path = Path(metadata['snapshotPath'])
    if path.parent != ROOT or path.suffix != '.html': raise ValueError('Unexpected archive path')
    data = path.read_bytes()
    if len(data) != metadata['bytes'] or hashlib.sha256(data).hexdigest() != metadata['sha256']:
        raise ValueError(f'Changed original: {path}')
    return data.decode('utf-8')

def import_records(capture):
    html = read_verified(capture['catalogue'])
    scripts = re.findall(r'<script[^>]*data-drupal-selector="drupal-settings-json"[^>]*>([\s\S]*?)</script>', html)
    if len(scripts) != 1: raise ValueError('Ambiguous catalogue')
    data = json.loads(scripts[0])['pag_actuacions']
    entries = data['actuacions']['result']
    details = {item['id']: item for item in capture['details']}
    ids = [item['nid'] for item in entries]
    if len(entries) != 1248 or len(set(ids)) != 1248 or int(data['actuacions']['total']) != 1248:
        raise ValueError('Incomplete catalogue')
    if len(capture['details']) != 1248 or set(ids) != set(details): raise ValueError('Missing or duplicate details')
    topics = {item['id']: item['nom'] for item in data['ambits']}
    states = {item['fitxa_id']: item['nom'] for item in data['taxonomies']['estats']}
    records = []
    for entry in entries:
        metadata = details[entry['nid']]
        if metadata['url'] != ORIGIN + entry['node']: raise ValueError('Detail URL mismatch')
        original = read_verified(metadata)
        articles = re.findall(r'<article\b[^>]*class="page-actuacio"[^>]*>([\s\S]*?)</article>', original)
        if len(articles) != 1: raise ValueError(f'Ambiguous detail {entry["nid"]}')
        parser = ArticleText()
        parser.feed(articles[0])
        title = re.sub(r'\s+', ' ', ''.join(parser.title_parts)).strip()
        if title != re.sub(r'\s+', ' ', entry['title']).strip(): raise ValueError(f'Title mismatch {entry["nid"]}: {title}')
        paragraphs = [re.sub(r'\s+', ' ', line).strip() for line in ''.join(parser.parts).split('\n')]
        paragraphs = [line for line in paragraphs if line]
        if not paragraphs or paragraphs[0] != title: raise ValueError('Missing title/body boundary')
        body = '\n'.join(paragraphs[1:])
        if not body: raise ValueError(f'Empty detail {entry["nid"]}')
        if entry['estat'] not in states or any(item not in topics for item in entry['ambit']): raise ValueError('Unknown taxonomy')
        records.append({
            'id': 'm-08019-' + entry['nid'], 'officialId': entry['nid'], 'text': title,
            'topic': ' · '.join(topics[item] for item in entry['ambit']),
            'page': None, 'endPage': None, 'sourceId': 'barcelona-catalogue-2026',
            'detailText': body, 'detailLinks': list(dict.fromkeys(parser.links)),
            'governmentState': states[entry['estat']], 'governmentProgress': entry['percentatge'],
            'webSource': {key: metadata[key] for key in ['url', 'sha256', 'retrievedAt']},
        })
    return records

def main():
    capture = json.loads((ROOT/'capture.json').read_text(encoding='utf-8'))
    records = import_records(capture)
    inventory = {
        'schemaVersion': 1, 'jurisdictionId': 'm-08019', 'mandateId': 'm-08019-2023',
        'mandateLabel': 'Ayuntamiento de Barcelona · mandato 2023–2027',
        'sourceId': 'barcelona-catalogue-2026', 'mandateSourceId': 'barcelona-plan-portal',
        'registerSourceId': 'barcelona-plan-register', 'sourceLabel': 'Catálogo municipal',
        'sourceSha256': capture['catalogue']['sha256'], 'inventoryTotal': len(records),
        'textLanguage': 'ca', 'inventoryKind': 'action-catalogue',
        'governmentCutoff': capture['catalogue']['retrievedAt'][:10], 'governmentDateKind': 'capture',
        'scope': 'Las 1.248 actuaciones publicadas en el catálogo municipal consultado, con sus fichas completas. Es un catálogo de seguimiento vivo, no una reconstrucción de todas las promesas electorales originales ni del PDF del plan. Incluye proyectos iniciados antes de este mandato.',
        'textNote': 'Se conservan los títulos, el texto de las fichas, enlaces relacionados y estados declarados, en catalán. Las fechas indican cuándo se capturó cada página, no la fecha de ejecución. Finalitzada y los porcentajes son declaraciones municipales. El PDF del plan no se pudo recuperar del repositorio: cotejarlo y reconstruir los cambios del catálogo sigue pendiente.',
        'records': records,
    }
    Path('data/mandate/barcelona-inventory.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Barcelona: {len(records)} fichas completas, sin crear revisiones.')

if __name__ == '__main__': main()

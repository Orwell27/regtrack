"""Preserve the original 100 commitment sheets and the separate municipal follow-up."""
import hashlib
import json
import re
import unicodedata
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin

ROOT = Path('data/mandate/evidence/territorial')
COUNTS = [25, 23, 9, 14, 17, 12]
TOPICS = ['Ciudad de las personas, cuidadora e inclusiva', 'Ciudad sostenible', 'Ciudad competitiva',
          'Ciudad activa y con vida', 'Ciudad de los barrios y pueblos', 'Gobierno cercano y eficaz']


class Text(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.links = []
    def handle_data(self, data):
        self.parts.append(data)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'br': self.parts.append('\n')
        if tag == 'a' and attrs.get('href'):
            self.links.append(urljoin('https://www.vitoria-gasteiz.org', attrs['href']))
    def handle_endtag(self, tag):
        if tag in ('p', 'div', 'li', 'h4', 'dt', 'dd', 'progress'): self.parts.append('\n')
    def text(self):
        return '\n'.join(line for part in ''.join(self.parts).split('\n') if (line := re.sub(r'\s+', ' ', part).strip()))


def normalized(value):
    value = ''.join(c for c in unicodedata.normalize('NFD', value.lower()) if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]', '', value)


def parse_programme(pages):
    if len(pages) != 116 or [p['page'] for p in pages] != list(range(1, 117)):
        raise ValueError('Incomplete programme pages')
    records = []
    expected = [f'{axis}.{number}' for axis, count in enumerate(COUNTS, 1) for number in range(1, count + 1)]
    for page in pages:
        matches = list(re.finditer(r'Compromiso\s+(\d+\.\d+)\s+', page['text']))
        if not matches: continue
        if len(matches) != 1: raise ValueError('Duplicate commitment on page')
        match = matches[0]
        official_id = match[1]
        if len(records) >= 100 or official_id != expected[len(records)]: raise ValueError('Invalid commitment sequence')
        title = re.split(r'\n(?:CONCEJAL|HITOS|OBJETIVO|DEPARTAMENTO|DESCRIPCI)', page['text'][match.end():])[0]
        title = re.sub(r'\s+', ' ', title).strip()
        body = page['text'].replace('PROGRAMA DE GOBIERNO 2023-2027', '').strip()
        for heading in ('HITOS PRINCIPALES', 'BENEFICIOS PARA LA CIUDADANÍA', 'DESCRIPCIÓN DEL'):
            if heading not in body: raise ValueError(f'Missing commitment section {official_id}: {heading}')
        if not re.search(r'OBJETIVO/S|OBJETIVOS(?! DE)', body): raise ValueError(f'Missing objectives: {official_id}')
        records.append({'id': 'm-01059-' + official_id, 'officialId': official_id, 'text': title,
                        'topic': TOPICS[int(official_id.split('.')[0])-1], 'page': page['page'], 'endPage': page['page'],
                        'sourceId': 'vitoria-programme-2023', 'programmeText': body})
    if len(records) != 100: raise ValueError('Incomplete commitment inventory')
    return records


def parse_report(html):
    sections = re.findall(r'<section class="a29-compromiso a29-level-3 a29-accordion">([\s\S]*?)</section>', html)
    if len(sections) != 100: raise ValueError('Incomplete municipal follow-up')
    records = []
    groups = [[7, 9, 9], [6, 8, 9], [3, 6], [11, 3], [9, 8], [6, 6]]
    expected = [f'{axis}.{group}.{number}' for axis, counts in enumerate(groups, 1)
                for group, count in enumerate(counts, 1) for number in range(1, count+1)]
    for section in sections:
        heading = re.search(r'<h4 class="compromiso">([\s\S]*?)</h4>', section)
        anchor = re.search(r'<header[^>]+id="([^"]+)"', section)
        progress = re.search(r'<progress value="(\d+)" max="100">(\d+)%</progress>', section)
        if not heading or not anchor or not progress or progress[1] != progress[2] or not 0 <= int(progress[1]) <= 100:
            raise ValueError('Invalid municipal follow-up header')
        title_parser = Text(); title_parser.feed(heading[1])
        parts = re.fullmatch(r'(\d+\.\d+\.\d+)\s+-\s+(.+)', title_parser.text())
        if not parts: raise ValueError('Invalid municipal follow-up identifier')
        if parts[1] != expected[len(records)]: raise ValueError('Invalid municipal follow-up sequence')
        body = Text(); body.feed(section)
        records.append({'officialId': parts[1], 'title': parts[2], 'text': body.text(),
                        'percentage': int(progress[1]), 'sourceId': 'vitoria-report-2026',
                        'anchor': anchor[1], 'links': list(dict.fromkeys(body.links))})
    if len({r['officialId'] for r in records}) != 100 or len({r['anchor'] for r in records}) != 100:
        raise ValueError('Duplicate municipal follow-up')
    return records


def verified_source(source_id, sources):
    source = next(s for s in sources if s['id'] == source_id)
    data = Path(source['snapshotPath']).read_bytes()
    if len(data) != source['bytes'] or hashlib.sha256(data).hexdigest() != source['sha256']:
        raise ValueError('Changed source original')
    return source, data


def import_inventory():
    sources = json.loads((ROOT/'sources.json').read_text(encoding='utf-8'))
    source, _ = verified_source('vitoria-programme-2023', sources)
    report_source, html = verified_source('vitoria-report-2026', sources)
    extraction = json.loads((ROOT/'vitoria-programme-2023.pages.json').read_text(encoding='utf-8'))
    if extraction['sourceSha256'] != source['sha256']: raise ValueError('Different programme extraction')
    records = parse_programme(extraction['pages'])
    followup = parse_report(html.decode('utf-8'))
    differences = []
    for record, report in zip(records, followup):
        if record['officialId'].split('.')[0] != report['officialId'].split('.')[0]: raise ValueError('Axis mismatch')
        if normalized(record['text']) != normalized(report['title']): differences.append([record['officialId'], record['text'], report['title']])
    # A manual crosswalk must account for every altered title, never fuzzy-match silently.
    crosswalk = json.loads(Path('data/mandate/vitoria-title-differences.json').read_text(encoding='utf-8'))
    if differences != crosswalk: raise ValueError('Unreviewed title differences: ' + json.dumps(differences, ensure_ascii=False))
    for record, report in zip(records, followup):
        anchor = report.pop('anchor')
        record['governmentReport'] = {**report, 'url': report_source['url'].split('#')[0] + '#' + anchor}
    inventory = {
        'schemaVersion': 1, 'jurisdictionId': 'm-01059', 'mandateId': 'm-01059-2023',
        'mandateLabel': 'Ayuntamiento de Vitoria-Gasteiz · mandato 2023–2027',
        'sourceId': source['id'], 'registerSourceId': 'vitoria-programme-register', 'sourceLabel': 'Programa original',
        'sourceSha256': source['sha256'], 'inventoryTotal': 100, 'textLanguage': 'es',
        'scope': 'Los 100 compromisos y sus fichas completas del Programa de Gobierno 2023–2027, agrupados en seis ejes. Se conserva por separado el seguimiento publicado por el Ayuntamiento: no es una evaluación de RegTrack.',
        'textNote': 'El programa original contiene objetivos, descripción, hitos y beneficios previstos: se conserva el texto completo de cada página, con su orden de extracción. El seguimiento usa otra numeración y presenta cambios de título, que no sustituyen al original. El portal indica actualización de 29 de julio de 2026 y numerosas fichas sitúan sus datos en junio; el texto conserva los cortes particulares. Sus porcentajes representan etapas definidas por el Ayuntamiento y no mediciones independientes de impacto.',
        'records': records,
    }
    return inventory


def main():
    inventory = import_inventory()
    Path('data/mandate/vitoria-inventory.json').write_text(json.dumps(inventory, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print('Vitoria-Gasteiz: 100 compromisos originales y 100 seguimientos municipales separados.')


if __name__ == '__main__': main()

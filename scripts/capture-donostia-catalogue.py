"""Archive the public catalogue, project descriptions and separately loaded follow-up."""
import concurrent.futures
import hashlib
import html
import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit, parse_qs

ROOT = Path('data/mandate/evidence/territorial/donostia')
BASE = 'https://www.donostia.eus/es/programa-gobierno-23-27'


def capture(key, url, required):
    metadata_path = ROOT / (key + '.meta.json')
    if metadata_path.exists():
        metadata = json.loads(metadata_path.read_text(encoding='utf-8'))
        data = Path(metadata['snapshotPath']).read_bytes()
        if metadata['url'] != url or metadata['bytes'] != len(data) or metadata['sha256'] != hashlib.sha256(data).hexdigest():
            raise ValueError('Changed archive: ' + key)
        return metadata, data.decode('utf-8')
    with urllib.request.urlopen(url, timeout=35) as response:
        if response.status != 200 or response.url != url: raise ValueError('Unexpected response: ' + key)
        data = response.read()
    text = data.decode('utf-8')
    if required not in text: raise ValueError('Unrecognized document: ' + key)
    path = ROOT / (key + '.html')
    with path.open('xb') as file: file.write(data)
    metadata = dict(id=key, url=url, snapshotPath=path.as_posix(), bytes=len(data),
                    sha256=hashlib.sha256(data).hexdigest(), retrievedAt=datetime.now(timezone.utc).isoformat())
    with metadata_path.open('x', encoding='utf-8', newline='\n') as file:
        file.write(json.dumps(metadata, ensure_ascii=False, indent=2)+'\n')
    return metadata, text


def project(url):
    slug = url.rsplit('/', 1)[1]
    if not re.fullmatch(r'[a-z0-9-]+', slug): raise ValueError('Unexpected project route')
    detail, text = capture(slug, url, 'dtik-wave__item__text')
    ids = re.findall(r'<input type="hidden" id="projectId" value="(\d+)"', text)
    urls = re.findall(r"(?:const|var|let) urlPortlet\s*=\s*'([^']+)'", text)
    if len(ids) != 1 or len(urls) != 1:
        return dict(slug=slug, detail=detail, followup=None, issue='No unique projectId/resource URL', ids=ids)
    resource_url = html.unescape(urls[0]) + '&projectId=' + ids[0]
    parsed = urlsplit(resource_url)
    if parsed.scheme != 'https' or parsed.netloc != 'www.donostia.eus' or parsed.path != urlsplit(url).path:
        raise ValueError('Resource outside original project')
    allowed = {'assetEntryId', 'p_p_cacheability', 'p_p_id', 'p_p_lifecycle', 'p_p_mode', 'p_p_resource_id', 'p_p_state', 'projectId'}
    if set(parse_qs(parsed.query)) - allowed: raise ValueError('Unexpected resource parameter')
    followup, body = capture(slug+'-followup', resource_url, 'Estado')
    return dict(slug=slug, officialId=ids[0], detail=detail, followup=followup)


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    portal, _ = capture('portal', BASE, '127')
    catalogue, text = capture('catalogue', BASE+'/proyectos', 'Todos los proyectos')
    urls = list(dict.fromkeys(html.unescape(u) for u in re.findall(r'href="('+re.escape(BASE)+r'/proyectos/[^"?#]+)"', text)))
    if len(urls) != 129: raise ValueError('Changed catalogue scope; review before capture')
    projects = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for item in pool.map(project, urls):
            projects.append(item)
            if len(projects) % 20 == 0: print(f'{len(projects)}/{len(urls)} archived', flush=True)
    index = dict(portal=portal, catalogue=catalogue, projects=projects)
    (ROOT/'capture.json').write_text(json.dumps(index, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    ids = [p.get('officialId') for p in projects]
    print(json.dumps(dict(projects=len(projects), followups=sum(p['followup'] is not None for p in projects), uniqueIds=len(set(i for i in ids if i)), missingFollowup=sum(p['followup'] is None for p in projects)),ensure_ascii=False),flush=True)


if __name__ == '__main__': main()

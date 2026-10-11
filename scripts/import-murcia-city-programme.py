"""Preserve Ballesta's 2023 inaugural speech; later speeches are separate evidence."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/murcia-city')
SECTIONS = [
    (18, 'Creo en la política basada', 'Ética, diálogo y acuerdos'),
    (18, 'Creo en la ciudad como lugar', 'Convivencia cívica'),
    (18, 'Creo en la forma más inteligente', 'Proyecto de ciudad y capital humano'),
    (18, 'Creo en una Murcia armónica', 'Bienestar, honestidad y austeridad'),
    (18, 'Creo que la mera gestión', 'Transformación y colaboración'),
    (19, 'Creo en una Murcia vertebrada', 'Equilibrio territorial y servicios'),
    (19, 'Creo en el desarrollo sostenible', 'Sostenibilidad y conservación de la huerta'),
    (19, 'Creo que los proyectos y planes', 'Planeamiento, comercio y acceso a la vivienda'),
    (19, 'Creo en una Murcia abierta', 'Pluralidad y libertad civil'),
    (19, 'Creo en una Murcia vibrante', 'Cultura accesible'),
    (19, 'Creo en una Murcia de oportunidades', 'Oportunidades para nuevas generaciones'),
]


def body_lines(pages):
    if [p['page'] for p in pages] != list(range(1, 22)):
        raise ValueError('Changed page sequence')
    result = []
    for p in pages[15:]:
        lines = p['text'].splitlines()
        if lines[0].strip() != str(p['page']) or lines[1] != 'Ayuntamiento de Murcia' or lines[5].strip() != 'C.I.F. P-3003000 A':
            raise ValueError('Changed page header')
        if lines.count('Nº Acta: 202300010') != 1 or f"Página {p['page']} de 21" not in lines:
            raise ValueError('Changed page footer')
        result.extend(dict(page=p['page'], index=i, text=t) for i, t in enumerate(lines) if 6 <= i < lines.index('Nº Acta: 202300010') and t.strip())
    return result


def parse_pages(pages):
    lines = body_lines(pages)
    flat = ''
    spans = []
    for f in lines:
        spans.append((len(flat), len(flat) + len(f['text']), f))
        flat += f['text'] + '\n'

    def anchor(page, text):
        pattern = re.escape(text).replace(r'\ ', r'\s+')
        hits = [m.start() for m in re.finditer(pattern, flat) if any(a <= m.start() < b and f['page'] == page for a, b, f in spans)]
        if len(hits) != 1:
            raise ValueError('Missing or duplicate anchor: ' + text)
        return hits[0]

    start = anchor(16, 'El Alcalde, D. José Francisco Ballesta Germán')
    end = anchor(21, 'Después de esta intervención,')
    end = next(a for a, b, _ in spans if a <= end < b)
    bounds = [anchor(p, a) for p, a, _ in SECTIONS] + [anchor(19, 'Ya ven, no nos faltan')]
    if not start < bounds[0] or bounds != sorted(set(bounds)) or not bounds[-1] < end:
        raise ValueError('Changed speech order')

    def item(id, topic, a, b):
        fragments = []
        for x, y, f in spans:
            lo, hi = max(a, x), min(b, y)
            if hi > lo:
                fragments.append(dict(page=f['page'], index=f['index'], start=lo-x, end=hi-x, text=f['text'][lo-x:hi-x]))
        raw = '\n'.join(f['text'] for f in fragments)
        return dict(id=id, topic=topic, page=fragments[0]['page'], endPage=fragments[-1]['page'], rawText=raw, text=' '.join(raw.split()), fragments=fragments)

    records = []
    for n, (_, _, topic) in enumerate(SECTIONS):
        r = item(f'm-30030-{n+1}', topic, bounds[n], bounds[n+1])
        r.update(officialId=f'Sección editorial {n+1}', sourceId='murcia-city-programme', sourceNote='Sección editorial del discurso de José Ballesta de 17/06/2023, sin numeración oficial. Son orientaciones generales, no promesas únicas con metas cuantificadas; no se incorporan aquí las intervenciones de otros candidatos ni el discurso de Rebeca Pérez de 2026.')
        records.append(r)
    contexts = [item('m-30030-context-1', 'Apertura, responsabilidad institucional y moderación', start, bounds[0]), item('m-30030-context-2', 'Recapitulación, agradecimientos y cierre', bounds[-1], end)]
    return records, contexts


def build_inventory():
    meta = json.loads((ROOT/'investiture-2023.meta.json').read_text(encoding='utf-8'))
    for file, key in [('investiture-2023.pdf', 'sha256'), ('investiture-2023.pages.json', 'extractionSha256')]:
        if hashlib.sha256((ROOT/file).read_bytes()).hexdigest() != meta[key]:
            raise ValueError('Changed evidence: ' + file)
    records, contexts = parse_pages(json.loads((ROOT/'investiture-2023.pages.json').read_text(encoding='utf-8')))
    return dict(schemaVersion=1, jurisdictionId='m-30030', mandateId='m-30030-2023', mandateLabel='Murcia · mandato municipal 2023–2027', sourceId='murcia-city-programme', mandateSourceId='murcia-city-programme', registerSourceId='murcia-city-register', sourceLabel='Discurso de investidura municipal · 17/06/2023', sourceSha256=meta['sha256'], importedAt='2026-10-11', inventoryKind='speech-sections', transcriptionPending=True, transcriptionMethod='digital', inventoryTotal=len(records), scope='11 secciones editoriales del discurso de José Ballesta tras su elección de 17/06/2023, páginas 16–21. Apertura y cierre se conservan aparte. No equivalen a 11 promesas únicas ni al programa electoral completo.', textNote='Mandato municipal 2023–2027, distinto del gobierno autonómico. El acta de 2023 recoge la elección de Ballesta con 15 votos (p. 15). Tras la vacante, el decreto de 11/05/2026 mantiene delegaciones con Rebeca Pérez en funciones; el acta de 22/05/2026 acredita su elección con 15 votos y 14 en blanco (p. 8). El relevo no reinicia el mandato ni atribuye a Pérez la autoría del discurso de 2023. La referencia a un decreto de 11/05/2025 en la p. 1 del acta de 2026 discrepa del decreto capturado, fechado en 2026; se conserva el original sin corregirlo. Las firmas impresas de las actas son de 26/07/2023 y 26/06/2026: no son las fechas de las sesiones y no se han validado electrónicamente. El programa electoral de 2023 y sus propuestas por pedanía, así como los anuncios posteriores y el discurso completo de 2026, siguen pendientes de conciliación con el inventario. Cotejo íntegro y revisión humana independiente pendientes.', contextBlocks=contexts, records=records)


if __name__ == '__main__':
    inventory = build_inventory()
    Path('data/mandate/murcia-city-inventory.json').write_text(json.dumps(inventory, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print('Murcia municipal:', inventory['inventoryTotal'], 'secciones')

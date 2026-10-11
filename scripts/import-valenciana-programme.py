"""Preserve the complete initial investiture speech as editorial thematic sections."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/valenciana')
# These anchors delimit discourse, not an official numbered list of promises.
SECTIONS = [
 (2, 'Crec que és important', 'Principios, continuidad y balance atribuido al candidato'),
 (3, 'Senyories, si esta cambra m’atorga', 'Petición de perdón a las víctimas de las riadas'),
 (3, 'Señorías, la barrancada', 'Reconstrucción y coordinación entre administraciones'),
 (4, 'En primer lloc, senyories, vull referir-me', 'Sector primario: comercio, agua y apoyo'),
 (5, 'El que estem demanant és rigor', 'Defensa de la continuidad de Cofrentes'),
 (5, 'Señorías, (remors) no hace falta', 'Infraestructuras hidráulicas y presupuesto autonómico'),
 (5, 'Pero, señorías, esto no lo vamos a poder hacer solos.', 'Reivindicación de obras estatales y acciones legales'),
 (6, 'Senyores i senyors diputats, en este pacte', 'Inmigración: propuestas y valoraciones del candidato'),
 (7, 'Miren, señorías, otro de los pilares', 'Estrategia fiscal y gasto político'),
 (7, 'Señorías, sigo hablando claro. Cuando hablamos', 'Financiación autonómica y fondo de nivelación'),
 (8, 'Senyories, debemos reducir la presión hospitalaria', 'Urgencias permanentes en municipios de más de 50.000 habitantes'),
 (8, 'Por eso, señorías, si también me conceden', 'Gratuidad del primer curso universitario con condiciones'),
 (8, 'Senyories, vull rescatar ací una proposta', 'Deducciones por formación y práctica musical'),
 (9, 'Señorías, como he dicho anteriormente', 'Ampliación de las deducciones autonómicas'),
 (9, 'Miren, yo soy alcalde de un municipio', 'Segunda ley de simplificación administrativa'),
 (9, 'En materia de agricultura, señorías, les anuncio', 'Fondos del Consell de l’Horta y ayudas directas'),
 (9, 'Y, además, les anuncio, señorías, una convocatoria', 'Modernización agraria y ganadera'),
 (9, 'Por eso, también vamos a impulsar una estrategia', 'Ganadería extensiva y tributación de animales'),
 (9, 'Y, además, les anuncio, para nuestros pescadores', 'Inversiones en lonjas'),
]

def body_lines(pages):
    if [p['page'] for p in pages] != list(range(1,39)):
        raise ValueError('Missing, duplicate or reordered diary page')
    result=[]
    for p in pages[1:10]:
        lines=[(i,t.strip()) for i,t in enumerate(p['text'].splitlines()) if t.strip()]
        if lines[0][1] != f"Número 78 ¦ 27-11-2025 Pàg. {p['page']+4150}":
            raise ValueError('Changed printed page or session')
        result.extend(dict(page=p['page'],index=i,text=t) for i,t in lines[1:])
    return result

def parse_pages(pages):
    lines=body_lines(pages)
    starts=[]
    for page,anchor,_ in SECTIONS+[(9,'Senyores i senyors diputats, acabe ja','')]:
        matches=[i for i,f in enumerate(lines) if f['page']==page and f['text'].startswith(anchor)]
        if len(matches)!=1: raise ValueError('Missing or duplicate speech anchor: '+anchor)
        starts.append(matches[0])
    ends=[i for i,f in enumerate(lines) if f['page']==10 and f['text']=='Moltíssimes gràcies. (Aplaudiments)']
    if len(ends)!=1 or starts!=sorted(set(starts)):raise ValueError('Changed speech boundaries')
    end=ends[0]+1
    if end<=starts[-1] or lines[end]['text']!='La senyora presidenta:':raise ValueError('Changed speaker boundary')
    def item(id,topic,fragments):
        raw='\n'.join(f['text'] for f in fragments)
        # PDF soft hyphen is U+0002. Only join that explicit layout marker.
        text=' '.join(re.sub(r'\x02\s*','',raw).split())
        return dict(id=id,topic=topic,page=fragments[0]['page'],endPage=fragments[-1]['page'],
            rawText=raw,text=text,fragments=fragments)
    records=[]
    for n,(_,_,topic) in enumerate(SECTIONS):
        row=item(f'r-10-{n+1}',topic,lines[starts[n]:starts[n+1]])
        row.update(officialId=f'Sección editorial {n+1}',sourceId='valenciana-programme',
            sourceNote='Agrupación temática editorial del discurso inicial, sin numeración oficial. Puede contener varias propuestas, balances declarados y valoraciones políticas atribuidas al candidato. Conserva las incidencias parlamentarias identificadas en el diario. No equivale a una promesa única ni a un hecho corroborado.')
        records.append(row)
    contexts=[item('r-10-context-1','Apertura parlamentaria y saludo',lines[:starts[0]]),
        item('r-10-context-2','Cierre y recapitulación del candidato',lines[starts[-1]:end])]
    return records,contexts

def build_inventory():
    meta=json.loads((ROOT/'programme.meta.json').read_text(encoding='utf-8'))
    for name,key in [('programme.pdf','sha256'),('programme.pages.json','extractionSha256')]:
        if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=meta[key]:raise ValueError('Changed evidence: '+name)
    records,contexts=parse_pages(json.loads((ROOT/'programme.pages.json').read_text(encoding='utf-8')))
    return dict(schemaVersion=1,jurisdictionId='r-10',mandateId='r-10-2025',
        mandateLabel='Comunitat Valenciana · investidura de noviembre de 2025',
        sourceId='valenciana-programme',mandateSourceId='valenciana-programme',registerSourceId='valenciana-appointment',
        sourceLabel='Discurso inicial de investidura · 27/11/2025',sourceSha256=meta['sha256'],
        importedAt='2026-10-11',inventoryKind='speech-sections',transcriptionPending=True,transcriptionMethod='digital',
        inventoryTotal=len(records),
        scope='19 secciones temáticas editoriales del discurso inicial de investidura de Pérez Llorca, páginas PDF 2–10 del Diario de Sesiones de 27/11/2025. Incluyen propuestas, antecedentes y valoraciones; no son 19 promesas únicas. Apertura y recapitulación se conservan como contexto.',
        textNote='Original parlamentario de 38 páginas, en valenciano y castellano, conservado con su extracción y huellas. Los identificadores y títulos son editoriales; las páginas enlazadas son las del PDF, no las impresas (4152–4160 para el discurso inicial). Se unen únicamente cortes de palabra marcados por el PDF. Las intervenciones de otros grupos y las réplicas posteriores del candidato quedan fuera de esta importación y siguen pendientes de conciliación, junto con compromisos anteriores que continúan y anuncios posteriores. La agrupación no equivale al recuento de medidas comunicado por el Gobierno. El diario acredita qué se dijo, no la veracidad de sus balances o valoraciones. No es un pacto firmado ni un inventario cerrado del mandato. Cotejo íntegro y revisión humana independiente pendientes.',
        contextBlocks=contexts,records=records)

if __name__=='__main__':
    inventory=build_inventory()
    Path('data/mandate/valenciana-inventory.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Valenciana:',inventory['inventoryTotal'],'secciones editoriales y',len(inventory['contextBlocks']),'contextos')

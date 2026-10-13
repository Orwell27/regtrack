"""Import the government's initial 861 commitments without implying complete mandate coverage."""
from pathlib import Path
import hashlib,json,re
ROOT=Path('data/mandate/evidence/territorial/clm')
AREAS={5:'Políticas sociales e igualdad',15:'Sanidad universal',22:'Educación y cultura',34:'Transparencia y buen gobierno',40:'Economía productiva',47:'Trabajo y empleo',53:'Sostenibilidad'}

def parse_pages(pages):
    if [p['page'] for p in pages]!=list(range(1,65)):raise ValueError('Missing or reordered PDF spread')
    records=[];contexts=[];current=None;topic='Presentación, índice y metodología';heading=False
    for page in pages:
        number=page['page']
        if number in AREAS:topic=AREAS[number];current=None
        for index,line in enumerate(page['lines']):
            text=line['text'];match=re.match(r'^([1-9]\d{0,2})(?:\s+(.*))?$',text)
            is_number=number>=6 and 25.0 in line['sizes'] and match
            is_heading=max(line['sizes'])>=28
            if is_number:
                ordinal=int(match[1])
                if ordinal!=len(records)+1:raise ValueError('Missing, duplicate or reordered commitment')
                links=[a['url'] for a in page['links'] if a['top']<=line['y']+6<=a['bottom'] and a['x']-1<=line['x']<=a['right'] and '/legislatura/3/' in a['url']]
                if len(set(links))!=1:raise ValueError(f'Commitment {ordinal} page {number} without unique original follow-up link: {links}')
                current=dict(id=f'r-08-{ordinal}',officialId=str(ordinal),topic=topic,page=number,endPage=number,sourceId='clm-programme',governmentUrl=links[0],fragments=[])
                records.append(current);text=match[2] or ''
            elif current is None or (is_heading and not heading):
                current=dict(id=f'r-08-context-{len(contexts)+1}',topic=topic,page=number,endPage=number,fragments=[])
                contexts.append(current)
            current['fragments'].append(dict(page=number,line=index,column=line['column'],text=text))
            current['endPage']=number;heading=is_heading
    if len(records)!=861:raise ValueError('Expected 861 initial commitments')
    for item in records+contexts:
        item['rawText']='\n'.join(f['text'] for f in item['fragments'])
        text=re.sub(r'(?<=\w)[\x02\u00ad]\s*\n\s*(?=\w)','',item['rawText'])
        item['text']=' '.join(text.replace('\x02','-').replace('\u00ad','').split())
        if not item['text']:raise ValueError('Empty documentary unit')
    return records,contexts

def build_inventory():
    meta=json.loads((ROOT/'programme.meta.json').read_text(encoding='utf-8'))
    for name,key in [('programme.pdf','sha256'),('programme.pages.json','extractionSha256'),('programme.ordered.json','orderedSha256')]:
        if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=meta[key]:raise ValueError('Changed original or extraction: '+name)
    records,contexts=parse_pages(json.loads((ROOT/'programme.ordered.json').read_text(encoding='utf-8')))
    return dict(schemaVersion=1,jurisdictionId='r-08',mandateId='r-08-2023',mandateLabel='Castilla-La Mancha · mandato 2023–2027',
      sourceId='clm-programme',mandateSourceId='clm-programme',registerSourceId='clm-programme-register',sourceLabel='Programa de Gobierno inicial',
      sourceSha256=meta['sha256'],importedAt='2026-10-11',textLanguage='es',inventoryKind='initial-programme',transcriptionMethod='digital',transcriptionPending=True,inventoryTotal=len(records),
      scope='861 compromisos del Programa de Gobierno inicial 2023–2027, agrupados por la Junta en siete áreas a partir del programa electoral, la campaña y la investidura. El propio documento prevé compromisos adicionales en debates posteriores: no constituye el inventario exhaustivo del mandato. Pendientes cotejo visual integral, conciliación con las formulaciones originales e incorporación de las ampliaciones.',
      textNote='PDF original de 64 páginas, mayoritariamente dobles páginas impresas. Los localizadores usan la página del PDF, no la numeración del folleto. Se conservan números originales, submedidas, continuaciones y contexto atribuido al Gobierno. Los enlaces originales a su seguimiento se archivan para facilitar el contraste, sin importar automáticamente sus estados o porcentajes. Un porcentaje medio de avance, una medida iniciada y una medida cumplida son magnitudes distintas. No hay revisión humana independiente registrada.',
      contextBlocks=contexts,records=records)

if __name__=='__main__':
    result=build_inventory();Path('data/mandate/clm-inventory.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print('CLM:',len(result['records']),'commitments;',len(result['contextBlocks']),'context blocks')

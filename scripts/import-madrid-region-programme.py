"""Import numbered regional commitments; retain every other body line as context."""
import hashlib,json,re
from pathlib import Path

ROOT=Path('data/mandate/evidence/territorial/madrid-region')
COUNTS=[38,24,43,32,42,30,71,22,21,20,26,49,24,17]
STARTS={6:1,11:2,15:3,21:4,26:5,32:6,36:7,45:8,48:9,52:10,55:11,60:12,65:13,68:14}
TOPICS=['Empleo y digitalización','Ciencia e innovación','Educación','Juventud','Familia y vida','Atención social y soledad','Salud','Medioambiente','Empresas y ciudadanos','Vivienda','Transporte','Cultura, turismo y deporte','Administración','Madrid al servicio de España']

def parse_pages(pages):
    if [p['page'] for p in pages]!=list(range(1,73)):
        raise ValueError('Missing or reordered PDF spread')
    records=[];contexts=[];counts=[0]*14;chapter=0;current=None;heading=False
    for page in pages:
        number=page['page']
        if number in STARTS:
            chapter=STARTS[number];current=None
        for index,line in enumerate(page['lines']):
            text=line['text'];match=re.match(r'^([1-9]\d?)\.([1-9]\d?)\.\s*(.*)$',text)
            is_heading=max(line['sizes'])>11.5
            if match and number>=6:
                section,ordinal=int(match[1]),int(match[2])
                if section!=chapter or ordinal!=counts[chapter-1]+1:
                    raise ValueError('Missing, duplicate or reordered commitment')
                counts[chapter-1]+=1
                current=dict(id=f'r-13-{section}-{ordinal}',officialId=f'{section}.{ordinal}',text='',topic=TOPICS[chapter-1],page=number,endPage=number,sourceId='madrid-region-programme',fragments=[])
                records.append(current);text=match[3]
            elif current is None or (is_heading and not heading):
                current=dict(id=f'r-13-context-{len(contexts)+1}',topic=TOPICS[chapter-1] if chapter else 'Portada, presentación e índice del autor',page=number,endPage=number,fragments=[])
                contexts.append(current)
            current['fragments'].append(dict(page=number,line=index,column=line['column'],text=text))
            current['endPage']=number;heading=is_heading
    if counts!=COUNTS or len(records)!=459:
        raise ValueError('Expected 459 numbered sections in 14 challenges')
    for item in records+contexts:
        item['rawText']='\n'.join(f['text'] for f in item['fragments'])
        # PDF discretionary hyphen sometimes encodes as U+0002.
        text=re.sub(r'(?<=\w)[\x02\u00ad]\s*\n\s*(?=\w)','',item['rawText'])
        text=text.replace('\x02','-').replace('\u00ad','')
        item['text']=' '.join(text.split())
        if not item['text']:raise ValueError('Empty documentary unit')
    return records,contexts

def build_inventory():
    meta=json.loads((ROOT/'programme.meta.json').read_text(encoding='utf-8'))
    for name,key in [('programme.pdf','sha256'),('programme.pages.json','extractionSha256'),('programme.ordered.json','orderedSha256')]:
        if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=meta[key]:
            raise ValueError('Changed original or extraction: '+name)
    records,contexts=parse_pages(json.loads((ROOT/'programme.ordered.json').read_text(encoding='utf-8')))
    return dict(schemaVersion=1,jurisdictionId='r-13',mandateId='r-13-2023',mandateLabel='Comunidad de Madrid · mandato 2023–2027',
        sourceId='madrid-region-programme',mandateSourceId='madrid-region-programme',registerSourceId='madrid-region-programme-register',
        sourceLabel='Programa autonómico PP 2023 · página del PDF',sourceSha256=meta['sha256'],importedAt='2026-10-11',textLanguage='es',
        inventoryKind='numbered-sections',transcriptionMethod='digital',transcriptionPending=True,inventoryTotal=len(records),
        scope='459 apartados numerados del programa autonómico del PP de 2023, distribuidos en 14 retos. Las submedidas permanecen dentro de cada apartado; las reiteraciones entre capítulos no se suman como actuaciones independientes. La Comunidad de Madrid y el Ayuntamiento de Madrid tienen inventarios distintos. Faltan el cotejo visual integral y la conciliación con investidura y compromisos posteriores.',
        textNote='Original publicado en la web de campaña del autor. El PDF de 72 páginas contiene dobles páginas del folleto: los enlaces y localizadores de RegTrack usan la página del PDF, no la impresa (por ejemplo, PDF 27 contiene las impresas 52–53). Se conserva el orden de las columnas, los números originales y los epígrafes y prólogos como contexto atribuido al partido. Hay formulaciones repetidas y horizontes que exceden el mandato. Las valoraciones del autor no son hechos certificados por RegTrack. La cifra de medidas activadas de un balance gubernamental no equivale a cumplimiento ni determina el estado de estos apartados. No hay revisión humana independiente registrada.',
        contextBlocks=contexts,records=records)

if __name__=='__main__':
    result=build_inventory()
    Path('data/mandate/madrid-region-inventory.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Madrid region:',result['inventoryTotal'],'sections;',len(result['contextBlocks']),'context blocks')

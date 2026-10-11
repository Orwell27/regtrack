"""Preserve the mayor's entire inaugural speech as editorial sections, not unique promises."""
import hashlib
import json
import re
from pathlib import Path
ROOT=Path('data/mandate/evidence/territorial/valencia')
SECTIONS=[
 (25,'Asumimos el reto de gobernar','Gobernanza, diálogo y acuerdos'),
 (25,'Debemos estar todos a la altura','Prioridades generales: demografía, economía, cultura y juventud'),
 (26,'Abordemos todos estos retos','Gestión y compromiso contra la violencia de género'),
 (26,'Dedicaré un tiempo muy breve','Rebaja fiscal y bonificaciones de plusvalía'),
 (26,'Junto a esta medida','Exclusión social y personas sin hogar'),
 (26,'El empleo debe','Empleo, licencias y simplificación administrativa'),
 (26,'Y sí, por fin','Vivienda pública, PAI y emancipación'),
 (26,'Pero déjenme que me recree','Atención a personas mayores'),
 (26,'Pero tampoco lo serán nuestros niños.','Familias, natalidad y educación infantil'),
 (26,'Finalmente y resumo,','Limpieza, arbolado y zonas infantiles'),
 (26,'Vamos a poner velocidad de crucero','Policía de barrio y ocupación ilegal'),
 (27,'Y les anuncio que la movilidad','Movilidad, transporte y aparcamiento'),
 (27,'No puc acabar les meues prioritats','Identidad, denominación bilingüe y tradiciones'),
 (27,'Tenemos muchos retos como ciudad','Patrimonio, huerta, pedanías y Albufera'),
 (27,'Les reconozco que en el tema de la Marina','Gestión y apertura ciudadana de la Marina'),
 (27,'La fachada marítima desde Nazaret','Transformación de la fachada marítima'),
 (27,'Uno de los grandes proyectos','Jardín del Turia y soterramiento de Serrería'),
 (27,'Es irrenunciable la puesta en marcha','Puerto, ferrocarril y financiación estatal'),
 (28,'València necesita un liderazgo firme','Representación y reivindicación de la ciudad'),
]
def body_lines(pages):
 if [p['page'] for p in pages]!=list(range(1,30)):raise ValueError('Changed page sequence')
 result=[]
 for p in pages[21:]:
  lines=p['text'].splitlines()
  if lines[1]!='CÒPIA INFORMATIVA (NO VERIFICABLE EN SEU ELECTRÒNICA)' or lines[9]!=f"EXTRAORDINARIA DE 17 DE JUNIO DE 2023 {p['page']}":raise ValueError('Changed page header')
  result.extend(dict(page=p['page'],index=i,text=t) for i,t in enumerate(lines) if i>=10 and t.strip())
 return result

def parse_pages(pages):
 lines=body_lines(pages); flat=''; spans=[]
 for f in lines:
  spans.append((len(flat),len(flat)+len(f['text']),f));flat+=f['text']+'\n'
 def anchor(page,text):
  pattern=re.escape(text).replace(r'\ ',r'\s+')
  hits=[m.start() for m in re.finditer(pattern,flat) if any(a<=m.start()<b and f['page']==page for a,b,f in spans)]
  if len(hits)!=1:raise ValueError('Missing or duplicate anchor: '+text)
  return hits[0]
 start=anchor(22,'Sra. Alcaldessa');end=anchor(29,'Moltes gràcies."')+len('Moltes gràcies."')
 if not flat[end:].lstrip().startswith('Celebrada la sesión constitutiva,'):raise ValueError('Changed closing boundary')
 bounds=[anchor(p,a) for p,a,_ in SECTIONS]+[anchor(28,'Termino, València vivió')]
 if not start<bounds[0] or bounds!=sorted(set(bounds)) or not bounds[-1]<end:raise ValueError('Changed speech order')
 def item(id,topic,a,b):
  fragments=[]
  for x,y,f in spans:
   lo,hi=max(a,x),min(b,y)
   if hi>lo:fragments.append(dict(page=f['page'],index=f['index'],start=lo-x,end=hi-x,text=f['text'][lo-x:hi-x]))
  raw='\n'.join(f['text'] for f in fragments)
  return dict(id=id,topic=topic,page=fragments[0]['page'],endPage=fragments[-1]['page'],rawText=raw,text=' '.join(raw.split()),fragments=fragments)
 records=[]
 for n,(_,_,topic) in enumerate(SECTIONS):
  r=item(f'm-46250-{n+1}',topic,bounds[n],bounds[n+1]);r.update(officialId=f'Sección editorial {n+1}',sourceId='valencia-programme',sourceNote='Agrupación temática editorial del discurso de la alcaldesa, sin numeración oficial. Puede reunir varias propuestas y valoraciones políticas; no equivale a una promesa única ni a hechos corroborados.');records.append(r)
 contexts=[item('m-46250-context-1','Saludo, antecedentes y apertura de la alcaldesa',start,bounds[0]),item('m-46250-context-2','Recapitulación, compromisos generales y agradecimientos',bounds[-1],end)]
 return records,contexts

def build_inventory():
 meta=json.loads((ROOT/'investiture.meta.json').read_text(encoding='utf-8'))
 for file,key in [('investiture.pdf','sha256'),('investiture.pages.json','extractionSha256')]:
  if hashlib.sha256((ROOT/file).read_bytes()).hexdigest()!=meta[key]:raise ValueError('Changed evidence: '+file)
 records,contexts=parse_pages(json.loads((ROOT/'investiture.pages.json').read_text(encoding='utf-8')))
 return dict(schemaVersion=1,jurisdictionId='m-46250',mandateId='m-46250-2023',mandateLabel='València · mandato municipal 2023–2027',sourceId='valencia-programme',mandateSourceId='valencia-programme',registerSourceId='valencia-register',sourceLabel='Discurso de investidura municipal · 17/06/2023',sourceSha256=meta['sha256'],importedAt='2026-10-11',inventoryKind='speech-sections',transcriptionPending=True,transcriptionMethod='digital',inventoryTotal=len(records),scope='19 secciones temáticas editoriales del discurso de María José Catalá en la sesión constitutiva municipal de 17/06/2023, páginas 22–29. Apertura y recapitulación se conservan aparte. No son 19 promesas únicas ni el programa electoral completo.',textNote='Copia informativa pública del acta municipal, de 29 páginas, con firma impresa fechada el 27/09/2023. No se ha validado una firma electrónica: el propio documento advierte que la copia no es verificable en sede. El acta acredita la intervención y la toma de posesión, no la veracidad de sus balances y valoraciones. Programa electoral completo, posibles acuerdos de gobierno y anuncios posteriores pendientes de conciliación. No se traslada el pacto autonómico a este ayuntamiento. Las secciones y títulos son editoriales; algunas reúnen varias políticas o competencias de otras administraciones. Cotejo íntegro y revisión humana independiente pendientes.',contextBlocks=contexts,records=records)
if __name__=='__main__':
 inventory=build_inventory();Path('data/mandate/valencia-inventory.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n');print('València:',inventory['inventoryTotal'],'secciones')

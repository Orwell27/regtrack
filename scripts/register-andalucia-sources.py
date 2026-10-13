"""Register source bytes and issuers; a different host is not independent evidence."""
import json
from pathlib import Path
ROOT=Path('data/mandate/evidence/territorial/andalucia')
ITEMS=[
 ('programme','programme','pp-vox-andalucia','Acuerdo de Gobierno PP–VOX de Andalucía: copia escaneada de 150 medidas','PP de Andalucía y VOX; copia alojada por elDiario.es','2026-07-02'),
 ('appointment','action','gob-espana','Real Decreto 558/2026: nombramiento de Juan Manuel Moreno Bonilla','Boletín Oficial del Estado','2026-07-04'),
 ('investiture-register','register','parlamento-andalucia','Registro parlamentario de la investidura de julio de 2026','Parlamento de Andalucía','2026-07-02'),
 ('infant-prices','action','gob-andalucia','Acuerdo de 25/03/2026: precios y bonificaciones en centros de la Junta desde 2026–2027','Boletín Oficial de la Junta de Andalucía','2026-03-31'),
 ('infant-course','government-report','gob-andalucia','Inicio del curso infantil: gratuidad de uno y dos años; cero años prevista para 2027–2028','Consejería de Educación','2026-09-03'),
 ('housing-start','government-report','gob-andalucia','Primera piedra de 691 viviendas y objetivo autonómico comunicado a cinco años','Presidencia de la Junta de Andalucía','2026-09-28'),
 ('housing-municipal','government-report','ayto-sevilla','FIBES R-1: licencia previa, inicio de obras y 691 alojamientos previstos','EMVISESA · Ayuntamiento de Sevilla','2026-09-30'),
 ('huelva-appeal','control','tarc-andalucia','Resolución 58/2026: inadmisión del recurso y levantamiento de suspensión del contrato del Materno Infantil','Tribunal Administrativo de Recursos Contractuales de Andalucía','2026-02-06'),
 ('huelva-award','government-report','gob-andalucia','Anuncio de adjudicación, firma prevista y plazo de obras del Materno Infantil de Huelva','Servicio Andaluz de Salud','2026-02-10'),
 ('huelva-progress','government-report','gob-andalucia','Actualización de septiembre sobre las obras del Materno Infantil de Huelva','Consejería de Presidencia, Sanidad y Emergencias','2026-09-28'),
]

def build_sources():
    result=[]
    for stem,role,family,title,publisher,date in ITEMS:
        m=json.loads((ROOT/(stem+'.meta.json')).read_text(encoding='utf-8'))
        result.append(dict(id='andalucia-'+stem,jurisdictionId='r-01',role=role,family=family,title=title,publisher=publisher,publicationDate=date,format=Path(m['snapshotPath']).suffix[1:],url=m['url'],snapshotPath=m['snapshotPath'],sha256=m['sha256'],bytes=m['bytes'],retrievedAt=m['retrievedAt'],captureType='bytes_originales'))
    return result

if __name__=='__main__':
    path=Path('data/mandate/evidence/territorial/sources.json');sources=json.loads(path.read_text(encoding='utf-8'))
    sources=[s for s in sources if s['jurisdictionId']!='r-01']+build_sources()
    path.write_text(json.dumps(sources,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')

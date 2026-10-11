"""Register original documents, with attribution to the producer of each source."""
import hashlib
import json
from pathlib import Path

ROOT = Path('data/mandate/evidence/territorial/ceuta')
SOURCES = [
    ('programme.pdf', 'ceuta-initial-programme-2023', 'Documento de trabajo · objetivos del 1 de julio al 31 de octubre de 2023', 'Gobierno de Ceuta', 'ciudad-ceuta', 'programme', None),
    ('register.html', 'ceuta-programme-register', 'Presentación del documento de objetivos del primer cuatrimestre', 'Gobierno de Ceuta', 'ciudad-ceuta', 'register', '2023-07-04'),
    ('bus-report-2023.pdf', 'ceuta-bus-report-2023', 'Informe global de obligaciones de servicio público de autobús · 2023', 'Ciudad Autónoma de Ceuta · alojado por el Ministerio de Transportes', 'ciudad-ceuta', 'government-report', None),
    ('bus-tender-2023.pdf', 'ceuta-bus-tender-2023', 'Mesa de contratación · propuesta de adjudicación de 14 autobuses híbridos', 'Ciudad Autónoma de Ceuta · Plataforma de Contratación del Sector Público', 'ciudad-ceuta', 'action', None),
    ('bus-announcement-2024.html', 'ceuta-bus-announcement-2024', 'Anuncio de llegada de los nuevos autobuses · previsión de servicio en mayo de 2024', 'Gobierno de Ceuta', 'ciudad-ceuta', 'government-report', '2024-04-02'),
    ('bus-service.html', 'ceuta-bus-service', 'Información operativa de autobuses urbanos', 'AMGEVICESA', 'ciudad-ceuta', 'government-report', None),
    ('bus-presentation-report.html', 'ceuta-bus-presentation-report', 'Crónica de la presentación de los nuevos autobuses · 29 de junio de 2024', 'El Faro de Ceuta · Carmen Echarri', 'grupo-faro', 'reporting', '2024-06-29'),
    ('cleaning-memorandum-2024.pdf', 'ceuta-cleaning-memorandum-2024', 'BOCCE extraordinario 17 · memoria y acuerdo de gestión directa de la limpieza', 'Ciudad Autónoma de Ceuta · BOCCE', 'ciudad-ceuta', 'action', '2024-03-14'),
    ('cleaning-record-2025.pdf', 'ceuta-cleaning-record-2025', 'Consejo de Gobierno · acta de 14 de enero de 2025 · obligaciones del antiguo contrato de limpieza', 'Ciudad Autónoma de Ceuta', 'ciudad-ceuta', 'action', None),
    ('budget-initial-2024.pdf', 'ceuta-budget-initial-2024', 'BOCCE extraordinario 72 · aprobación inicial del presupuesto de 2024', 'Ciudad Autónoma de Ceuta · BOCCE', 'ciudad-ceuta', 'action', '2023-11-22'),
]


def build_sources():
    result = []
    for filename, key, title, publisher, family, role, date in SOURCES:
        path = ROOT/filename
        meta = json.loads(path.with_suffix('.meta.json').read_text(encoding='utf-8'))
        data = path.read_bytes()
        if meta['snapshotPath'] != path.as_posix() or len(data) != meta['bytes'] or hashlib.sha256(data).hexdigest() != meta['sha256']:
            raise ValueError('Changed source original: '+filename)
        result.append(dict(meta, id=key, jurisdictionId='r-18', title=title, publisher=publisher,
            family=family, role=role, publicationDate=date, captureType='bytes_originales'))
    return result


if __name__ == '__main__':
    path = ROOT.parent/'sources.json'
    sources = json.loads(path.read_text(encoding='utf-8'))
    existing = {s['id']: s for s in sources}
    for source in build_sources():
        if source['id'] in existing and existing[source['id']] != source:
            raise ValueError('Changed registered source')
        if source['id'] not in existing:
            sources.append(source)
    path.write_text(json.dumps(sources, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print('Ceuta: ten original sources registered')

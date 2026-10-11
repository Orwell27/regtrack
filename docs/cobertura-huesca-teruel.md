# Huesca y Teruel: registro de fuentes y límites

Corte de consulta: 11/10/2026. Teruel sigue **sin inventario**. Huesca incorpora una selección de cinco puntos electorales, tres fichas parciales y trece componentes contrastados. El conjunto alcanza 31 administraciones con revisión parcial y 130 fichas; quedan 39 capitales sin inventario, además de compromisos sin revisar en los territorios ya incorporados. Ninguna administración está cerrada y no hay revisión humana independiente registrada.

## Teruel, municipio `m-44216`

El [portal oficial de plenos](https://plenos.teruel.es/?pleno=20230617) identifica la sesión de 17/06/2023. Su XML público enlaza `Acta_Pleno_Constitucion.pdf`; se descargó usando la URL construida por el propio portal. La primera descarga por `acta.php?id=<UUID>` no era la que usa ese enlace y devolvió `ERROR` con HTTP 200: no se archivó como evidencia. La descarga correcta comienza por `%PDF-`, tiene diez páginas y 221.434 bytes. SHA-256: `0124acfc26686c38707c875c87c7b30a7dffc1c2a9f9dfce0b548c6a94db4d77`.

Las páginas 8–9, extraídas y cotejadas visualmente, registran 11/5/3/2 votos y la proclamación de Emma Buj con mayoría absoluta. La página 9 remite al vídeo para las intervenciones; el PDF no contiene el discurso. Las firmas no se han validado criptográficamente. El XML y el acta muestran horas distintas para inicio/final de grabación y sesión; no se utilizan como discrepancia sobre la elección ni se reconstruye un discurso a partir de sus minutajes.

La [ficha de concejales](https://www.teruel.es/portal-de-transparencia/concejales-datos-biograficos-y-de-contacto/) identifica a Buj como alcaldesa desde 2016 y senadora desde julio de 2023. Leída con el lector web; la descarga directa del HTML respondió 403. Se conserva una **nota editorial** cuya huella no se atribuye a la página original. Ambas fuentes son del mismo ayuntamiento.

El [directorio de grupos](https://www.teruel.es/portal-de-transparencia/grupos-politicos/) identifica `ppteruel.es` como web del PP; la conexión HTTPS agotó el tiempo de espera. La dirección HTTP que publica el directorio sí devolvió una página de 1.206 bytes con un marco hacia `http://www.pparagon.es/ppteruel`, que a su vez agotó el tiempo de espera sin devolver contenido. No se confunde esa página contenedora con un programa recuperado. Pendientes: programa original municipal de 2023, transcripción cotejada del discurso, modificaciones posteriores, inventario, ejecución y resultados. Los programas de Teruel Existe, PSOE o de elecciones generales localizados no sustituyen al documento del gobierno municipal.

Original del acta, extracción y metadatos en `data/mandate/evidence/territorial/teruel/`. Solo el resumen, enlaces y límites cruzan a la vista pública; no los documentos archivados.

## Huesca, municipio `m-22125`

La web de campaña `lorenatieneunplan.es`, identificada por prensa contemporánea, no resolvió DNS. El índice CDX del archivo web respondió 503. La consulta pública [Wayback Availability para la dirección y 27/05/2023](https://archive.org/wayback/available?url=lorenatieneunplan.es&timestamp=20230527) respondió 200 con `archived_snapshots` vacío. Solo prueba el resultado de esa consulta, no la inexistencia de otras copias. `huesca.es` respondió 403 en el lector usado; no se eludió el control.

La [recopilación periodística de 16/05/2023](https://www.eldiariodehuesca.com/elecciones-2023/pp-huesca-apuesta-por-ciudad-activa-atractiva-vivir-en-entorno-unico_9174_102.html) contiene 18 encabezados temáticos. Se conserva como pista de búsqueda, sin copiarla como programa original ni asumir que contiene todas las promesas. El material de otras candidaturas o propuestas de asociaciones tampoco se atribuye al gobierno.

### Recuperación posterior durante la misma consulta

La variante `http://www.lorenatieneunplan.es/` sí devolvió una captura en Wayback Availability. Se recuperó la [portada archivada el 18/05/2023](https://web.archive.org/web/20230518144405/https://www.lorenatieneunplan.es/) y su enlace a un [PDF de lectura fácil de dos páginas](https://web.archive.org/web/20230518162522/https://www.lorenatieneunplan.es/wp-content/uploads/PP.pdf). Esto sustituye el estado inicial de «original no recuperado» por «selección recuperada; programa íntegro pendiente». Las cuatro rutas temáticas ensayadas en esa captura devolvieron 404. No se usa el texto de plantilla del pie de la portada como contenido electoral.

El PDF tiene 1.700.245 bytes y SHA-256 `b30d2b8b6521f43a50e420f008fd41fc1215581e428792dec8650811eac8f13e`. La descarga al primer timestamp devolvió un visor HTML con HTTP 200; solo se aceptó la respuesta posterior con cabecera `%PDF-` y dos páginas legibles. La huella de la portada corresponde al HTML reescrito por el servicio de archivo. La captura de mayo de 2023 no se presenta como fecha exacta de publicación.

La primera página describe expresamente una selección de cinco puntos. Se conservan los originales y la extracción digital, con errores de ligaturas, y se han cotejado visualmente ambas páginas. La vista pública contiene resúmenes editoriales de los puntos 1–5, todos en la página 2, con esa naturaleza indicada. No reproduce íntegramente el texto ni lo confunde con el programa completo. «Walqua» es la grafía del original. Las declaraciones políticas sobre otras ciudades no se convierten en hechos de RegTrack.

### Mandato y contraste

- El convenio inscrito el 09/07/2024 (firma impresa de 04/06/2024) identifica en su página 1 la toma de posesión de Lorena Orduna el 17/06/2023. El decreto de delegaciones publicado el 20/02/2026 y la comunicación universitaria de septiembre de 2026 la identifican como alcaldesa. No se afirma haber recuperado el acta de constitución ni validado criptográficamente las firmas.
- Vivienda: el BOP corregido de 01/10/2024 acredita una convocatoria de 391.941,86 euros para el Casco Histórico y Ensanche. No demuestra pagos, obras terminadas ni recuperación de solares. Se conserva la corrección de los puntos cuarto y quinto y se distingue plazo de solicitudes de ejecución.
- Universidad: el anuncio de 28/03/2023 precede a la alcaldía actual. La nota de 14/09/2026 comunica apertura e inversión entre varias instituciones. La ficha académica conservada en español sitúa los seis cursos en 2029–2030: capacidad del edificio no equivale a implantación completa. La versión del lector web estaba en inglés y no devolvía ese pasaje; la comprobación usa el HTML español descargado. Las tres fuentes son de Unizar, entidad ejecutora, no tres corroboraciones independientes.
- Impuestos: el BOP de 29/12/2025 acredita el cambio de coeficiente de turismos de 1,875 a 1,87 para 2026. El cambio relativo es aproximadamente 0,267 %. La modificación del IBI examinada se refiere a empleados; no se extrapola a vivienda general ni familias numerosas. Faltan la serie normativa del mandato y los efectos familiares.

Nueve documentos originales conservados en `data/mandate/evidence/territorial/huesca/`, agrupados en tres familias de origen. Los anuncios municipales del BOP no se clasifican como control independiente por publicarlos la Diputación. Ocio y patrimonio permanecen sin revisión. Quedan el programa íntegro, propuestas posteriores, componentes sin resolver y revisión humana independiente. Los errores DNS/403/503 se registran como incidencias de consulta, sin atribuirles incumplimiento político.

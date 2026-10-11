# Huesca y Teruel: registro de fuentes y límites

Corte de consulta: 11/10/2026. Ambas capitales siguen **sin inventario** y con cero compromisos revisados. Estas comprobaciones no elevan el número de administraciones con revisión ni el de fichas.

## Teruel, municipio `m-44216`

El [portal oficial de plenos](https://plenos.teruel.es/?pleno=20230617) identifica la sesión de 17/06/2023. Su XML público enlaza `Acta_Pleno_Constitucion.pdf`; se descargó usando la URL construida por el propio portal. La primera descarga por `acta.php?id=<UUID>` no era la que usa ese enlace y devolvió `ERROR` con HTTP 200: no se archivó como evidencia. La descarga correcta comienza por `%PDF-`, tiene diez páginas y 221.434 bytes. SHA-256: `0124acfc26686c38707c875c87c7b30a7dffc1c2a9f9dfce0b548c6a94db4d77`.

Las páginas 8–9, extraídas y cotejadas visualmente, registran 11/5/3/2 votos y la proclamación de Emma Buj con mayoría absoluta. La página 9 remite al vídeo para las intervenciones; el PDF no contiene el discurso. Las firmas no se han validado criptográficamente. El XML y el acta muestran horas distintas para inicio/final de grabación y sesión; no se utilizan como discrepancia sobre la elección ni se reconstruye un discurso a partir de sus minutajes.

La [ficha de concejales](https://www.teruel.es/portal-de-transparencia/concejales-datos-biograficos-y-de-contacto/) identifica a Buj como alcaldesa desde 2016 y senadora desde julio de 2023. Leída con el lector web; la descarga directa del HTML respondió 403. Se conserva una **nota editorial** cuya huella no se atribuye a la página original. Ambas fuentes son del mismo ayuntamiento.

El [directorio de grupos](https://www.teruel.es/portal-de-transparencia/grupos-politicos/) identifica `ppteruel.es` como web del PP; la conexión HTTPS agotó el tiempo de espera. La dirección HTTP que publica el directorio sí devolvió una página de 1.206 bytes con un marco hacia `http://www.pparagon.es/ppteruel`, que a su vez agotó el tiempo de espera sin devolver contenido. No se confunde esa página contenedora con un programa recuperado. Pendientes: programa original municipal de 2023, transcripción cotejada del discurso, modificaciones posteriores, inventario, ejecución y resultados. Los programas de Teruel Existe, PSOE o de elecciones generales localizados no sustituyen al documento del gobierno municipal.

Original del acta, extracción y metadatos en `data/mandate/evidence/territorial/teruel/`. Solo el resumen, enlaces y límites cruzan a la vista pública; no los documentos archivados.

## Huesca, municipio `m-22125`

La web de campaña `lorenatieneunplan.es`, identificada por prensa contemporánea, no resolvió DNS. El índice CDX del archivo web respondió 503. La consulta pública [Wayback Availability para la dirección y 27/05/2023](https://archive.org/wayback/available?url=lorenatieneunplan.es&timestamp=20230527) respondió 200 con `archived_snapshots` vacío. Solo prueba el resultado de esa consulta, no la inexistencia de otras copias. `huesca.es` respondió 403 en el lector usado; no se eludió el control.

La [recopilación periodística de 16/05/2023](https://www.eldiariodehuesca.com/elecciones-2023/pp-huesca-apuesta-por-ciudad-activa-atractiva-vivir-en-entorno-unico_9174_102.html) contiene 18 encabezados temáticos. Se conserva como pista de búsqueda, sin copiarla como programa original ni asumir que contiene todas las promesas. El material de otras candidaturas o propuestas de asociaciones tampoco se atribuye al gobierno.

Pendientes: localizar original o copia contrastable, verificar el acta de constitución y la continuidad del mandato, fijar unidades del inventario y revisar resultados. Las incidencias de acceso se muestran con fecha: no se atribuye falta de transparencia deliberada ni incumplimiento material a una descarga fallida.

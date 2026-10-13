# La Rioja: inventario documental y contraste

## Alcance

Original del PP autonómico de 2023: 172 páginas, SHA-256 `92c5af71c535b2f1ee6ca89181ae52bbd5962ee09adb90ae5d7e7e0fcc04a1c1`. Presentación de 12/05/2023 en la web de la candidatura de Gonzalo Capellán. El resumen anuncia doce ejes; el cuerpo tiene catorce capítulos.

Se importan **949 apartados con viñeta**, objetivos incluidos. Es una unidad documental, no 949 promesas distintas. Las sublistas se mantienen dentro del apartado; se conservan las continuaciones de columna y página. Las páginas 9–19 quedan como contexto para no duplicar el resumen, sin perder sus condiciones. Se mantienen 158 bloques de introducción, epígrafes, resumen y citas destacadas. Las citas sobre fotografías se separan de las medidas para no convertir afirmaciones partidistas en compromisos de otra ficha.

Falta conciliar las reiteraciones entre capítulos y los compromisos en prosa. El tipo `bullet-sections` impide presentar el inventario como definitivo incluso si se revisaran las 949 fichas. No hay revisión humana independiente.

## Contraste incorporado

- **r-17-894, deporte, cinco componentes.** Leyes 11/2023 y 13/2023, manual AEAT 2025 y tablas IRPF 2023. El 100 % se vincula en la norma a mayores de 65 años o discapacidad de al menos el 33 %; no equivale a la mención electoral a jubilados y discapacidad superior al 33 %. La estadística recoge 50.668 liquidaciones por 5.316.485 euros: 46.024 individuales más 4.644 conjuntas, por 4.590.921 más 725.564 euros. Son liquidaciones, no personas ni deportistas nuevos. El Gobierno comunicó 57.402 contribuyentes y 5.914.786 euros; queda pendiente conciliar población, corte y versión. La noticia fue leída mediante navegador de investigación, pero su descarga directa dio 403: se conserva una nota editorial identificada, nunca un falso original. El sello del cuerpo es 18/09/2024; la cabecera genérica de 2017 no se usa.
- **r-17-714, ciencias de la salud, cuatro componentes.** ANECA registra evaluación favorable para Medicina en la Universidad de La Rioja (tabla de mayo de 2026). La Universidad publica la documentación administrativa, guías de 2026–2027 y comunicación de apertura del 16/09/2026. Los enlaces SharePoint no devolvieron PDF; no se afirma haber leído las resoluciones completas. Enfermería, investigación, recursos, integración Hospital San Pedro–CIBIR–Universidad y retención de personal siguen pendientes. La reiteración de Medicina en r-17-564 no representa otra implantación.

Quince referencias, cinco orígenes: candidatura del PP, Gobierno riojano, AEAT, Universidad y ANECA. Catorce capturas originales y una nota editorial. El control de ANECA se limita a la evaluación académica del título. Las tres tablas de AEAT son una sola operación estadística. No se calcula cumplimiento global.

## Reproducción y garantías

`scripts/extract-rioja-programme.py` requiere pypdf y reordena columnas y citas por coordenadas. Compara todos los caracteres de cada página del cuerpo con la extracción completa PDFium conservada; únicamente equipara el carácter de control U+0002 con el guion que devuelve pypdf. Solo retira de ese cuerpo el número marginal exacto (página PDF menos doce). La extracción completa conserva las 172 páginas.

`scripts/import-rioja-programme.py` usa únicamente la biblioteca estándar y comprueba las huellas de PDF y ambas extracciones antes de reproducir el inventario. `scripts/register-rioja-sources.py` valida bytes y metadatos. Las pruebas de importación protegen las continuaciones, separación de citas, conservación de caracteres y rechazo de alteraciones. La proyección pública excluye texto bruto y rutas locales.

El conjunto continúa en el borrador de PR 22. La incorporación de este territorio no autoriza a presentar como completa la cobertura de las 70 administraciones: quedan 55 sin inventario y revisiones sustantivas pendientes en todos los inventarios existentes.

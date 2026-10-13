# Castilla-La Mancha: programa inicial y contraste parcial

Revisión documental del 11 de octubre de 2026. **861 compromisos iniciales, cinco fichas con 22 componentes y 856 sin contraste específico. Cero revisiones humanas independientes.** No está cerrado el inventario del mandato: el propio programa prevé ampliaciones y el seguimiento declara 112 incorporaciones de 2024 y 81 de 2025.

## Original y extracción

Programa oficial de 64 páginas PDF, generalmente dobles páginas impresas. El registro, el original y dos extracciones conservan huellas SHA-256. `extract-clm-programme.py` ordena las líneas por mitades; `import-clm-programme.py` exige secuencia 1–861, conserva 18 bloques de contexto y vincula cada número con su enlace de seguimiento original. Las cabeceras y pies repetidos no se incorporan al texto de las promesas.

Cinco números aparecen unidos al texto en la extracción (478, 494, 578, 767, 778). El importador los reconoce por tipografía y secuencia, sin convertir cantidades del cuerpo en nuevos compromisos. Los localizadores públicos usan página PDF, no página impresa. Se han inspeccionado visualmente las páginas de las cinco fichas; sigue pendiente el cotejo visual integral del programa y su conciliación con campaña e investidura.

La proyección al navegador excluye extracción cruda, fragmentos, rutas locales y enlaces internos de seguimiento archivados. No importa automáticamente estados gubernamentales. La categoría `initial-programme` impide presentar este universo como exhaustivo.

## Qué se ha contrastado

| Compromiso | Resultado documental | Límite pendiente |
| --- | --- | --- |
| 1 · Dependencia | 106.527 prestaciones y 78.035 personas en diciembre de 2024; umbral de 100.000 superado según esa estadística. Nota posterior: 123.558 prestaciones a julio de 2026. | Misma procedencia administrativa. No mezclar personas del primer semestre con prestaciones de julio; faltan calidad, esperas comparables y conciliación externa. |
| 166 · Televisión hospitalaria | SESCAM comunica 2.454 equipos y finalización en tercer trimestre de 2023. Diario Sanitario describe gratuidad en Albacete en enero. | Antecedente anterior a julio; caso local no prueba cobertura regional. Pendientes certificaciones y cronología por centro. |
| 257 · Banco de libros | Decreto de 2024, guía 2026–2027 y procedimiento de un instituto público. Préstamo sujeto a condiciones y reposición. | Normas no prueban entregas iniciales ni cobertura universal. Faltan registros de 2024–2025 y posteriores. |
| 384 · Universidad | Orden 74/2026: 99 % de créditos iniciales UCLM, topes 60/72, requisitos y beca estatal. | No gratuidad universal del 100 %; faltan matrículas y transferencias ejecutadas, otros centros y condición financiera. |
| 446 · Informes | Registro 2024–2026, metodología y seguimiento. 322/861 = 37,4 % en categoría oficial de cumplidos; 71 % corresponde a avance global. | No se han auditado todos los informes interactivos ni sus evidencias. Ampliaciones separadas del denominador inicial. |

## Procedencia y acceso

Quince fuentes registradas: catorce originales y una nota editorial de Diario Sanitario, sin redistribuir el artículo completo. Su huella identifica la paráfrasis. Normas, guías, estadísticas y el instituto comparten familia autonómica; el BOE se usa para la cronología del nombramiento, no como auditoría. La noticia aporta contraste local de una fuente distinta, sin revisión independiente de la ficha. Las cifras se atribuyen al emisor y al corte pertinente.

Se recuperó el informe de dependencia desde el dominio de Bienestar Social después de un 404 en la URL antigua. Se conserva el PDF oficial del Decreto 26/2024: el HTML de consulta advierte que no es su versión auténtica. La página de matrícula UCLM devolvió 403 y dos referencias a instrucciones de libros de 2024 devolvieron 404; no se cuentan como documentos descargados. No se utiliza un error HTTP como evidencia de inexistencia de la actuación.

Las comprobaciones automatizadas protegen integridad, secuencia, líneas asignadas una sola vez, enlaces originales, conservación de condiciones, cobertura pendiente y proyección pública. Los recorridos de navegador comprueban búsqueda, enlaces a páginas PDF, filtro de pendientes y lectura móvil. Las pruebas de software no certifican los resultados políticos ni sustituyen la revisión humana.

## Verificación local

435 pruebas Vitest en 64 archivos y 83 pruebas Python correctas; ESLint, compilación webpack/TypeScript y guardián de 51 trazas, 126 dependencias y ocho rutas correctos. Tras identificar la paráfrasis periodística, se repitieron las 13 pruebas de integridad y de Castilla-La Mancha, sin fallos.

La primera pasada de navegador terminó con 54 de 55 recorridos correctos: la prueba nueva buscaba «Promesa y página de origen», pero el programa inicial muestra «Medida inicial y página de origen». Se corrigió el selector y se repitieron los dos recorridos de Castilla-La Mancha, ambos correctos. Captura inicial móvil de 390 × 844 inspeccionada, sin desbordamiento. No se afirma una pasada completa de 55 posterior al cambio del selector.

La primera ejecución de Vitest agotó los cinco segundos del cotejo de todos los originales, cuyo archivo suma 214 MB. Se estableció un límite específico de 30 segundos, sin eliminar comprobaciones ni cambiar otros plazos; la repetición completa pasó. No fue una discrepancia de huellas.

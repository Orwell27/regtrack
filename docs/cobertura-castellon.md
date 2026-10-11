# Castellón municipal: pacto y contraste documental

Revisión a 11/10/2026. Se importan los 90 puntos numerados del pacto PP–VOX presentado el 01/08/2023, en 14 áreas, con 20 bloques de contexto. Tres fichas, trece componentes y doce fuentes conservadas. Quedan 87 puntos sin revisión y cero revisiones humanas independientes. Esta incorporación no cierra el mandato.

## Procedencia y alcance

El PDF de 13 páginas, alojado por Prensa Ibérica, conserva sus 8.463.574 bytes y SHA-256 `1e53f809e2e3bcc51ab5794713b5c1778bcf34cf0a9b8d280c571c14851cda19`. La noticia de Castellón Información confirma la presentación del acuerdo de 90 puntos, pero no autentica esta copia concreta. La página de VOX localizada devolvió 403 y no se cuenta como documento capturado. Falta copia del pacto publicada por sus firmantes.

Se conserva además el programa electoral del PP publicado en su propia web: 98 páginas, pendiente de conciliación con el pacto. Por ejemplo, la página 22 menciona también vehículos de reparto eléctricos para Bicicas. No se ocultan compromisos por no aparecer literalmente entre los 90 puntos. La página municipal de composición de la corporación identifica a Begoña Carrasco como alcaldesa y fecha la constitución el 17/06/2023.

El pacto está escaneado. Se conservan PDF, extracción digital vacía y OCR español de Windows con coordenadas por palabra y sus huellas. El importador ordena filas antes de leer números que el OCR separó del texto. El número 7, visible en la página 2 pero ausente del OCR, se recupera explícitamente, manteniendo el texto bruto. Los puntos 15 y 42 continúan en la página siguiente. La cláusula tercera de organización, desde la página 9, se conserva como contexto y no pasa a formar parte del punto 90. Cotejo visual de portada, pasajes citados, límites y firmas; revisión íntegra independiente aún pendiente.

La cifra del 87 % comunicada por la alcaldesa en junio de 2026 incluye medidas terminadas o en ejecución. No se transforma en porcentaje propio de RegTrack ni se reparte entre los puntos del inventario.

## Qué acreditan las fichas

- **Policía de Barrio (6, página 2).** Presentación anunciada en febrero de 2025. Los 30 efectivos corresponden al conjunto de Proximidad, excluido el Grao; no prueban 30 altas exclusivas de la unidad nueva. El PSPV cuestionó el alcance en febrero de 2026 y habló de cinco personas redistribuidas. Son partes interesadas, fechas y universos distintos. Faltan orden de creación, adscripción y datos agregados de despliegue. La noticia que reproduce una crítica no la corrobora independientemente.
- **Bicicas (55, página 6).** Adjudicación documentada en mayo de 2024 por ocho años y 9.375.394,27 € más IVA, con mejoras aceptadas. No es gasto ejecutado ni recepción. El expediente relata suspensión e inadmisión de un recurso contra los pliegos: no confundir inadmisión con resolución del fondo. El operador anunció 500 nuevas bicicletas operativas en febrero de 2025; ese anuncio no acredita por sí solo la recepción integral ni el cumplimiento de previsiones de finales de 2024 y objetivos de uso de 2025. El prestador no es auditor independiente del servicio.
- **Doble topónimo (63, página 6).** El BOE acredita el cambio a Castelló de la Plana/Castellón de la Plana. Se conserva el criterio preferente distinto de la Acadèmia recogido en el preámbulo. La información sobre recursos desestimados en mayo de 2026 se atribuye a SER; faltan sentencias originales y estado posterior, sin afirmar firmeza. El cambio normativo no demuestra toda la rotulación ni el resto de compromisos lingüísticos. No confundir la capital con Villanueva de Castellón.

## Validación y pendientes

El importador exige 13 páginas y secuencia 1–90; verifica huellas y conserva cada línea no decorativa una vez. Pruebas negativas de páginas perdidas, numeración duplicada, orden cambiado y fuentes alteradas. Las pruebas de integración distinguen importación, revisión, fuentes interesadas y cumplimiento, además de excluir texto bruto y rutas locales del navegador.

Validación local: 463 pruebas Vitest en 71 archivos y 113 pruebas Python correctas; ESLint y compilación webpack/TypeScript de 49 páginas estáticas correctos. El guardián comprueba 51 trazas, 140 dependencias y ocho rutas. Dos recorridos nuevos de navegador sobre la compilación de producción verifican búsqueda municipal, pendientes, enlace a la página del pacto y móvil 390 × 844 sin desbordamiento; capturas inspeccionadas. Integridad y tamaño de los doce originales comprobados. Estas pruebas técnicas no sustituyen la revisión humana independiente ni certifican cumplimiento político.

Antes del cierre faltan las 87 revisiones restantes, conciliación de programas electorales y compromisos posteriores, cotejo íntegro de transcripción, ejecución y resultados, controles externos, respuesta a discrepancias y revisión humana independiente. El despliegue de vista previa y CI se verifican por commit en el PR22; no debe inferirse publicación en producción de esta documentación.

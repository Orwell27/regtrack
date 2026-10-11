# Galicia: cobertura documental y límites

Corte de revisión: 11/10/2026. Mandato 2024–2028. El nombramiento se publicó el 12/04/2024 (Real Decreto 380/2024).

## Inventario

Original en castellano del PPdeG, 183 páginas, descargado del dominio del autor. Se conservan PDF, texto digital, celdas con coordenadas, metadatos y hashes. Hay 793 apartados numerados en 72 áreas y un bloque de 45 demandas al Gobierno de España. Los identificadores compuestos `área.punto` son editoriales: la numeración original vuelve a empezar en cada área. Los 159 bloques de contexto incluyen balances anteriores, epígrafes e introducciones.

El PDF no puede leerse como una sucesión simple de líneas: varias cajas están en distinto orden interno y hay texto de desbordamiento fuera de la página, incluso duplicados en gallego. `scripts/extract-galicia-programme.py` usa PDFium para recuperar las celdas visibles, sus fondos y separadores. La importación publicada usa solo la biblioteca estándar de Python y verifica los hashes. Las celdas de continuación 29→30, 37→38, 149→150 y 169→170 se unen: 797 celdas no se convierten en 797 compromisos. El 4 de la página 169 se identifica visualmente y lleva una nota expresa.

Se han visto páginas de control, no las 183 páginas completas. `transcriptionPending: true` y `inventoryKind: numbered-sections` mantienen la cobertura original incompleta. No se afirman 793 promesas atómicas ni una revisión sustantiva de las 793. Faltan cotejo visual integral, submedidas, duplicaciones temáticas y conciliación con investidura y anuncios posteriores.

## Revisiones incorporadas

Tres fichas, trece componentes; 790 apartados pendientes y cero revisiones humanas independientes:

- **Vivienda 4:** el objetivo original es disponer de 8.000 viviendas en 2028. El II Pacto lo conserva y añade 2.000 hasta 2030. La entrega de 74 viviendas de julio es un dato atribuido al IGVS. El porcentaje de promociones en ejecución o licitadas no equivale a viviendas entregadas. Las objeciones del BNG de abril quedan atribuidas y con sus fechas y unidades; no son auditoría ni prueban por sí solas un porcentaje alternativo. Faltan inventario conciliado, altas/bajas, ocupación, demanda y sostenibilidad.
- **Vivienda 5:** documento del II Pacto y firma de 10/02/2026. COAFGA corrobora directamente su participación: es una corroboración de ese hecho, no un control externo de resultados. El anexo de seguimiento del pacto 2021–2025 no se atribuye íntegramente al mandato actual.
- **Universidad 1:** decretos 164/2024, 55/2025 y 72/2026; corrección de 14/07/2026; normativa propia de matrícula de la UDC. La bonificación del 99 % tiene condiciones de acceso, rendimiento, créditos y titulación previa; no elimina todos los gastos. La incorporación al procedimiento no prueba aplicación universal. Los plazos de certificación de octubre de 2026 y datos de febrero de 2027 siguen abiertos al corte.

## Procedencia y publicación

Quince fuentes, seis familias de origen. Xunta e IGVS se agrupan; el DOG de 2024 conserva autoría de la Xunta aunque se aloje en la UDC. La resolución propia de la UDC es otra familia. PPdeG, BNG y COAFGA se identifican por su papel y sus límites. Las páginas del registro del programa y del balance del partido se conservan como notas editoriales con URL y fecha, evitando publicar scripts y posibles credenciales incrustadas del sitio; el PDF del programa sí se conserva íntegro.

El 87 % anunciado por el PPdeG el 16/05/2026 agrega cumplido y en marcha. No se transforma en porcentaje de cumplimiento ni en estados de cada ficha. Esta ampliación no cierra Galicia, las 70 administraciones del lanzamiento ni la revisión humana independiente.

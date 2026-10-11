# Albacete: inventario numerado y primeras revisiones

Corte: 11/10/2026. Municipio `m-02003`. **253 apartados importados, tres fichas parciales y trece componentes; 250 apartados sin revisión sustantiva.** No equivale a un balance finalizado ni a 253 promesas únicas. La revisión humana independiente sigue pendiente.

## Origen e importación

El [programa publicado por el PP de Albacete](https://www.ppab.es/Programa2023.pdf) tiene 28 páginas, 2.504.348 bytes y SHA-256 `6b21a166f9bfcd119dc62e01fb920f34ee9935f00aefca5ddffc7a11063b77cc`. Se descargó con TLS normal y se conservaron original, extracción y metadatos en `data/mandate/evidence/territorial/albacete/`.

Contiene una secuencia 1–250 en las páginas 5–25 y tres puntos éticos con numeración 1–3 en la página 26. Estos últimos tienen identificadores `ethics-1` a `ethics-3`; no sobreescriben los primeros puntos. Las medidas 14, 68 y 94 continúan en la página siguiente. Los bloques introductorios de las páginas 3, 4, 9–10, 14, 18–19, 23 y 26 se conservan aparte: no se añaden artificialmente a la última medida anterior.

El importador reproducible comprueba la huella del PDF, la extracción, las 28 páginas y la secuencia de numeración. La vista pública presenta **resúmenes editoriales**, identificados como tales y con acceso al original; omite los fragmentos brutos. La importación no crea fichas de revisión. Hay submedidas, reiteraciones y peticiones a otras administraciones aún por conciliar. La fecha exacta de publicación del PDF no está verificada.

Se inspeccionaron visualmente las páginas de separación de bloques, la numeración ética y las páginas 2 y 28: la segunda contiene la marca y la última contacto y enlace al propio PDF, sin medidas adicionales. La página 27 contiene la candidatura. Este cotejo del agente no sustituye a revisión humana independiente.

El registro de mandato usa el [BOP de 03/10/2025](https://www.dipualba.es/bop/ficheros/2025/115/BOP%20115-25-P.PDF), página 6, que identifica a Manuel Serrano López como alcalde en un anuncio firmado el 24/09/2025. No es el acta constitutiva ni prueba continuidad hasta octubre de 2026; se explicita esa limitación. La aprobación presupuestaria inicial de ese anuncio no se emplea como prueba de ejecución del cheque escolar.

## Contraste del cheque escolar, apartado 3

- Bases 2023–2024: 360.000 euros; importes individuales 90/60/40 euros. El título interno del PDF menciona 2017–18, pero el contenido corresponde a 2023–2024. No se fecha por sus metadatos.
- Bases 2024–2025 y extracto de 22/05/2024: dotación inicial de 360.000 euros e importes 100/80/60. Las firmas visibles en las bases son de 06/05/2024; no se han validado criptográficamente.
- Anuncio municipal recogido por La Cerca el 10/05/2024: 500.000 euros. No se resuelve esa divergencia eligiendo el titular ni acusando engaño: ambas bases contemplan variaciones y faltan las modificaciones y liquidación. El extracto del BOP además presenta fechas de acuerdo 2023/2024 incompatibles. Se registra la discrepancia, sin corregir el original silenciosamente.
- Bases 2026–2027: 500.000 euros e importes 100/80/60. La parte de 2027 depende de su presupuesto; el curso termina después del corte. La dotación no se presenta como pagada ni como resultados completos.

La descarga directa de La Cerca dio 403. Se conserva una nota de lectura del lector web, identificada como `extracto_editorial`; su huella no se atribuye al HTML. El anuncio, las bases y el BOP comparten origen municipal y no se cuentan como corroboraciones independientes. No se recuperaron resoluciones finales ni liquidaciones por curso; 2025–2026 también queda pendiente.

## EXPOVICAMAN, apartados 107 y 108

El dossier de 2024 acredita la programación en el Recinto Ferial. Una [crónica de Twins’ Farm de 20/05/2024](https://twins-farm.es/2024/05/expovicaman-2024.html) describe la visita y el cambio de emplazamiento, aporta material propio enlazado y opiniones favorables y críticas. Respalda celebración y ubicación; no es auditoría de gasto, afluencia o impacto. No se verificó su relación comercial con expositores ni se examinó todo el material audiovisual.

El organizador es un ámbito compartido por IFAB, Ayuntamiento, Diputación y Junta. No se atribuye causalidad exclusiva al gobierno municipal. El portal consultado mezcla referencias a 2024, 2025 y 2027; el anuncio de 2027 no se trata como edición celebrada.

Las dos fichas comparten el mismo hecho: una trata la recuperación de la feria y la otra el traslado de ferias, que menciona también Comercia y Ferimotor. No se cuentan como dos éxitos independientes. La evidencia de EXPOVICAMAN no se extrapola a las otras ferias.

## Validación y pendientes

Pruebas de secuencia, saltos de página, separación de contexto, reinicio ético, originales y proyección pública; pruebas adversariales eliminando páginas y cambiando números. La cobertura mantiene tres revisiones y cero revisiones independientes y no permite declarar cerrado este inventario aun igualando los contadores.

Pendientes: acta constitutiva y continuidad del mandato, cotejo completo por una persona, conciliación de submedidas y promesas posteriores, 250 apartados sin ficha, resultados y controles de las tres fichas existentes. Vivienda y centros socioculturales tienen pistas de búsqueda, pero todavía no se publican como revisiones.

Reproducción: `npx tsx scripts/import-albacete-programme.ts`; la reconstrucción del inventario no altera las revisiones. El conjunto del borrador pasa a 32 administraciones parciales y 133 fichas; quedan 38 capitales sin inventario. Producción no se actualiza por importar estos datos.

Validación local completada: 34 pruebas en cuatro archivos, ESLint del ámbito, compilación webpack/TypeScript de 53 páginas, control de 51 trazas/148 dependencias/ocho rutas y un recorrido móvil de navegación, filtros, numeración ética y enlaces. Captura inspeccionada sin desbordamiento. El primer intento de Vitest se detuvo antes de ejecutar pruebas por permisos de caché temporal; la pasada fuera de ese aislamiento fue correcta. Se mantienen avisos preexistentes de Next sobre middleware y API de Node en Edge.

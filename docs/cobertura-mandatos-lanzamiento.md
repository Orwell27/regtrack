# Cierre de la sección de balances y lanzamiento

Alcance acordado con Alfonso el 10 de octubre de 2026: balance estatal, 17 comunidades autónomas, Ceuta y Melilla y las 50 capitales de provincia. Otros municipios se amplían después. Objetivo orientativo de lanzamiento: alrededor del 17 de octubre; no es una tarea programada ni una promesa de auditoría terminada sin evidencia.

**Estado de la rama tras la incorporación de Bilbao del 11 de octubre:** 46/203 fichas nacionales (104 componentes), 4/300 de Madrid, 3/347 de Navarra, 2/154 de Euskadi, 2/260 de Cataluña, 2/1248 actuaciones de Barcelona, 2/100 compromisos de Vitoria, 2/129 fichas de Donostia y 2/80 de Bilbao con revisión parcial. Barcelona y Donostia tienen pendiente reconstruir sus promesas originales. Bilbao conserva el programa completo desde una copia difundida por EAJ-PNV: cotejo de bytes con el municipal y seguimiento de junio de 2026 pendientes. Los otros 61 territorios aún no tienen inventario importado ni revisión sustantiva. La revisión humana independiente sigue pendiente en todos los ámbitos. Los bloques siguientes conservan la secuencia de trabajo.

## Condiciones para dar una ficha por revisada

1. Identificar territorio, administración, mandato y documento original del compromiso. No heredar automáticamente 2023–2027: hay cambios de legislatura autonómica.
2. Conservar el texto y su fuente, fecha, localizador y alcance; separar el balance declarado por el Gobierno de la valoración editorial.
3. Buscar actuación, ejecución y resultado; explicar qué acredita cada documento y qué no. Un presupuesto aprobado no es gasto ejecutado ni entrega.
4. Buscar evidencia contraria o limitaciones y registrar las fuentes realmente consultadas. Dos publicaciones del mismo emisor no se cuentan como corroboraciones independientes.
5. No asignar cumplimiento o incumplimiento sin criterio y plazo aplicables. Una laguna queda abierta y visible, no se rellena por inferencia.
6. Validar referencias, integridad, navegación, consulta, móvil y límites de las respuestas. Conservar revisiones anteriores y correcciones.

## Entregas de trabajo

- Inventario nacional completo de 203 compromisos, con conservación exacta del CSV y trazabilidad de la selección anterior.
- Matriz de 70 ámbitos: España, 19 gobiernos autonómicos/ciudades autónomas y 50 ayuntamientos capitales. Ceuta y Melilla no se duplican como capitales de provincia.
- Fuentes primarias de compromisos, seguimiento y control externo por territorio. Los territorios sin material suficiente deben mostrar esa carencia.
- Contrastes sustantivos y límites por ficha, con cobertura medida por documentos revisados y no solo por enlaces o territorios presentes.
- Sección navegable, consulta documental y pruebas de producción; lista de pendientes operativos para abrir RegTrack.

## Plan orientativo de la semana

| Tramo | Resultado esperado | Condición de cierre |
| --- | --- | --- |
| Inventario | Universo nacional y territorial identificado | IDs únicos, mandatos separados y fuentes localizadas |
| Contraste | Revisión de documentos y resultados disponibles | Afirmaciones acotadas y referencias que las respalden |
| Corroboración | Control externo, estadísticas y evidencia contraria | Independencia y límites explícitos; discrepancias conservadas |
| Producto | Navegación territorial, filtros y respuestas | No mezclar gobiernos, fechas o competencias |
| Validación | Comprobación de datos y recorridos completos | Sin fallos que cambien conclusiones ni referencias rotas internas |
| Publicación | Entrega revisable y despliegue autorizado | Separar alcance publicado, lagunas y mantenimiento pendiente |

La revisión humana independiente sigue pendiente. Es necesaria para medir la exactitud; los tests y la repetición por el mismo agente no la sustituyen. No se fija una nota de fiabilidad por adelantado.

Estado inicial: 30 compromisos nacionales revisados y publicados; ampliación en curso en `feat/cobertura-mandatos`. Este documento no certifica por sí mismo que las entregas anteriores estén completadas.

## Primera entrega de la ampliación — 10 de octubre

Implementado:

- `/observatorio/mandato/cobertura`: catálogo de las 70 administraciones, buscador, filtros y paginación; acceso desde el balance nacional y su lector documental.
- 203 compromisos nacionales importados de la captura original, comprobando SHA-256, codificación Windows-1252, cabecera completa, registros únicos y conservación literal de las 30 fichas anteriores. El CSV contiene campos multilínea y una columna final vacía; no se divide por saltos de línea ni por punto y coma sin tratar comillas.
- 30 fichas enlazan sus revisiones; las otras 173 se muestran sin veredicto. Solo se envía al navegador una proyección breve, sin los campos completos de iniciativas y referencias del Gobierno.
- Catálogo territorial generado a partir de los códigos del IGN existentes en el proyecto y una selección explícita de las 50 capitales. Asturias corresponde a Oviedo, Pontevedra a Pontevedra; Ceuta y Melilla no se duplican.
- Registro de descubrimiento con fuentes en 13 comunidades y 3 capitales. Las notas distinguen página leída, referencia localizada e incidencias de acceso. No se cuenta ninguna de estas referencias como un compromiso contrastado.
- El lector nacional rechaza preguntas que identifica como territoriales antes de recuperar fichas o devolver la convocatoria electoral estatal. La detección por nombres y contexto es conservadora; no constituye un clasificador geográfico exhaustivo de todas las localidades o expresiones posibles.
- Control de empaquetado ampliado a la nueva ruta. Pruebas negativas para inventarios vacíos, recuentos incompatibles y revisiones sin fuente.

Estado editorial real: **30/203 revisiones nacionales; 0 balances territoriales revisados; revisión humana independiente pendiente**. Esta entrega prepara la cobertura y evita falsas atribuciones; no cierra la revisión sustantiva ni certifica que la sección esté finalizada.

Siguiente trabajo necesario:

1. Completar y conservar los documentos de mandato de las 19 administraciones autonómicas/ciudades autónomas, comprobando los cambios electorales de 2026. Siguen sin referencia específica Cantabria, Castilla y León, Extremadura, Murcia, Ceuta y Melilla.
2. Localizar y extraer programas y seguimiento de las 50 capitales. Los repositorios de cuentas de Barcelona y València no sustituyen a sus programas ni a la lectura de informes concretos.
3. Revisar los 173 compromisos nacionales restantes y cada inventario territorial con fuente original, actuación, ejecución, resultado, plazo, competencia y búsqueda de evidencia contraria. Las magnitudes todavía desconocidas quedan como `null`, no como cero.
4. Incorporar corroboración externa por afirmación, registrar discrepancias y someter las conclusiones a revisión independiente antes de considerar cerrados los balances.
5. Verificar la versión desplegada y revisar los requisitos operativos de `docs/community/LANZAMIENTO.md` para distinguir la apertura de la comunidad del Observatorio ya público.

Reproducción: `npx tsx scripts/import-mandate-inventory.ts`, `npx tsx scripts/build-mandate-coverage.ts`, `npm test -- --maxWorkers=2`, compilación Next y `node scripts/check-observatory-trace.mjs`. Las comprobaciones de navegador están en `e2e/mandato-cobertura.spec.ts` y se ejecutan también en CI.

## Segundo bloque documental — 10 de octubre

La ampliación incorpora ocho revisiones: desperdicio alimentario (20), paridad (22), discapacidad/artículo 49 (154), organización judicial (132), pacto y medidas LGTBI (126), bienestar animal (118), economía social (191) y vigilancia sanitaria (146). Se conservan ocho normas originales del BOE y el acuerdo de 20 de enero de 2026 del CGPJ, con huellas y localizadores.

La revisión distingue los actos legislativos acreditados de sus efectos. En las promesas de aprobar una ley o modificar la Constitución, se reconoce expresamente el acto alcanzado; las lagunas de resultados no se convierten en requisitos nuevos de la promesa original. En las promesas compuestas, una medida no acredita todo el objetivo: el RD laboral LGTBI no es un pacto de Estado; la ley de economía social no certifica la ejecución del PERTE o de la estrategia; crear una agencia no demuestra capacidad operativa.

La segunda lectura cotejó los componentes y las conclusiones con las disposiciones originales, especialmente los calendarios de paridad y desperdicio alimentario. El acuerdo del CGPJ corrobora la constitución legal de los tribunales y documenta el régimen transitorio de oficinas en tres partidos asturianos; no certifica el estado operativo posterior a enero de 2026 ni refuta por sí solo declaraciones gubernamentales posteriores. Se trata de una fuente institucional distinta del balance del Ejecutivo, no de una revisión humana independiente de RegTrack.

Estado preparado en esta rama: **38/203 revisiones nacionales, 82 componentes, 165 pendientes y 0/69 balances territoriales revisados**. Las ocho fichas nuevas no reciben una fecha de origen no verificada ni un historial ficticio de octubre de 2026. Se conservan las treinta revisiones y correcciones anteriores. La revisión independiente, los restantes compromisos y la cobertura territorial siguen pendientes; este bloque tampoco da por finalizada la sección. El estado de publicación debe comprobarse en el despliegue, no inferirse de este documento.

## Primer inventario municipal y cuatro revisiones parciales — 10 de octubre

Madrid: 300 medidas numeradas del programa electoral que el Ayuntamiento publica como Programa de Gobierno 2023–2027. Se conserva el PDF original de 73 páginas, su registro institucional, SHA-256 y extracción por página. Un importador específico exige las 300 medidas, la numeración continua por eje y las páginas previstas; normaliza espacios y guiones de maquetación sin interpretar la promesa. No pretende recoger todas las declaraciones externas a ese documento.

La ruta `/observatorio/mandato/territorios/m-28079` permite leer las cuatro revisiones, buscar las 300 medidas, filtrar las 296 pendientes y consultar cada página de origen. La matriz de cobertura obtiene sus recuentos de ese inventario y esas revisiones. Los originales y el texto bruto no cruzan la proyección al navegador. Las consultas del lector nacional siguen sin reutilizar evidencia estatal para contestar sobre Madrid; esta nueva vista no añade un lector territorial de preguntas.

Fichas examinadas:

- 103, BiciMAD: 634 estaciones y 7.782 bicicletas comunicadas por EMT el 7/03/2026, frente a los umbrales del programa. No se verificó disponibilidad diaria ni calidad homogénea de servicio. La renovación comenzó antes del mandato: no se atribuye todo el despliegue a 2023–2027.
- 163, turismo: documento 2024–2027 y acuerdo de aprobación de 23/01/2025, publicado en BOAM 9814/449 el 7/02/2025. Participación descrita por el promotor, actas y resultados sin corroboración externa incorporada.
- 181, comercios centenarios: artículo 15 bis de la consolidación municipal del IBI de 2026; bonificación del 95 % con requisitos y usos catastrales delimitados. No se acreditan beneficiarios por la sola existencia de la norma.
- 246, IBI: ficha tributaria y artículo 8.2 de la consolidación coinciden en 0,414 % para 2026, por encima del objetivo 0,4 %. No se declara incumplido al cierre un mandato todavía abierto ni se infiere ahorro en 2,2 millones de recibos. La consolidación es informativa, no sustituye el cotejo de sus modificaciones con los boletines originales.

Ocho originales conservados de la familia institucional municipal y un extracto editorial de un reportaje de EL PAÍS con observación directa. Su huella identifica la nota, no el artículo original. La evidencia periodística es localizada y no permite extrapolar al servicio completo o a otro periodo. Ni el BOAM, ni la agencia tributaria, ni EMT cuentan aquí como corroboradores independientes del Ayuntamiento. Once componentes: las lagunas quedan visibles. La fuente periodística tampoco equivale a una revisión humana independiente de RegTrack. Las cuatro fichas son primeras revisiones parciales, sin historial anterior inventado. No se calcula una tasa global de cumplimiento.

Reproducir la importación conservada:

```sh
python scripts/extract-territorial-pdf.py data/mandate/evidence/territorial/madrid-programme-2023.pdf data/mandate/evidence/territorial/madrid-programme-2023.pages.json
npx tsx scripts/import-madrid-programme.ts
npx vitest run tests/mandate-territorial.test.ts
```

La extracción requiere `pypdf` (versión registrada dentro del artefacto). CI verifica el texto derivado y las huellas de los originales conservados; no vuelve a descargar ni extraer PDFs. Para nuevas capturas, `node scripts/capture-territorial-sources.mjs <id>` usa una lista explícita de fuentes y comprueba formato/contenido. Las fuentes ya conservadas solo se verifican, no se sobrescriben. Este importador no constituye revisión editorial automática.

La captura de Navarra que estaba pendiente en este bloque se resolvió en la continuación siguiente. La planificación general de Canarias tampoco sustituye la lectura de su acuerdo de gobierno.

## Navarra: inventario y primeras revisiones — 10 y 11 de octubre

Se conservan el acuerdo original (63 páginas) y el Balance II de 2025 (115 páginas), descargados de los enlaces públicos del registro de la Oficina de Análisis y Prospectiva. El importador reproduce las 347 fichas del anexo, exige identificadores únicos, páginas completas, 13 áreas y distribución de estados coincidente con el informe. Incluye el caso 03.01.39, cuyo estado está en la misma línea que el resumen. Una alteración de esas condiciones impide la importación.

La fuente del inventario es el balance gubernamental; la del mandato es el acuerdo. Se mantienen separadas. Los resúmenes no son transcripciones íntegras de las promesas: la ficha de Bidean omite la condición sobre equidad territorial que figura en el acuerdo. Cada estado gubernamental muestra su atribución y el cierre de 2025; no se usa para generar un veredicto ni contar fichas revisadas.

La ruta `/observatorio/mandato/territorios/r-15` incorpora tres revisiones parciales y diez componentes:

- Ley de Salud: se coteja el plazo de presentación anterior a diciembre de 2024 con los trámites pendientes que el propio Gobierno describía el 30/03/2026. La inferencia de retraso se refiere a ese hito y no al estado parlamentario en octubre. Quedan por comprobar el expediente posterior y las bases del contenido prometido.
- Bidean: actividad comunicada por el operador, antecedentes de creación anteriores al mandato, condiciones laborales y equidad sin prueba suficiente. El informe de Comptos de noviembre de 2024 sobre las cuentas de 2023 aporta una objeción externa sobre la justificación de la creación, sin extrapolarla al servicio iniciado en 2025. Se distingue el texto del fiscalizador de las alegaciones anexas de CPEN.
- Zonas tensionadas: resolución estatal y corrección de enlaces conservadas; 21 municipios y efectos desde el 30/07/2025. La publicación formal no acredita inmediatez de los trámites ni impacto en alquileres; tampoco se confunde ese impacto con el hito administrativo prometido.

Nueve originales conservados, de tres familias institucionales. El BOE reproduce el acto autonómico y no se cuenta como una auditoría de resultados. Comptos tiene un alcance temporal y material acotado. Ninguna fuente externa sustituye la revisión humana independiente de RegTrack.

```sh
python scripts/extract-territorial-pdf.py data/mandate/evidence/territorial/navarra-balance-2025.pdf data/mandate/evidence/territorial/navarra-balance-2025.pages.json
npx tsx scripts/import-navarra-balance.ts
npx vitest run tests/mandate-navarra.test.ts tests/mandate-territorial.test.ts
```

Quedan 165 compromisos nacionales, 296 de Madrid, 344 de Navarra y los inventarios y balances de otros 67 territorios. Se mantiene el objetivo integral; esta incorporación no finaliza la sección.

## Contraste nacional — 11 de octubre

Ocho fichas nuevas (52, 69, 104, 110, 127, 163, 177 y 184), con 22 componentes y catorce originales adicionales: doce documentos del BOE/DOUE, la quinta Opinión del IMV de AIReF y la nota del Pleno del Congreso sobre la renovación del pacto contra la violencia de género. El total pasa a 46 fichas y 104 componentes. Las 38 revisiones anteriores conservan su contenido y fecha; no se fabrica una revisión histórica de las ocho nuevas.

- IMV: resultado parcial sustentado por AIReF. La cobertura estimada crece del 41,8 % al 44,2 % en 2025, mientras el 52 % de hogares potenciales no solicita la prestación. Se delimita territorio fiscal común, exclusión de Navarra y País Vasco, estimación mediante simulador y diferencia entre hogares y personas. Los datos de 2025 no evalúan la reforma de marzo de 2026.
- Alimentación escolar, atención al cliente y electricidad: se conservan las entradas o aplicaciones diferidas. No se declaran incumplidas obligaciones todavía abiertas en 2027/2029 ni se deduce la ejecución de la fecha de una norma.
- CGPJ: veinte nombramientos a propuesta de ambas Cámaras; no se extrapola a todos los órganos ni se atribuye al Ejecutivo en exclusiva.
- Impuesto mínimo: se conserva el umbral de grandes grupos y el cálculo por jurisdicción. No es un 15 % universal del beneficio contable ni prueba de recaudación.
- Asilo: el artículo 85 original mostraba 1 de julio de 2026; la corrección oficial de noviembre de 2025 lo cambia al 12 de junio. También se conserva y lee la corrección de septiembre de 2026. La encomienda española de notificaciones acredita un acto concreto posterior al corte gubernamental, no mejora probada de todos los procedimientos.
- Violencia de género: renovación parlamentaria, distribución presupuestaria y eficacia se examinan por separado. Un crédito distribuido no equivale a gasto justificado ni atención efectiva.

Los originales se conservan con huellas verificables. La prueba de integridad comprueba también identificador, título y fecha de los documentos DOUE. La página 28 de AIReF se inspeccionó visualmente para cotejar gráficos, porcentajes y definición de no solicitud.

Pendientes actuales: 157 nacionales, 296 de Madrid, 344 de Navarra y los otros 67 inventarios/balances territoriales; revisión humana independiente pendiente. Esta ampliación no cierra la cobertura ni autoriza a presentarla como completa.

## Euskadi: programa íntegro y dos primeras revisiones (11 de octubre)

El programa de la XIII Legislatura, 2024–2028, contiene 154 compromisos, 846 iniciativas y 32 áreas. Se conserva el PDF original de 129 páginas, la extracción por página, el registro de Irekia y el balance gubernamental de 2025. El importador verifica secuencias y cantidades; no cuenta el índice dos veces ni convierte las 846 iniciativas en compromisos adicionales. La iniciativa 6 del compromiso 11 comparte línea impresa con la 5: se separa sin perder su texto. Se cotejan los 154 títulos con el índice; dos erratas del índice (143 y 151) no sustituyen al texto del cuerpo.

Las iniciativas se despliegan dentro de cada compromiso y son buscables. El compromiso 52 repite medidas de ayudas del 18, pero contiene ocho iniciativas frente a cinco: no hereda su revisión. El balance gubernamental tampoco proporciona estados automáticos ni un porcentaje de cumplimiento de RegTrack.

Dos fichas parciales, ocho componentes:

- Salud: documento del pacto de junio de 2025, tablas de Osakidetza a noviembre de 2025 y mayo de 2026, y expedientes del Ararteko de 2025. Los cortes muestran mayor demora; no se atribuye a huelgas, plantilla u otra causa sin evaluación. Pacientes quirúrgicos y citas de consultas/pruebas conservan sus unidades. El Ararteko aporta expedientes propios pero reproduce las estadísticas del prestador: no es un segundo recuento independiente. Se señalan formulaciones distintas del resumen del informe, sin extrapolar sus porcentajes.
- Emancipación: se cotejan los umbrales con las normas. Gaztelagun incluye exactamente 30.000 €; Emantzipa exige ingresos inferiores. No se infiere pago, cobertura ni efecto sobre emancipación de estas condiciones; las otras tres iniciativas siguen sin resolver.

Nueve originales conservados (ocho PDF y un HTML) con huellas comprobadas. Inspección visual del programa p. 33, ambas tablas quirúrgicas p. 3, Ararteko PDF p. 87 (impresa 89) y requisitos Gaztelagun p. 4. Reproducción: `npx tsx scripts/import-euskadi-programme.ts`. Pruebas: `npx vitest run tests/mandate-euskadi.test.ts`; los recorridos de `e2e/mandato-territorios.spec.ts` incluyen búsqueda por texto de iniciativa y móvil. La etiqueta de datos declarados se formula de manera neutral: un dato del Gobierno puede reflejar un retroceso.

Pendientes tras esta incorporación: 157 nacionales, 296 de Madrid, 344 de Navarra, 152 de Euskadi y otros 66 inventarios/balances territoriales. La revisión humana independiente sigue pendiente; la sección no está finalizada.


## Cataluña — inventario y primeros contrastes, 11 de octubre

- Se incorporan las 260 medidas de 35 objetivos y cinco prioridades del Pla de Govern de la XV legislatura. Los 30 proyectos destacados son una selección, no compromisos adicionales. Se mantiene el texto íntegro en catalán, su idioma para lectores de pantalla, numeración y páginas; los temas en español permiten buscar «vivienda». El periodo 2024–2027 es el del plan y no una fecha electoral. Los horizontes de 2030 y veinte años se conservan.
- El importador valida las 121 páginas, las secuencias y el número de medidas por objetivo; trata el identificador de la medida 1.6.4 que aparece en una línea separada. La importación es reproducible contra la huella del PDF y no genera valoraciones.
- Revisión 1.7.6: bases, convocatoria, modificación de edad a 18–40, préstamo de entrada a interés cero, devolución diferida y protección permanente. La primera firma y 343 aprobaciones de agosto de 2025 se atribuyen al ICF; no se confunden aprobaciones con desembolsos ni con el balance actual. Sigue abierta la relación entre el instrumento a tipo cero y la promesa adicional de bonificación de intereses, además de los resultados efectivos.
- Revisión 2.2.6: aprobación parlamentaria del presupuesto de carbono 2026–2030 y valoración crítica del comité de expertos. Los 161,562 millones de toneladas de CO₂ equivalente son un acumulado quinquenal sin LULUCF, no emisiones anuales medidas ni reducción lograda. Quedan pendientes estímulo, ayudas, mercado y resultados.
- Nueve fuentes: ocho originales conservados (programa, registro, tres normas, dos páginas ICF y valoración del comité) y una nota de lectura del BOPC. El lector web permitió consultar el boletín, pero Node y curl no descargaron el PDF: su huella identifica el extracto editorial, no el original. Se declara el archivo y cotejo visual pendientes en la propia ficha.
- Siete componentes revisados en dos fichas; 258 medidas catalanas pendientes. Fuentes gubernamentales no se cuentan como verificaciones independientes; todas las fichas mantienen revisión humana independiente pendiente.

Reproducción: `npx tsx scripts/import-catalunya-programme.ts`. Pruebas de mutaciones contra páginas y números omitidos, reproducción completa del inventario, trazabilidad, filtros, idioma original y móvil. Validación local: 367 tests en 48 archivos; ESLint, TypeScript y build webpack correctos; 51 trazas, 94 dependencias y ocho rutas obligatorias comprobadas. En navegador, 22 recorridos correctos y uno de Madrid repetido correctamente tras actualizar la etiqueta «documento original»: 23 recorridos cubiertos. Inspección visual de las páginas 61, 62 y 68 del programa, p. 3 de la modificación de 2026 y captura móvil. Una ejecución inicial aislada de tests agotó el tiempo en la consulta nacional; la suite completa posterior pasó sin cambiar tiempos ni implementación.

## Barcelona — catálogo íntegro y dos primeros contrastes, 11 de octubre

Se conserva el catálogo público de 1.248 actuaciones y cada ficha HTML original, con URL, fecha de captura, tamaño y SHA-256. El importador verifica los originales, exige una ficha por identificador y conserva todo el texto del artículo municipal, incluidos presupuesto, calendario, novedades y enlaces. Los títulos se cotejan normalizando únicamente espacios. Las fichas se pueden desplegar y buscar por su texto completo en catalán; el navegador recibe texto y referencias, no HTML bruto ni rutas de archivo.

Este catálogo vivo no reconstruye las promesas originales. El PDF del plan localizado en BCNROC no se pudo recuperar: el servidor respondió con una página de redirección ajena al documento. No se siguió esa redirección ni se interpretó su contenido como el plan. La interfaz y el criterio de cierre dejan este pendiente explícito. Las fechas de captura no son fechas de ejecución; los 538 estados «Finalitzada», 439 «En execució» y 271 «En planificació» son declaraciones municipales, no valoraciones de RegTrack.

- Port Olímpic: la ficha se contrasta con una resolución de nueve páginas de la Sindicatura. Se conservan las quejas por barreras de acceso en la reapertura y las mejoras posteriores, resueltas o en curso. La información técnica aportada por el gestor no se cuenta como inspección externa integral. El proyecto comienza antes de 2023; la resolución no acredita el estado actual de cada acceso ni los resultados económicos y ambientales.
- Via Laietana: crónica de apertura de junio de 2025 y noticia de Europa Press de julio sobre sentencia y recurso anunciado. Son extractos editoriales identificados. Sin sentencia original ni seguimiento no se afirma anulación firme actual. Los 38,16 millones publicados por el Ayuntamiento no se convierten en liquidación auditada; apertura, costes e impactos se valoran por separado.

Se añaden ocho fuentes al registro territorial (seis originales y dos extractos), además del archivo de las 1.248 fichas. Ninguna importación crea una revisión. El criterio de cierre impide dar por completo un catálogo revisado si el inventario original sigue pendiente.

Reproducción sin red: `python -B scripts/import-barcelona-catalogue.py`. Verificación: `python -B -m unittest discover -s tests -p 'test_barcelona_import.py'` y `npx vitest run tests/mandate-barcelona.test.ts`. La captura inicial usa `node scripts/capture-barcelona-catalogue.mjs`; comprueba los archivos existentes y no los sobrescribe. Las pruebas comprueban pérdida o duplicación de fichas, hashes alterados, URL reasignada, página inesperada y rutas fuera del archivo. Los recorridos de navegador incluyen navegación desde cobertura, filtros, búsqueda dentro de las fichas y móvil.

Pendientes: 157 nacionales, 296 de Madrid, 344 de Navarra, 152 de Euskadi, 258 de Cataluña, 1.246 actuaciones del catálogo de Barcelona y la reconstrucción de sus promesas; inventarios y balances de otros 64 territorios (16 administraciones autonómicas/ciudades y 48 capitales). La revisión humana independiente y la publicación integral siguen pendientes.

Validación local de esta incorporación: 375 tests en 49 archivos y siete pruebas Python; TypeScript, ESLint y build webpack correctos. Control de empaquetado: 51 trazas, 96 dependencias y ocho rutas requeridas. Los 25 recorridos de navegador pasan; los dos nuevos verifican Barcelona y la captura móvil se ha inspeccionado. Se repitió únicamente el recorrido móvil de Barcelona para guardar también una captura de viewport legible. El 404 de un territorio sin inventario conserva el aviso interno NoFallbackError de Next, sin alterar la respuesta esperada.


## Vitoria-Gasteiz — cien compromisos originales y seguimiento separado, 11 de octubre

Se conserva el programa original de 116 páginas, con sus cien fichas completas (objetivos, descripción, hitos y beneficios), y el seguimiento municipal de cien registros. Las numeraciones son diferentes: 2.17 del programa se corresponde con 2.3.3 del seguimiento. Se cotejan todas las secuencias y títulos, con seis diferencias explícitas conservadas. Por ejemplo, «sombras» permanece en el título original de patios escolares aunque desaparezca del título posterior. No se sustituye la promesa por su reformulación.

El portal indica una actualización de 29 de julio de 2026; numerosas fichas describen el estado en junio. Se mantienen los cortes dentro del texto. Los porcentajes pertenecen a escalas municipales de etapas y no generan revisiones ni porcentajes de cumplimiento de RegTrack. Programa y seguimiento se despliegan por separado y ambos son buscables.

- ZBE: ordenanza aprobada, balance de seis meses declarado por el Ayuntamiento y decisión de agosto de 2026 de no implantar el APR. Se distingue esta decisión de una reforma normativa publicada y de la continuidad de la ZBE. El RACVN aporta una posición de parte y noticia de un recurso a comienzos de 2026, no una sentencia ni el estado procesal de octubre. Evaluación ambiental y ejecución completas pendientes.
- Tranvía a Zabalgana: responsabilidades municipales y de ETS, aprobación del proyecto Mariturri y anuncio posterior de comienzo de trabajos en Aldaia. Presupuesto base con IVA y plazo estimado no se convierten en gasto ejecutado ni fecha de apertura. Se señala una inconsistencia de denominación en los antecedentes de la resolución, cuyo apartado operativo identifica Mariturri. No hay apertura ni resultados de movilidad acreditados.

Dos revisiones parciales, nueve componentes; nueve fuentes originales y un extracto editorial del RACVN. La ordenanza OTA de agosto de 2025 examinada durante la búsqueda no se confundió con una modificación de la ordenanza ZBE. Inspección visual del programa p. 50 y del apartado operativo BOPV p. 3. Reproducción: `python -B scripts/import-vitoria-programme.py`. Pruebas: `python -B -m unittest discover -s tests -p 'test_*_import.py'` y `npx vitest run tests/mandate-vitoria.test.ts`.

## Donostia / San Sebastián — catálogo y discrepancias, 11 de octubre

Se conservan las 129 fichas distintas enlazadas por el catálogo consultado, aunque la portada anuncia 127. Solo 27 incluyen un recurso de seguimiento detallado, con identificadores 1–27; las otras 102 se mantienen sin inventar porcentajes. Los enlaces antiguos al PDF del programa devuelven una portada HTML: el inventario original y los cambios del plan siguen pendientes, igual que en otros catálogos actuales. No se elimina ninguna ficha para hacer coincidir el total anunciado.

La captura conserva HTML original, huella, URL y fecha por ficha y seguimiento. La importación sin red reproduce todos los textos y mantiene porcentajes decimales, estado, actualización, iniciativas, presupuestos e indicadores cuando existen. Un 0% es un dato publicado; la ausencia de seguimiento es otra cosa. La ficha de derechos humanos combina 100% con «En marcha»: no se corrige por inferencia. La proyección pública omite rutas locales y HTML bruto.

Dos revisiones parciales, once componentes, 37 fuentes registradas de origen municipal:

- **Vivienda:** 6.000 viviendas para 2033; 673 licencias y 310 segregaciones de 2023–2024, sin convertirlas en entregas ni compararlas directamente con un único año. El registro del pleno de 24 de septiembre de 2026 enlaza el dictamen de adaptación de Illarra a una anulación parcial. El PDF termina como propuesta: faltan acta, publicaciones posteriores y sentencia original; no se afirma aprobación definitiva.
- **Movilidad:** ordenanza publicada y corregida en diciembre de 2024, frente a una previsión antigua de apertura que sigue en el portal. El 100% suma actuaciones de planificación y puesta en marcha. Ruido de Urbieta de 2025 por encima de metas; indicador nocturno etiquetado Ld, pendiente de corregir en origen. La encuesta 2021–2022 y accesos por cámaras 2025–2026 necesitan demostrar comparabilidad. NO₂ anual 2025 de 18 en la ficha frente a 16,55 citado en la nota de octubre: el periodo del segundo no queda igual de claro. Enero–agosto de 2026 no se equipara al año completo ni se atribuye causalidad sin evaluación.

Se buscó contraste ambiental en la red oficial vasca y Ecologistas en Acción. El índice de informes anuales consultado llega a 2024; la publicación de la entidad y el PDF de medición escolar respondieron 403. No se presentan como documentos incorporados ni se usan los extractos del buscador para dar por corroborados los resultados. El control externo y la revisión humana independiente permanecen pendientes.

Reproducción: `python -B scripts/import-donostia-catalogue.py`; fuentes registradas: `python -B scripts/register-donostia-sources.py`. Las pruebas negativas comprueban pérdida, duplicación, reasignación, cambios de originales, límites de contenido y seguimientos omitidos. Navegación desde cobertura, búsqueda por periodos, porcentajes decimales y móvil tienen recorridos de navegador. Se inspeccionó visualmente la página 1 del dictamen de Illarra.

Tras esta incorporación quedan 127 fichas de Donostia sin revisión sustantiva y 62 territorios sin inventario importado (16 comunidades/ciudades autónomas y 46 capitales), además del trabajo pendiente de los otros balances. La sección y la publicación integral siguen abiertas.

Pendientes: 157 nacionales, 296 de Madrid, 344 de Navarra, 152 de Euskadi, 258 de Cataluña, 1246 actuaciones de Barcelona, 98 compromisos de Vitoria y 127 fichas de Donostia; reconstrucción de promesas de ambos catálogos y otros 62 territorios. Revisión humana independiente y publicación integral pendientes.

Validación local de Vitoria: 380 pruebas en 50 archivos, quince pruebas Python, TypeScript y ESLint correctos; build webpack correcto tras repetirlo con permisos para crear su directorio de salida (el primer intento falló con EPERM). Se verifican 51 trazas, 98 dependencias y ocho rutas. Los 27 recorridos de navegador pasan, incluidos dos de Vitoria; captura de móvil inspeccionada.


## Bilbao — programa completo desde copia identificada y contraste, 11 de octubre

- Se conservan las 47 páginas de una copia del programa municipal difundida por EAJ-PNV, con sus 80 actuaciones prioritarias y descripciones completas en diez líneas. La copia no es otro origen independiente del programa. El registro municipal coincide en título, estructura y recuento, pero sus descargas devuelven 403: no se afirma igualdad de bytes. El propio programa no pretende recoger toda la actividad municipal.
- Extracción reproducible por coordenadas de las dos columnas. Respeta la columna más estrecha de euskera y los marcadores que añaden un punto antes del guion. Conserva el PDF, texto sin normalizar y posiciones; verifica hashes del original y de la extracción antes de importar. Pruebas negativas contra páginas o medidas omitidas/duplicadas, pérdida de descripciones, columnas cambiadas y bytes alterados. Inspección visual de páginas 13 y 28.
- La interfaz identifica la copia en el enlace y en cada ficha; no la denomina archivo municipal original. El registro anuncia seguimiento a junio de 2026 mientras su párrafo aún dice diciembre de 2024. No se recuperó ese PDF ni se importan porcentajes o estados.
- Eventos (1.10): UEFA documenta la adjudicación en julio de 2021, anterior al mandato, y las finales celebradas en 2024 y 2025. Tres documentos del mismo organizador no son tres corroboraciones independientes. La celebración no demuestra empleo, retorno económico, sostenibilidad ni aportación municipal; esas partes quedan abiertas.
- Vivienda (6.3): unos 200 recursos sociales por distintas vías y unos 23 millones previstos, sin reducirlo a obra nueva. La orden original de 13 de mayo de 2026, publicada en BOPV el 26, reconoce 63 viviendas municipales en Bolueta y las excluye del procedimiento de otras 81 más 19 de Monte Eretza. Se distinguen titularidades, fases y antecedentes previos al mandato. No se calcula cumplimiento como 63/200, ni se agregan las 100 autonómicas al parque municipal ni se dan por entregadas.
- Dos revisiones parciales, nueve componentes y seis fuentes registradas: dos archivos originales y cuatro notas editoriales explícitas. La descripción de fuentes en la cobertura ahora distingue notas de originales según el material conservado, también cuando la función documental es registro o actuación. Ninguna revisión humana independiente acreditada.

Reproducción sin red: `python -B scripts/import-bilbao-programme.py` y `python -B scripts/register-bilbao-sources.py`. Para regenerar coordenadas desde el PDF se requiere pypdf y `scripts/extract-bilbao-programme.py`; una diferencia respecto a la extracción aprobada detiene la sustitución.

Tras esta incorporación quedan 78 compromisos de Bilbao sin revisión sustantiva y 61 territorios sin inventario (16 comunidades/ciudades autónomas y 45 capitales), además de 157 nacionales, 296 Madrid, 344 Navarra, 152 Euskadi, 258 Cataluña, 1246 Barcelona, 98 Vitoria y 127 Donostia. Reconstrucción de ambos catálogos, cotejo del programa de Bilbao, revisión humana independiente y publicación integral pendientes.

Validación local: 392 pruebas cubiertas en 52 archivos (391 correctas en la suite completa; cuatro de Bilbao repetidas correctamente tras corregir una aserción textual), 25 pruebas Python, TypeScript y ESLint correctos. Build webpack y guardián: 51 trazas, 102 dependencias, ocho rutas. Primera pasada de navegador: 30/31; el móvil de Bilbao detectó la falta de etiqueta editorial junto a las citas. Tras añadirla y recompilar, los 16 recorridos territoriales pasan; los otros 15 habían pasado y no dependen de ese componente. Captura móvil inspeccionada y legible. El aviso NoFallbackError de la ruta deliberadamente inexistente mantiene la respuesta 404 esperada.

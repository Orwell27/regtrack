# Compromisos del piloto de balance de mandato

> **Estado actual:** véase [revisión nacional del 10 de octubre de 2026](mandate-review-2026-10-10.md). Las 30 fichas están revisadas, con 18 medidas acreditadas, seis resultados parciales, un objetivo no alcanzado en plazo y cinco resultados no concluyentes. Lo que sigue documenta el estado inicial del 7 de octubre y sus límites históricos.

Captura realizada el 7 de octubre de 2026. `data/mandate/commitments.json` contiene **30 compromisos reales** del inventario oficial Cumpliendo de julio de 2026: 8 con un contraste documental acotado y 22 `sin_verificar`. No contiene una nota global del Gobierno, una estimación de honestidad ni una atribución causal de resultados.

## Universo, selección y fechas

La [entrega de La Moncloa](https://www.lamoncloa.gob.es/paginas/cumpliendo/rendicion-de-cuentas-julio-2026.aspx), publicada el **28 de julio de 2026**, rinde cuentas desde la investidura de noviembre de 2023 hasta el **30 de junio de 2026**. Su [CSV descargable](https://www.lamoncloa.gob.es/Documents/2026/compromisos-medidas-clasificaciones-cumpliendo-julio.csv) contiene 203 compromisos con datos. La fecha de revisión editorial del piloto, 7 de octubre, no amplía el período de las declaraciones del Gobierno.

La selección es editorial y no representativa. Prioriza empleo, vivienda, economía y bienestar, e incorpora educación y sanidad. IDs oficiales seleccionados: 1, 10, 17, 29, 32, 33, 53, 55, 58, 65, 74, 76, 78, 79, 87, 102, 107, 112, 122, 123, 131, 136, 137, 139, 143, 160, 170, 186, 187 y 196. Una fila oficial sigue siendo un compromiso: no se han creado compromisos adicionales separando sus componentes.

Todos incluyen como origen atribuido por el inventario el discurso de investidura o el acuerdo de coalición de 2023. Se conserva literalmente la columna `Origen`, incluidas las referencias `C.G.P.` y las comparecencias adicionales. La [descripción oficial de campos](https://www.lamoncloa.gob.es/Documents/2026/descripcion-datos-abiertos-cumpliendo-julio.pdf) explica estos orígenes. La correspondencia de cada fila con cada pasaje de todos sus documentos de origen todavía no está auditada.

`originDate` identifica la fecha del documento atribuido: 15 de noviembre de 2023 para el [discurso](https://www.lamoncloa.gob.es/presidente/intervenciones/paginas/2023/prsp15112023.aspx) o 24 de octubre de 2023 para el [acuerdo de coalición](https://www.socialistes.cat/actualitat/acuerdo-psoesumar/). **No significa primera fecha histórica en la que se formuló la promesa.** Algunos instrumentos tienen antecedentes anteriores a noviembre de 2023.

## Declaración del Gobierno y contraste editorial

El CSV **no incluye una columna de calificación individual del cumplimiento ni una columna de plazo**. Por eso `governmentAssessment.text` dice «El inventario publica medidas, sin calificación individual de cumplimiento». No se le atribuye a cada fila el porcentaje agregado del informe.

Los campos `governmentReportedData` conservan íntegros las iniciativas de semestres anteriores, las del semestre actual, las fuentes de verificación y las clasificaciones oficiales. Esas fuentes enlazadas son una declaración del Gobierno: su inclusión no significa que se hayan comprobado todos los enlaces. Una celda vacía significa que ese campo está vacío en esta entrega; no demuestra inactividad.

`governmentMeasures` resume algunas declaraciones en lenguaje sencillo y las identifica como paráfrasis gubernamentales. `title`, `simpleExplanation`, `topics`, `kind`, la nota de competencia y el criterio de contraste son elaboración editorial. `text` es la formulación literal del **inventario**, que no debe presentarse como una transcripción literal del programa electoral o del discurso.

Los estados de revisión tienen alcance limitado:

- `sin_verificar`: se ha importado el compromiso, pero su ejecución o resultado no se ha contrastado en este piloto. No equivale a incumplido.
- `actuacion_documentada`: existe evidencia primaria de una actuación relacionada. No equivale a cumplimiento íntegro, ejecución efectiva o resultado social.
- `contraste_parcial`: se ha documentado un componente, una diferencia de alcance o una limitación que impide concluir sobre el conjunto.

## Ocho contrastes documentales

Se consultaron y conservaron los XML de publicación original del BOE. Los artículos indicados se leyeron para elaborar las conclusiones. Los XML también incluyen metadatos y análisis actualizados: capturarlos no supone haber auditado la vigencia completa y todos los cambios posteriores de cada norma.

| ID | Evidencia primaria | Qué permite afirmar y qué falta |
| --- | --- | --- |
| 17 | [Convenio MIVAU–ICO, BOE-A-2024-9128](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-9128), anejo, estipulaciones primera y segunda | Documenta el instrumento de avales para primera vivienda. El límite financiero previsto no es ejecución, operaciones concedidas ni mejora demostrada del acceso a vivienda. |
| 74 | [Índice de actualización de alquileres, BOE-A-2024-26685](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-26685), apartados primero a tercero | Documenta el índice de actualización anual. No debe confundirse con el sistema de referencia de nuevos contratos en zonas tensionadas, ni utilizarse para afirmar una protección efectiva ante desahucios. |
| 107 | [SMI 2025, BOE-A-2025-2576](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-2576) y [SMI 2026, BOE-A-2026-3815](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-3815), artículos 1 y 3 | Documentan las cuantías anuales. No prueban por sí solas una garantía permanente en el Estatuto de los Trabajadores ni una comprobación estadística independiente del 60 %. La norma de 2025 es evidencia histórica. |
| 139 | [RDL 9/2025, BOE-A-2025-15741](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-15741), artículos primero y segundo; acuerdo de 2023, página 22 | Documenta diecinueve semanas por nacimiento. El acuerdo incluía veinte semanas y otro componente de permiso parental retribuido desde agosto de 2024. No se etiqueta el agregado como cumplido. |
| 143 | [RDL 2/2024, BOE-A-2024-10235](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-10235), artículo segundo, apartado ocho | Documenta la reforma asistencial y el subsidio escalonado. Faltan datos sobre cobertura efectiva y suficiencia; no demuestra reducción del paro. |
| 186 | [RD 1312/2024, BOE-A-2024-26931](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-26931), artículos 1 y 6 | Documenta el registro y las obligaciones de plataformas. No acredita todas las actuaciones autonómicas/locales ni la retirada efectiva de los anuncios comunicada por el Gobierno. |
| 187 | [Ley 7/2024, BOE-A-2024-26694](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-26694), disposición final novena | Documenta el impuesto de determinadas entidades financieras. Quedan sin contrastar el componente energético, la recaudación y la incidencia distributiva. |
| 196 | [RDL 3/2026, BOE-A-2026-2548](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-2548), artículo 2.1 | Documenta la revalorización general de 2026 y su vínculo normativo con el IPC. No audita todos los pagos ni todos los años. La referencia correcta es 2548; se conserva sin alterar el enlace 2547 que también aparece en la declaración gubernamental. |

## Plazos y alcance

La ausencia de una columna de plazo no autoriza a inventarlo. `officialDeadline` conserva texto y fuente cuando se localizó una referencia temporal; `date` permanece nulo si el documento no fija día exacto. Los campos `year` y `month` conservan la precisión disponible y `scope` evita extender el plazo de un componente a todo el compromiso.

Además de las referencias temporales presentes en el CSV, se consultaron las páginas 4, 11, 12 y 22 del [acuerdo original publicado por el PSC](https://www.socialistes.cat/wp-content/uploads/2023/10/ACUERDO_GOBIERNO_COALICIO%CC%81N_2023-.pdf). Se documentaron el horizonte de legislatura para el paro europeo, 2025 para culminar la jornada de 37,5 horas, 2024 para los perfiles individualizados de paro de larga duración y agosto de 2024 para el componente parental retribuido. Un plazo transcurrido sin revisión suficiente **no se transforma automáticamente en incumplimiento**.

Los plazos nulos restantes se acompañan de una nota explícita: no consta una fecha en la columna importada y no se ha completado la búsqueda de plazos en sus documentos de origen. Tampoco se convierte una fecha electoral en plazo de todas las promesas.

## Capturas, reutilización y reproducibilidad

`data/mandate/evidence/commitments/` conserva 16 capturas públicas, aproximadamente 5,1 MB en conjunto: el CSV, su página de publicación y diccionario, el discurso, nueve XML del BOE, dos avisos legales y un extracto editorial del acuerdo. Cada entrada de `sources` contiene URL, título, organismo, fechas, localizador, paráfrasis, ruta de captura y SHA-256. `publishedAt: null` en los avisos legales indica que no se ha establecido su fecha de publicación; no se sustituye por la de captura.

El SHA-256 del CSV original es `569c7ddff5ba57f134d6a27aeb49d558c8eb8dfc318d55af4f99e0a7fd00884b`. Se decodificó como Windows-1252, con separador `;` y campos entrecomillados multilínea. Los dos primeros registros son rótulos; el tercero es la cabecera. Se descartaron solo los registros totalmente vacíos: quedan 203 registros de datos, de los cuales se seleccionaron los 30 IDs declarados. No se recortaron espacios ni saltos internos del texto oficial.

La [reutilización de La Moncloa](https://www.lamoncloa.gob.es/Paginas/es_AvisoLegal.aspx) permite reproducir y transformar información con sus condiciones, respetando derechos de terceros, sin alterar el sentido y citando el origen y la actualización. Atribución conservada: «Origen de los datos: sitio web de lamoncloa.gob.es. Ministerio de la Presidencia.» Fecha de la entrega: 28 de julio de 2026. Para el BOE se conserva su [aviso legal](https://www.boe.es/informacion/aviso_legal/index.php) y la identificación de cada disposición. Se identifican expresamente las paráfrasis editoriales.

No se ha verificado una licencia para redistribuir íntegro el PDF del acuerdo de los partidos. Por eso **no se copia el PDF**: se guarda un extracto breve de elaboración editorial con localizadores y enlace al original. Su SHA corresponde al extracto local, no a los bytes del PDF remoto. El discurso y el CSV sí se conservan como capturas originales bajo las condiciones de La Moncloa.

Comprobaciones ejecutadas: lectura independiente con el módulo estándar `csv` de Python, identificación única de los 203 registros y los 30 seleccionados, comparación exacta de los 30 textos y orígenes y de 90 campos de declaraciones, comprobación de los 16 SHA-256, referencias de evidencia resueltas y presencia de evidencia para los 8 estados revisados. El intento inicial con `ConvertFrom-Csv` contó también las filas vacías; se sustituyó por la comprobación independiente que respeta los campos multilínea y los espacios originales. No se ha ejecutado una auditoría de todos los enlaces del CSV, una ingesta periódica, una evaluación causal ni una publicación en producción.

Siguiente trabajo de datos: contrastar uno a uno los 22 pendientes y completar sus documentos de origen y plazos; incorporar ejecución presupuestaria, prestaciones y resultados comparables; revisar las competencias concretas de cada componente y registrar cambios de criterio con su evidencia. No ampliar automáticamente los 8 estados revisados a nuevos períodos por conservar la misma norma.

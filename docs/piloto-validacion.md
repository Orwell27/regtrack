# Piloto de validación de RegTrack

**Preparado, todavía sin ejecutar la IA.** Ocho entradas, siete documentos históricos y 27 comprobaciones. Las referencias son propuestas de Codex pendientes de revisión humana. Sirven para descubrir errores y ajustar el sistema; no acreditan precisión jurídica, vigencia actual ni autonomía.

## Qué compara

Se conserva el texto de la publicación original, la URL oficial, la fecha de publicación, la procedencia de la descarga y un SHA-256. El hash y la entrada al modelo normalizan CRLF a LF para reproducir el ensayo en Windows y Linux. No se actualizan los documentos durante el ensayo.

| Caso | Decisión propuesta | Comprobaciones |
|---|---|---:|
| [RD 1312/2024: registro de arrendamientos](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-26931) | Analizar y producir candidato a alerta | 4 |
| [RD 390/2021: certificación energética](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2021-9176) | Analizar y producir candidato a alerta | 4 |
| [Resolución del índice de actualización de alquileres](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-26685) | Analizar y producir candidato a alerta | 3 |
| [Nombramiento de personal sanitario](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-13325) | Descartar por materia | 2 |
| [Beca del Museo del Prado](https://www.boe.es/diario_boe/txt.php?id=BOE-B-2024-25128) | Descartar por materia | 3 |
| [Convenio de cursos de español](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-19452) | Descartar por materia | 2 |
| [Decreto 256/2019: viviendas turísticas de Murcia](https://www.borm.es/services/anuncio/780550/txt) | Analizar y producir candidato a alerta | 6 |
| Mismo decreto, únicamente su título | Conservar pendiente de texto/revisión | 3 |

Los controles de nombramiento y beca pertenecen a secciones II y V del BOE, fuera del filtro de ingesta actual. Prueban el clasificador, no la cobertura del escáner. La beca contiene todo el extracto publicado, no las bases de BDNS. El decreto murciano reutiliza el texto histórico ya conservado en `tests/fixtures`: no hace nuevas peticiones a BORM. La variante con título es una degradación deliberada de ese texto, no otro documento descargado.

El catálogo de revisión contiene fechas que no siempre aparecen en el texto enviado al modelo. No se exige calcular una fecha absoluta si falta la publicación: reconocer la regla relativa y declarar esa carencia es una respuesta válida. Acertar usando conocimiento externo no demuestra lectura fiel de la entrada.

La referencia única está en `eval/pilot/cases.json`. Las citas de sus 27 comprobaciones se verifican literalmente contra cada entrada. Que una cita exista no demuestra por sí solo que la interpretación propuesta sea correcta.

## Preparación sin coste de IA

```sh
npm run pilot
```

Genera en `artifacts/pilot/prepared/`:

- `review.md`: documento legible con preguntas, respuestas propuestas y fragmentos de evidencia.
- `corpus.json`: copia de las referencias para revisión.
- `inputs.jsonl`: entrada ciega, sin etiquetas, respuestas ni citas seleccionadas para corregir.
- `report.md` y `report.json`: estado **not_run**, sin resultados inventados.

Este comando no carga credenciales ni clientes de IA y no accede a fuentes, datos de producción o servicios externos. Es repetible y está incluido en las pruebas locales del piloto.

## Revisión de las referencias y ejecución real

1. Revisar el documento legible con alguien competente en la materia. Corregir las referencias canónicas y registrar responsable y fecha en `reference`. No atribuir una aprobación humana a Codex. Congelar esa versión antes de comparaciones definitivas: cambiar expectativas o textos cambia el hash y exige una ejecución compatible. Registrar únicamente una aprobación no cambia el hash ni obliga a repetir llamadas de pago.
2. Con autorización expresa del coste, ejecutar el modelo existente. La implementación admite esta ejecución, pero **no se ha realizado**:

```sh
npm run pilot -- --live --allow-paid-api --max-cases 8
```

Usa `ANTHROPIC_API_KEY`, las funciones y prompts actuales. Hace una llamada lógica de clasificación por caso y otra de impacto si se considera relevante: hasta 16 para ocho casos. Los reintentos internos del SDK pueden producir más solicitudes. El límite de casos no es un límite monetario; no se ha estimado ni medido el importe facturado.

Si la clave solo está en GitHub, el workflow existente admite `mode=pilot` y `allow_paid_pilot=true`. Esa selección omite por completo el job de escaneo y ejecuta únicamente el piloto con la clave de Anthropic; no recibe secretos de base de datos. Los ocho casos quedan fijados en el comando y los resultados se conservan como artefacto durante 30 días. La autorización es obligatoria; el modo normal y el cron conservan el escaneo. [GitHub permite elegir la rama del workflow con `--ref`](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).

Conserva un directorio nuevo por ejecución, con `run.json` actualizado tras cada caso, hashes de código/prompts y modelos. No guarda en la base de datos, no envía alertas ni cambia el cron. `alert` significa candidato con puntuación ≥4 siguiendo el filtro actual. No prueba su persistencia o entrega. Este ensayo omite las cabeceras opcionales de metadatos BOE del flujo de producción, una diferencia que debe considerarse al interpretar resultados.

3. Revisar los resultados contra las 27 comprobaciones. Usar `reviews-template-HASH.json` (nombre ligado a la ejecución, nunca se sobrescribe): cada revisión exige caso, comprobación, `pass` o `fail`, responsable, fecha, motivo y `outputQuote` literal de la respuesta. Usar `null` para una omisión o para ausencia de una afirmación indebida; explicar el motivo. Un descarte correcto no tiene que recitar detalles de un documento irrelevante. En los positivos sí deben señalarse omisiones que impidan actuar correctamente.
4. Recalcular con ambos archivos, manteniendo intacto el directorio de la ejecución:

```sh
npm run pilot -- --results artifacts/pilot/run-FECHA/run.json --reviews artifacts/pilot/run-FECHA/reviews-template-HASH.json --out artifacts/pilot/reviewed
```

Se rechazan revisiones de otra ejecución/corpus, citas inexistentes, resultados duplicados y casos ajenos. Los campos de autoría son registros de revisión, no autenticación de identidad. Las simulaciones se etiquetan `simulated` y solo sirven para verificar el evaluador.

## Qué se mide y qué queda pendiente

| Medida | Numerador / denominador | Uso |
|---|---|---|
| Detección de relevantes | Casos relevantes con alerta / los 4 relevantes de la muestra | Encontrar omisiones; ausencias y errores siguen en el denominador |
| Precisión de alertas | Alertas de casos relevantes / todas las alertas emitidas | Encontrar avisos improcedentes; sin alertas queda sin medir |
| Comprobaciones superadas | Comprobaciones aprobadas / comprobaciones revisadas | Interpretar siempre junto a cobertura revisada / 27; no revisado no significa correcto |

Guardas adicionales: el título aislado debe quedar pendiente; cualquier error de API se distingue de un descarte; se muestran los casos sin resultado, las referencias pendientes y la duración por caso. Sin ejecución, la calidad no se calcula. `reviewed` significa revisión completa, **no aprobación para producción**: pueden existir fallos.

No fijamos porcentajes de aceptación como si ya existiera una línea base. Para plantear un ensayo autónomo, la propuesta es resolver todos los fallos críticos de obligaciones/fechas y de abstención de este piloto, completar su revisión y pasar después una muestra distinta. Con cuatro positivos, cada omisión cambia 25 puntos la detección; este tamaño no permite extrapolar fiabilidad al universo de normas.

Los documentos descartados y las fuentes que no devolvieron nada también deben entrar en la validación posterior. La siguiente muestra debe reservarse antes de ajustar prompts y contener otras fechas, jurisdicciones, derogaciones, excepciones y fallos de descarga. Probar de nuevo los mismos ocho casos después de ajustar el modelo mide ajuste a esta muestra, no generalización.

## Riesgos observados en el código, aún sin medición del modelo

- El prompt de impacto asigna puntuación 1 al texto insuficiente; el flujo descarta puntuaciones menores de 4. Existe un conflicto con conservar lo insuficiente pendiente de revisión.
- `plazo_adaptacion` se define como diferencia entre publicación y entrada en vigor. El caso murciano permite contrastarlo con un verdadero plazo de adaptación de seis meses.
- El catálogo `tipo_norma` no incluye un decreto autonómico como categoría propia.
- El esquema no distingue sistemáticamente fechas literales, fechas calculadas y estado de vigencia actual.
- La llamada de análisis recibe título y texto, pero no el metadato separado de publicación; algunos textos extraídos ya no incluyen esa fecha. El piloto admite abstención y deja registrada esta limitación del flujo actual.

Son riesgos identificados leyendo prompts y código. No se presentan como respuestas erróneas observadas del modelo. Este piloto prepara la evidencia para decidir los cambios; no modifica esos prompts.

## Para validar la autonomía y la correlación con noticias

Este ensayo cubre comprensión documental. Quedan otras dos comparaciones independientes:

- **Cobertura de vigilancia:** contrastar por fechas el inventario oficial con lo recogido, incluyendo cero resultados, fuentes caídas y documentos descartados. Una fuente inaccesible no puede calificarse como «sin novedades».
- **Correlación:** revisar parejas noticia–norma y casos sin pareja. Conservar fuentes consultadas, periodo, entidades y artículos que apoyan cada vínculo. «No encontrada en estas fuentes y fechas» es el resultado comprobable; «no existe noticia» exige una cobertura que aún no tenemos. Una correlación o una predicción no se convierte en obligación jurídica.

Ni esta muestra ni una ejecución favorable sustituyen esas comprobaciones. La memoria del sistema deberá conservar evidencias y correcciones sin reutilizar como hechos verificados sus propias hipótesis anteriores.

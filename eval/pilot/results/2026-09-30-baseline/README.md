# Primer ensayo real: detecta la materia, todavía necesita revisión

Ejecutado el **30 de septiembre de 2026**, tras autorización de Alfonso. [Ejecución en GitHub](https://github.com/Orwell27/regtrack/actions/runs/36716449512), commit `c541a35c5fd1739bd8cb39e1b76defbcf1b97aea`. Se usaron Haiku y Sonnet con los prompts existentes, sin entregar al modelo las respuestas esperadas.

**Revisión preliminar de Codex, realizada por IA. No es revisión humana ni validación jurídica independiente.** Las ocho referencias conservan su estado `proposed`. Tampoco se ha verificado la vigencia actual de estas publicaciones históricas.

## Resultado observado

| Comprobación de decisión | Resultado en esta muestra |
|---|---:|
| Textos completos relevantes que generan candidato a alerta | 4 de 4 |
| Documentos irrelevantes descartados | 3 de 3 |
| Entrada de solo título conservada pendiente de revisión | 0 de 1 |
| Candidatos a alerta que coinciden con la decisión esperada | 4 de 5 |
| Errores técnicos o casos sin resultado | 0 de 8 |

El caso de solo título produjo puntuación **4**, justo el umbral de alerta, aunque el modelo reconoció que no tenía el texto. No hubo un descarte por puntuación 1, que era el riesgo anticipado al leer el prompt: el fallo observado fue el contrario, admitir análisis insuficiente como candidato a alerta.

Se revisaron los 27 criterios propuestos: **16 superados y 11 no superados**, según Codex. Ese recuento mezcla contradicciones, omisiones y falta de respaldo; incluye una omisión menor sobre los decimales del índice. **No significa que la IA tenga una precisión jurídica del 59 %.** Siete criterios superados son guardas de los controles negativos, que no exigían resumir documentos correctamente descartados. La revisión humana sigue pendiente.

## Hallazgos que importan para el uso autónomo

1. **Texto insuficiente admitido.** Solo con el título del decreto murciano, el análisis supone un registro «exigido» y especula sobre derogación. Recomienda obtener el texto, pero su puntuación permite continuar como alerta. Necesita un estado explícito de insuficiencia que el flujo respete, sin depender de que el modelo baje la puntuación.
2. **Dos plazos distintos en una misma respuesta.** En el decreto completo de Murcia, la prosa habla de adaptación de seis meses, mientras `plazo_adaptacion` devuelve la cadena `"20"`. Esos veinte días corresponden a la regla de entrada en vigor. El prompt define mal el campo y el esquema no separa ambos conceptos.
3. **Generalizaciones y omisiones relevantes.** El análisis energético afirma «todos los anuncios ... sin excepción» sin delimitar las exclusiones del documento. El índice de alquileres se aplica en la respuesta a cualquier actualización sin comprobar el régimen temporal del contrato. En Murcia falta advertir que la declaración turística no sustituye las demás licencias exigibles. Son comprobaciones del texto histórico y del respaldo de la respuesta, no asesoramiento sobre la ley vigente hoy.
4. **Fechas sin origen claro.** RD 1312: el modelo llama publicación al 23-dic-2024, fecha de aprobación, frente al 24-dic del catálogo. IRAV: usa la firma del 18-dic como publicación, frente al 20-dic del catálogo. El título murciano devuelve 10-oct, frente al 19-oct. En otros casos acierta fechas absolutas que no están disponibles en la entrada, sin explicar su procedencia; un acierto así no acredita extracción fiable.
5. **Categoría y tipo de dato incorrectos, hallazgos adicionales.** El decreto autonómico de Murcia aparece como `Real Decreto`, tanto con texto completo como con título. Los plazos numéricos llegan como cadenas (`"10"`, `"1"`, `"14"`, `"20"`), y la validación actual los acepta. No se añadieron estos controles a los 27 después de ver los resultados para alterar su puntuación.

La persistencia actual usa `item.fecha_publicacion` cuando la fuente lo aporta, por delante del dato del modelo. Por tanto, **no se afirma que todas esas fechas de publicación erróneas se guardarían en producción**. Esa preferencia no corrige por sí sola los plazos, la categoría o la prosa del análisis. En BOE el flujo real también puede aportar metadatos opcionales que este ensayo no incluye; BORM no recibe ese encabezado de rango en el código actual.

## Evidencia y reproducción

- `run.json`: respuestas originales y tiempos; sin modificaciones respecto al artefacto descargado.
- `reviews-codex.json`: los 27 juicios, responsable, fecha, motivos y citas exactas de la salida. Los juicios son propuestas de IA, no aprobaciones humanas.
- `report.json`: métricas recalculadas offline, ligadas a las huellas del corpus y la ejecución. `referencesPending: 8` y `status: requires_review` permanecen.
- Referencias fijadas antes del ensayo en `eval/pilot/cases.json`; no se cambiaron al ver las respuestas.

```sh
npm run pilot -- --results eval/pilot/results/2026-09-30-baseline/run.json --reviews eval/pilot/results/2026-09-30-baseline/reviews-codex.json --out artifacts/pilot/replayed-baseline
```

El análisis de los ocho casos duró **98,2 segundos**, sin contar instalación/arranque del runner. Se completaron ocho clasificaciones y cinco análisis de impacto: trece llamadas lógicas; no se midieron reintentos internos, tokens facturados ni importe real. El job completo duró 2 min 7 s. No se repetirán llamadas para reproducir este informe: la reproducción es offline.

## Aislamiento comprobado

La [prueba sin autorización de pago](https://github.com/Orwell27/regtrack/actions/runs/36716365193) falló expresamente antes de checkout y de la IA; el job `pipeline` quedó omitido. En la ejecución autorizada también quedó omitido. El job del piloto solo recibió la clave de Anthropic, sin secretos de base de datos. No se consultó BORM, no se guardaron alertas ni se publicaron mensajes. La ejecución en GitHub no se utilizó para sortear el bloqueo de una fuente: trabajó exclusivamente con textos fijados en el repositorio.

## Siguiente cambio propuesto

Mantener la revisión editorial. Separar suficiencia documental de relevancia, aportar fechas y rango oficiales al análisis, distinguir entrada en vigor de adaptación, validar tipos y exigir respaldo de las acciones recomendadas. Después repetir estos casos para comprobar las correcciones, con nueva autorización de coste, y evaluar otros documentos reservados antes de concluir que generaliza. También faltan las pruebas de cobertura y de correlación con noticias.

No se han cambiado los prompts ni desplegado estas correcciones. PR18 continúa en borrador; el acceso automático BORM sigue bloqueado.

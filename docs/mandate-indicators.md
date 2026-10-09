# Indicadores del balance de mandato

Instantánea capturada el **7 de octubre de 2026**, entre las horas consignadas en cada fuente. Contiene **15 series oficiales y 179 observaciones desde 2023**, con ámbito nacional; el IPVA cubre territorio fiscal común, excluyendo País Vasco y Navarra. Se han consultado únicamente fuentes públicas del INE y Eurostat, sin credenciales, bases privadas ni servicios de IA.

Es un piloto descriptivo. La selección no constituye un índice de éxito gubernamental, una evaluación causal, una auditoría de promesas ni una comparación completa con otros países. El periodo político parte de noviembre de 2023. No debe presentarse como un balance desde junio de 2018.

## Inventario comprobado

Los valores se conservan en la unidad original. «Referencia» no significa fecha de publicación ni dato conocido en tiempo real en aquel momento: se usa la versión vigente de la serie descargada, que puede incorporar revisiones históricas.

| Indicador / código | Unidad | Referencia | Último periodo de esta captura |
| --- | --- | --- | --- |
| Ocupados · EPA387796 | miles de personas | 2023T3: 21.446,5 | 2026T2: 22.779,0 |
| Paro · EPA423474 | % población activa | 2023T3: 11,89 | 2026T2: 9,87 |
| Nivel IPC · IPC290751 | índice 2025=100 | octubre 2023: 95,998 | agosto 2026: 104,638 |
| Inflación IPC · IPC290750 | tasa interanual, % | octubre 2023: 3,5 | septiembre 2026: 4,9, **avance** |
| Renta neta media por persona · ECV3763 | euros corrientes por año | ingresos 2023: 14.807 | ingresos 2024: 15.620, ECV2025 |
| AROPE Europa 2030 · ECV6190 | % población | ECV2023: 26,5 | ECV2025: 25,7 |
| Riesgo de pobreza relativa · ECV5416 | % población | ECV2023: 20,2 | ECV2025: 19,5 |
| Carencia material y social severa · ECV6189 | % población | ECV2023: 9,0 | ECV2025: 8,1 |
| Gini · ECV7186 | escala 0–100 | ECV2023: 31,5 | ECV2025: 30,8 |
| Compra de vivienda · IPV1209 | índice 2025=100 | 2023T3: 83,529 | 2026T2: 111,095 |
| Alquiler residencial · IPVA4962 | índice 2015=100 | 2023: 118,727 | 2024: 122,920 |
| PIB real por habitante · sdg_08_10 | volumen encadenado 2020, euros/habitante | 2023: 27.130 | 2025: 28.260, **provisional** |
| Deuda PDE nominal · gov_10q_ggdebt / MIO_EUR | millones de euros | 2023T3: 1.578.812 | 2026T1: 1.739.501, **provisional** |
| Deuda PDE / PIB · gov_10q_ggdebt / PC_GDP | % PIB | 2023T3: 107,3 | 2026T1: 101,6, **provisional** |
| Saldo público B9 · gov_10dd_edpt1 | % PIB | 2023: −3,3 | 2025: −2,4 |

Las URLs completas y exactas de cada consulta, códigos, títulos, productor, momento de captura y SHA-256 están en `data/mandate/indicators.json` y `data/mandate/evidence/indicators/manifest.json`. No se fuerza que las series tengan el mismo cierre. «Último» significa último punto devuelto por esa consulta oficial, no el dato más reciente entre todas las fuentes posibles. En particular, el Banco de España puede publicar deuda antes de que Eurostat actualice la tabla armonizada.

## Periodos y comparabilidad

- Mensuales: referencia octubre de 2023; trimestrales: tercer trimestre de 2023, ambos periodos completos anteriores a la investidura. Las observaciones anteriores de 2023 se conservan para contexto.
- Anuales: referencia 2023, que mezcla meses anteriores y posteriores al inicio político. La aplicación debe mostrar ese límite; no convertirlo en una medida al 17 de noviembre.
- `date` es el primer día del periodo como coordenada del gráfico. No es una fecha de entrevista, publicación o disponibilidad. En INE se comprueba además que el timestamp original, interpretado en Europe/Madrid, coincide con `Anyo` y `FK_Periodo`.
- Renta: se resta un año al periodo ECV para mostrar el año económico de los ingresos; `sourcePeriod` conserva el año de encuesta. Así, ECV2025 es renta de 2024. Los otros indicadores ECV mantienen el año de la encuesta y explican el desfase de sus componentes. La [nota oficial ECV2025](https://www.ine.es/dyngs/Prensa/es/ECV2025.htm) confirma esta distinción.
- Empleo y paro EPA: población de 16 o más años, ambos sexos, sin desestacionalizar. Un número de ocupados y una tasa con población activa como denominador son medidas distintas. Las revisiones poblacionales pueden alterar los valores históricos.
- IPC: se conserva la serie completa en base 2025, no se empalman niveles de distintas bases. La tasa interanual no es el nivel de precios. El [avance de septiembre de 2026](https://ine.es/dyngs/Prensa/es/adIPC0926.html) se distingue del índice definitivo de agosto.
- Vivienda: el [IPV](https://www.ine.es/dyngs/Prensa/es/IPV2T26.htm) mide compra por hogares y el [IPVA](https://www.ine.es/dyngs/Prensa/IPVA2024.htm) arrendamientos de vivienda habitual mediante fuentes tributarias. IPVA es una estadística experimental, excluye territorios forales y no es un precio de oferta ni el índice legal de actualización de contratos. No se atribuyen estos promedios nacionales a municipios.
- Renta nominal y PIB real: no se presentan como unidades intercambiables ni se calcula un poder adquisitivo implícito. El [PIB por habitante de Eurostat](https://ec.europa.eu/eurostat/cache/metadata/en/sdg_08_10_esmsip2.htm) utiliza volumen encadenado 2020 y población media anual; no equivale a la renta mediana disponible.
- Deuda: saldo bruto consolidado PDE de todas las Administraciones Públicas S13. La [ratio trimestral](https://ec.europa.eu/eurostat/cache/metadata/en/gov_10q_ggdebt_esms.htm) divide el saldo al final del trimestre por el PIB nominal de los cuatro últimos trimestres. Puede bajar mientras crece el importe en euros. Ambas series usan idénticos periodos y la misma fuente.
- Saldo público: B9 SEC2010 de S13, déficit cuando es negativo. Es un flujo anual distinto de deuda acumulada y de ejecución de caja del Estado. La [tabla PDE anual](https://ec.europa.eu/eurostat/cache/metadata/en/gov_10dd_esms.htm) no debe confundirse con una serie mensual de IGAE que excluya corporaciones locales.

`direction` y `directionNote` describen el sentido estadístico de una variación y sus límites. Precios, renta nominal, vivienda, deuda y saldo no reciben una valoración automática única. Los temas agrupan contexto (`empleo`, `economia`, `bienestar`, `vivienda`); compartir tema con una promesa no acredita su cumplimiento ni una correlación estadística.

## Evidencia y reproducción

Los 15 archivos JSON de cada serie son **respuestas oficiales íntegras**, no valores transcritos a mano. El manifiesto guarda la huella SHA-256 del texto UTF-8 exacto, URL y fecha de descarga. El JSON público se deriva de ellos; no requiere consultar una base de datos o una API para servirse. Queda versionado junto a sus originales en Git.

```powershell
# Reconstrucción determinista local, sin conexión:
npx tsx scripts/import-mandate-indicators.ts

# Nueva captura pública, revisión manual y regeneración:
npx tsx scripts/import-mandate-indicators.ts --refresh

# Contratos y correspondencia con las capturas:
npx vitest run tests/mandate-indicators.test.ts
```

El refresco consulta exclusivamente URLs configuradas en el script, exige HTTPS, no acepta redirecciones, no usa secretos y valida código, nombre, escala, unidad, población, dimensiones y periodos antes de reemplazar los artefactos públicos. El nombre nacional no basta: también se fijan la serie del INE y las dimensiones exactas de Eurostat. No se mezclan unidades por conveniencia visual.

Primero descarga y valida todas las fuentes en memoria. Si existe una captura anterior coherente, la archiva en `.artifacts/mandate-indicators/<huella-del-manifiesto>/`. Cada sustitución de archivo usa un temporal y rename; `indicators.json` se sustituye al final. **La sustitución del conjunto de archivos no es una transacción global**: una interrupción durante esa fase puede dejar originales/manifiesto desalineados, lo que hace fallar la reproducción por hash. El JSON público anterior sigue sirviéndose hasta su reemplazo. Antes de publicar, ejecutar la prueba de reproducción y revisar el diff; recuperar la captura archivada o repetir el refresco si hubo interrupción. No hay cron remoto, publicación automática ni promesa de actualización continua.

Los errores HTTP, cambios de contrato, pérdida de referencia, duplicados o huecos temporales abortan la importación. Un valor explícitamente ausente o confidencial se conserva como `null`; nunca se convierte en cero ni se interpola. En JSON-stat una celda no presente equivale a ausencia. Las previsiones `f` de Eurostat se rechazan porque este panel requiere observaciones medidas. Otras banderas se conservan, incluida `p` provisional.

La equivalencia INE `FK_TipoDato=1` → definitivo y `3` → avance se comprobó contra los mismos periodos y valores en la [respuesta oficial ampliada `tip=A`](https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/IPC290750?tip=A&nult=2). Se conserva en `ine-status-reference.json` con su fuente y huella en `ine-status-reference.source.json`; el test cruza la respuesta compacta con las etiquetas de la ampliada. Un código no verificado conserva la etiqueta `INE tipo N`, sin atribuirle certeza. «Definitivo» es la etiqueta del organismo, no una garantía de que jamás se revisará una serie histórica.

Las ventanas de consulta del INE son explícitas (60 meses, 20 trimestres, 10 años) y la importación exige conservar la referencia 2023. Si esa ventana dejara de incluirla en el futuro, abortará en vez de cambiar silenciosamente la base. Las pruebas fijan además puntos de control de esta captura: una actualización legítima requiere revisar los cambios y actualizar esos controles deliberadamente.

## Control de calidad realizado

Se aplicó el flujo `data-analytics:analyze-data-quality`: grano de una observación por indicador, territorio y periodo; unicidad temporal; tipos, nulos y confidencialidad; fechas y desfases; denominadores y unidades; revisiones; trazabilidad del original a la proyección. No se creó un notebook porque el entregable pedido es una base JSON con importador y pruebas ejecutables, que constituyen aquí la evidencia reproducible.

Las 13 pruebas automatizadas verifican reproducción completa, integridad, manipulación de contenido y tiempo, origen permitido, traversal, unidades/escalas/población, dimensiones Eurostat, referencias y orden, renta del año correcto, estados oficiales, deuda emparejada, nulos/confidencialidad, huecos y previsiones. No son una auditoría de los microdatos de los institutos ni una estimación de incertidumbre estadística. No se han estimado intervalos de confianza ni causalidad, y no hay cifras sintéticas en las series.

Pendiente de ampliación editorial: series desde 2018 con su propia referencia, comparaciones UE equivalentes, desagregaciones territoriales, salarios y calidad del empleo, sanidad, dependencia, educación y esfuerzo de vivienda. No se fabrican puntos para cubrir esos huecos. Cada incorporación exige fuente, definición, periodo, ámbito, unidad, revisión y contrato verificable propios.

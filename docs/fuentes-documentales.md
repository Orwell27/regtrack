# Catálogo documental y piloto de datos trazables

Revisión de documentación pública: **7 de octubre de 2026**. Catálogo tipado: `lib/observatorio/catalog.ts`.

Este catálogo identifica fuentes, derechos revisados y posibilidades de integración. No demuestra que se haya realizado una extracción ni activa tareas periódicas. El estado **piloto** selecciona BOE e INE para importaciones manuales con capturas versionadas. **Candidato** requiere seleccionar y verificar un conjunto. **Referencia** permite estudiar el método y consultar los enlaces documentales sin declarar una ingesta.

## Piloto implementado y reproducible

La biblioteca `/observatorio/biblioteca` y su API `/api/observatorio/biblioteca` consumen `data/observatorio/library.json`, una proyección pública validada al construir/arrancar la aplicación. El observatorio usa las normas conservadas para sus búsquedas y para admitir noticias con citas exactas; conserva su fecha histórica y no las presenta como publicaciones recientes. Los indicadores se consultan en la biblioteca, sin hacerse pasar por noticias ni mediciones municipales.

Primera extracción real, 7 de octubre de 2026:

- BOE-A-2021-16233 y BOE-A-2023-12203: texto de la publicación original. No son una captura de legislación consolidada; cambios posteriores y vigencia pendientes.
- INE, tabla 59004: series IPVA4962 (España) e IPVA4920 (Región de Murcia), cinco observaciones anuales por serie, 2020–2024. Índice de precios de la vivienda en alquiler, base 2015 = 100. La fecha de descarga no se usa como fecha de publicación.
- Dos relaciones editoriales de contexto entre la ley de vivienda y los índices de alquiler. No afirman causalidad, correlación calculada ni aplicabilidad a una persona.

Ejecutar desde la raíz del proyecto:

```sh
npm run library:ingest
```

El comando tiene una lista fija de cuatro recursos públicos, límite de tamaño y espera, y no acepta rutas/URLs externas. No carga credenciales ni escribe en Supabase. Cada recurso se valida antes de publicarlo; si falla uno, permanece intacta la proyección pública anterior. Las capturas terminadas antes del fallo se conservan y son reutilizadas al reintentar. Un único escritor por archivo local.

Se reutiliza exactamente `lib/knowledge/vault.ts` del commit `b251c2b` de PR18. La estructura canónica v1 no cambia. Las respuestas XML/JSON y los textos/series normalizados se conservan en `.artifacts/observatorio-vault/.records`; Markdown es una vista regenerable. La captura JSON cruda del INE usa la categoría interna `cambio_web`: significa captura de una respuesta, no que se haya detectado un cambio. La serie normalizada usa `reporte`. No se manipulan las capturas privadas de PR18.

El manifiesto local `publication-manifest.json` autoriza identificador, versión y huella exactos, junto con clasificación, ámbito, licencia y motivo. La vista pública incluye únicamente esos registros; una relación hacia un registro privado, una huella distinta o un dato estadístico alterado impiden exportar. Las clasificaciones son editoriales y la vigencia continúa sin verificar. `validatePublicLibrary` reconstruye y verifica las capturas públicas desde el JSON, incluso sin el archivo local.

El archivo local está excluido de Git: guardar una copia de toda `.artifacts/observatorio-vault` para conservar también respuestas originales y capturas anteriores. La proyección pública sí se versiona en Git y es recuperable tras un reinicio o fallo de una fuente. Repetir una descarga sin cambios conserva la versión y fecha de captura anteriores; `generatedAt` indica cuándo se completó la exportación, no una nueva publicación de la fuente. El historial completo de capturas queda en el archivo; la biblioteca muestra la selección publicada.

La CI verifica pruebas, compilación, navegación y trazas de empaquetado: el archivo privado y los secretos locales no deben formar parte del despliegue. La tabla `regtrack_memory_records` de PR18 no se recrea ni se publica; llevar este piloto a captura periódica compartida exige reconciliar ese despliegue y preparar autorizaciones públicas separadas, control de fallos, cobertura y respaldo. Este piloto no es todavía una ingesta histórica nacional ni una sincronización automática.

## Evidencia y decisión por fuente

| Fuente | Evidencia oficial consultada | Decisión operativa |
| --- | --- | --- |
| BOE | [API](https://www.boe.es/datosabiertos/api/api.php), [condiciones desde 28/06/2024](https://www.boe.es/informacion/aviso_legal/index.php) | Piloto limitado a documentos regulatorios. Las condiciones admiten reutilización comercial y exigen atribuir, preservar metadatos y distinguir modificaciones propias. El consolidado se presenta como informativo. |
| INE | [Datos abiertos](https://www.ine.es/datosabiertos/), [licencia general](https://www.ine.es/aviso_legal/) | Piloto de indicadores seleccionados; CC BY 4.0 salvo indicación contraria. Registrar la tabla, metodología, unidad y periodo observados. |
| PORDATA | [Portal](https://www.pordata.pt/portugal), [Europa](https://www.pordata.pt/en/europe) | Referencia de navegación y explicación. Exportación visible; API pública y derechos de redistribución no verificados. No se pudo recuperar la página de condiciones. |
| Our World in Data | [API](https://docs.owid.io/projects/etl/api/), [catálogo versionado](https://docs.owid.io/projects/etl/libraries/catalog/api/), [condiciones](https://ourworldindata.org/faqs) | Candidato por conjunto. Comprobar la licencia del proveedor original y atribuirlo. La restricción del software Grapher actual no debe confundirse con la licencia de los datos o artículos. |
| OCDE | [API SDMX](https://www.oecd.org/en/data/insights/data-explainers/2024/09/api.html), [términos, apartado 3](https://www.oecd.org/en/about/terms-conditions.html), [marco de bienestar](https://www.oecd.org/en/data/tools/well-being-data-monitor.html) | Candidato a conector. Datos reutilizables incluso comercialmente salvo condiciones particulares o derechos de terceros. Revisar cada dataflow; el registro para avisos técnicos es voluntario. |
| Ivie / Fundación BBVA | [Base de capital y método](https://www.ivie.es/es_ES/bases-de-datos/capitalizacion-y-crecimiento/el-stock-y-los-servicios-de-capital/), [aviso Ivie](https://www.ivie.es/es_ES/aviso-legal/), [aviso FBBVA](https://www.fbbva.es/aviso-legal-datos-personales-cookies/) | Referencia; integración pendiente de permiso o licencia específica que autorice el uso previsto. No inferir redistribución a partir de una descarga accesible. |
| ESS | [Portal](https://www.europeansocialsurvey.org/data-portal), [condiciones](https://www.europeansocialsurvey.org/contact/disclaimer), [España](https://www.europeansocialsurvey.org/about/country-information/spain/spanish) | Referencia; datos CC BY-NC-SA 4.0, documentación CC BY-SA 4.0. Uso comercial pendiente de permiso. ESS recomienda enlazar el portal. Registro actual no comprobado. |
| Elcano | [Metodología](https://www.realinstitutoelcano.org/documento-de-trabajo/indice-elcano-de-presencia-global-metodologia/), [condiciones](https://www.realinstitutoelcano.org/en/descargo-de-responsabilidad/) | Referencia documental y metodológica; no activar integración sin permiso o condiciones específicas. Hay insumos no abiertos. API y licencia del archivo actual no verificadas. |
| EuroVoc | [Portal oficial](https://op.europa.eu/en/web/eu-vocabularies), [ficha del catálogo](https://data.europa.eu/data/datasets/eurovoc?locale=en), [descripción oficial de EU Vocabularies](https://interoperable-europe.ec.europa.eu/collection/semic-support-centre/solution/eu-vocabularies-reference-data-catalogue) | Candidato a vocabulario. El portal anuncia 4.24; paquete, licencia y conceptos todavía pendientes de verificar. El catálogo exige comprobar la licencia individual del recurso. |

Una licencia pendiente no significa que se haya solicitado un permiso ni que el proveedor lo haya rechazado. `checkedAt` registra la revisión de la documentación disponible, también cuando queda una incertidumbre, y no una autorización del proveedor. Ningún referente está declarado como conector activo.

## Contrato operativo de cada conjunto

La ficha pública anterior resume decisiones. La base operativa debe mantener por separado:

- **Identidad y procedencia:** institución, conjunto, identificador original, enlace documental, URL de distribución y cadena de proveedores si es un agregador.
- **Acceso:** API o descarga, formatos, autenticación, límites de uso y tamaño previsto de cada solicitud.
- **Derechos:** licencia y versión, enlace y evidencia revisada, uso comercial, redistribución, atribución y restricciones. La descarga gratuita y la reutilización autorizada son propiedades diferentes.
- **Cobertura:** territorios identificados, escala, población de referencia, variables y periodos disponibles. No heredar la cobertura de la institución a todas sus tablas.
- **Tiempo:** periodo medido, fecha de publicación, revisión de la fuente, recuperación y frecuencia específica del conjunto. Una captura nueva puede contener observaciones antiguas.
- **Versión:** identificador oficial cuando exista, huella de contenido, copia original, transformaciones y versión del proceso. La versión de una estructura SDMX no identifica por sí sola una revisión de valores.
- **Calidad:** unidades, valores ausentes, notas metodológicas, cambios de definición, cobertura de dimensiones y limitaciones de comparación.
- **Operación:** estado de integración, última importación efectivamente completada, error de la última ejecución y próxima revisión. Estos campos no se deducen de los estados del catálogo.

Conservar las capturas originales permitidas y las transformaciones por separado. Una relación entre una norma y un indicador necesita tipo y motivo: cita expresa, desarrollo normativo o contexto estadístico. Un indicador contextual no demuestra causalidad, elegibilidad individual ni efecto de una medida.

## Piloto de vivienda y ayudas

1. **Norma:** [BOE-A-2021-16233, Real Decreto 853/2021](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2021-16233), sobre programas de rehabilitación y vivienda social. Seleccionar publicación original y una versión del [consolidado](https://www.boe.es/buscar/act.php?id=BOE-A-2021-16233), conservar sus identificadores y verificar sus relaciones modificativas. Su inclusión histórica no acredita una convocatoria abierta.
2. **Contexto de renta:** [INE ADRH, tabla 30824](https://datos.gob.es/es/catalogo/ea0042823-indicadores-de-renta-media-y-mediana-adrh-identificador-api-30824). El catálogo oficial documenta CSV, XLSX y JSON. Antes de importar, elegir un subconjunto y comprobar las dimensiones de esa tabla. No suponer que una tabla concreta cubre todos los municipios porque la operación general los cubra.
3. **Contexto de alquiler, ampliación posterior:** [INE IPVA, tabla 59004](https://datos.gob.es/es/catalogo/ea0042823-indices-nacionales-y-por-comunidades-autonomas-general-y-por-antiguedad-de-contrato-ipva-identificador-api-59004). Tiene escala nacional/autonómica; sus valores no se convierten en mediciones municipales.
4. **Ficha de evidencia:** documento o serie original, fecha, territorio, versión, unidad, licencia, explicación propia y vínculo contextual explícito. Mostrar por separado información jurídica, observación estadística y análisis.
5. **Comprobación de la importación:** verificar identidad, esquema, tipos, unidades, dimensiones, ausencia de duplicados y reproducción desde la captura guardada. Una segunda importación idéntica no debe duplicar registros; una revisión debe conservar el estado anterior.

El catálogo de la tabla 30824 documenta este acceso JSON: `https://servicios.ine.es/wstempus/js/es/DATOS_TABLA/30824?tip=AM`. Identificar el endpoint no equivale a haber ejecutado o validado una descarga. Las importaciones realizadas, si las hay, se documentan en sus manifiestos y no se presuponen en esta propuesta.

## Incorporación de EuroVoc

Elegir una distribución oficial, comprobar su licencia y recuperar las notas de publicación antes de importarla. Registrar versión, URL y huella de archivo. Guardar los URI oficiales con sus etiquetas españolas, etiquetas alternativas y relaciones semánticas; no inventar URI a partir de nombres de temas.

Las correspondencias con la taxonomía local deben tener su propia versión, un tipo de relación —exacta, cercana o más amplia— y revisión explícita. Conservar tanto las correspondencias como los vocabularios anteriores permite reproducir una clasificación histórica. El anuncio de la versión 4.24 no acredita que esa distribución se haya obtenido o validado en RegTrack.

## Secuencia de incorporación

Primero, completar y comprobar las capturas seleccionadas de BOE e INE. Después, evaluar un dataflow OCDE con cobertura y condiciones claras. OWID puede aportar indicadores adicionales cuando su licencia original y transformación queden documentadas. PORDATA, Ivie, ESS y Elcano aportan criterios de organización, metodología y referencias; sus datos no se incorporan automáticamente por aparecer en este catálogo.

La revisión documental no ha creado cuentas, solicitado permisos, contratado servicios ni programado actualizaciones.

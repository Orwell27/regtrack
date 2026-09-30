# Memoria e integraciones de RegTrack

Las siete referencias aceptadas tienen una función implementada. Esta capa se ejecuta con el worker/CLI, sin nuevas rutas públicas ni escrituras en producción. **Integrar un cliente no equivale a desplegar su servidor.** `knowledge status` distingue configuración de funcionamiento; `probe` comprueba el contrato MCP sin consumir modelos.

| Proyecto | Integración | Qué falta para uso continuo |
|---|---|---|
| [Normativa Educativa Canaria](https://github.com/ateeducacion/normativa_educativa_canaria) | Estructura adaptada: normativa, contexto, análisis, índices y decisiones; fuentes y vigencia pendiente | Seleccionar disco persistente y respaldo del worker |
| [Basic Memory](https://github.com/basicmachines-co/basic-memory) | Escritura MCP en proyecto dedicado y búsqueda de notas | Mantener su configuración e índice local |
| [OpenAleph](https://github.com/openaleph/openaleph) | Exportación FtM, bulk API 2, búsqueda por colección y estado de procesamiento | Servidor, colección privada y clave |
| [FollowTheMoney](https://github.com/opensanctions/followthemoney) | Document NDJSON y validador Python oficial para documentos, empresas, personas y relaciones | La extracción/resolución automática de empresas aún no está implementada |
| [Graphiti](https://github.com/getzep/graphiti) | Episodios JSON con fecha/procedencia, UUID estable, consulta de episodios y búsqueda de relaciones | Servidor con base de grafo, modelos y autorización de consumo |
| [MCP-BOE](https://github.com/ComputingVictor/MCP-BOE) | Consulta de norma consolidada y comparación por fechas | Validar cada resultado contra el BOE antes de utilizarlo como obligación |
| [changedetection.io](https://github.com/dgtlmoon/changedetection.io) | Lista de monitores e importación reanudable de instantáneas a memoria | Servidor, clave y páginas seleccionadas en su interfaz |

Versiones consultadas y licencias: [sources.lock.json](sources.lock.json). Las versiones de las bibliotecas Python están fijadas; el fichero de fuentes fija además las revisiones estudiadas de los servidores, no su despliegue. Basic Memory (AGPL-3.0) se usa como proceso separado; no se copia su implementación al proyecto. Graphiti declara Apache-2.0 en la revisión consultada.

## Arranque local

Requisitos: Node del proyecto, `npm ci`, Python 3.12 y `uv`. Ejecutar desde la raíz de este checkout. No requiere Docker para la memoria, Basic Memory ni MCP-BOE. El validador FtM requiere además ICU: en este Windows no está disponible; se verifica en el job Linux de CI con `libicu-dev` y `pkg-config`.

```powershell
Copy-Item integrations/config.example.json integrations/config.local.json
uvx --python 3.12 --prerelease=allow --from basic-memory==0.23.2 python -c "import basic_memory"
uvx --python 3.12 --with mcp==1.30.0 --from https://github.com/ComputingVictor/MCP-BOE/archive/6b0bf48e4ca064dd9e84a0a4fe5112cc948be745.zip python -c "import mcp_boe"
$env:BASIC_MEMORY_CONFIG_DIR = Join-Path (Get-Location) '.knowledge/basic-memory-config'
$env:BASIC_MEMORY_HOME = Join-Path (Get-Location) '.knowledge/basic-memory-home'
uvx --offline --python 3.12 --prerelease=allow --from basic-memory==0.23.2 basic-memory project add regtrack .knowledge/basic-memory-index --local
npm run knowledge -- init
npm run knowledge -- status --config integrations/config.local.json
npm run knowledge -- probe mcp-boe --config integrations/config.local.json
```

No repetir `project add` si ya existe. Los ejemplos MCP usan `--offline` tras preparar las dependencias: evita resolver código cambiante al iniciar cada proceso. MCP-BOE sin el override `mcp==1.30.0` falla actualmente al arrancar con MCP 2 (`Server.list_tools` ausente). Basic Memory 0.23.2 exige una dependencia preliminar y por eso su preparación usa `--prerelease=allow`.

## Guardar, consultar y recuperar

```powershell
npm run knowledge -- ingest --file integrations/examples/noticia.json
npm run knowledge -- ingest-report --file artifacts/scan-report.json
npm run knowledge -- search --query vivienda
npm run knowledge -- search --query vivienda --as-of 2026-09-30T23:59:59Z
npm run knowledge -- history ID_DE_MEMORIA
npm run knowledge -- weekly --from 2026-09-28 --to 2026-10-04
npm run knowledge -- export-ftm --file artifacts/regtrack.ftm.jsonl
npm run knowledge:validate-ftm -- artifacts/regtrack.ftm.jsonl
npm run knowledge -- sync basic-memory --config integrations/config.local.json --limit 20
npm run knowledge -- search-basic --query vivienda --config integrations/config.local.json
npm run knowledge -- boe BOE-A-1994-26003 --config integrations/config.local.json
npm run knowledge -- boe BOE-A-1994-26003 --from 2020-01-01 --to 2026-09-30 --save --config integrations/config.local.json
```

El ejemplo es ficticio y está rotulado así. Las consultas guardadas de MCP-BOE son análisis derivados, no copias certificadas del documento. BORME es el registro mercantil: **no soluciona el CAPTCHA del BORM de Murcia**.

`REGTRACK_KNOWLEDGE_DIR` activa el guardado del escáner en esa ruta: sumarios recogidos (incluidos documentos ya existentes), texto descargado y reporte final con decisiones/errores. Si falla la memoria, la ejecución lo refleja como error. Sin esa variable conserva el comportamiento previo. Usar la misma ruta en el CLI (`vault` de config o `--vault`) y el escáner. No se ha activado en los cron de producción.

El JSON de `.records` es canónico; el Markdown es su vista. Cada observación conserva su versión y SHA256; un reintento idéntico no duplica. `search` devuelve la última observación conocida por documento. Un sumario observado después de un texto completo puede ser el último: consultar el historial con `KnowledgeVault.list()` cuando se necesite el texto anterior. Nunca reemplazar evidencia completa por un resumen al analizar obligaciones. Las fechas de los filtros CLI son UTC; la fecha oficial de publicación se guarda aparte.

Un único escritor por vault. Copiar el directorio completo, incluidos `.records` y `.receipts`, a un respaldo persistente y comprobar restauración con `list`/`search`. Una carpeta efímera de Vercel o un artefacto de Actions que caduca no constituye memoria permanente. `.knowledge/` está excluida de Git; el código no sincroniza documentos a GitHub ni garantiza su respaldo por sí solo.

## Servicios externos

Combinar las entradas necesarias de [services.example.json](services.example.json) con la configuración local, reemplazando direcciones y colección. Claves exclusivamente mediante variables de entorno. Mantenerlos privados; solo se permite HTTP en localhost y HTTPS en remoto. No se inicia ni publica ningún servidor con estos comandos.

```powershell
npm run knowledge -- sync openaleph --config integrations/config.local.json --limit 20
npm run knowledge -- aleph-status --config integrations/config.local.json
npm run knowledge -- search-aleph --query vivienda --config integrations/config.local.json
npm run knowledge -- watches --config integrations/config.local.json
npm run knowledge -- pull-watch WATCH_ID --config integrations/config.local.json --limit 20
# Estos comandos Graphiti pueden consumir modelos/embeddings de pago:
npm run knowledge -- sync graphiti --allow-model-calls --config integrations/config.local.json --limit 1
npm run knowledge -- search-graphiti --query vivienda --allow-model-calls --config integrations/config.local.json
npm run knowledge -- graphiti-episodes --config integrations/config.local.json
```

OpenAleph `accepted` acredita recepción, no indexación. Graphiti `queued` acredita entrada en cola, no extracción terminada; comprobar UUID con `graphiti-episodes` y registros del servidor. Se conservan acuses por destino/versión y un candado por destino para impedir sincronizaciones simultáneas. Si un proceso termina abruptamente, comprobar que el PID registrado ya no trabaja antes de retirar ese `.lock` concreto. Tras un fallo sin acuse, repetir el mismo comando; los IDs son estables. Una cola remota perdida requiere revisión del servidor antes de retirar el acuse local concreto y reintentar. No hay borrado remoto automático.

Graphiti excluye reportes y análisis propios para no fabricar corroboración. Su fecha de referencia es la observación; no se inventa la fecha efectiva de un hecho. Las relaciones extraídas siguen siendo propuestas y no modifican alertas ni vigencia. changedetection importa el texto que el monitor conservó; una instantánea puede incluir solo una selección de la página y siempre se marca `extracto`. Un monitor con error no se trata como una fuente sin novedades.

## BOE-XSUM aplicado

El [estudio BOE-XSUM](https://arxiv.org/html/2509.24908v1) orienta la futura presentación de resúmenes claros. Sus 3.648 pares periodísticos y BERTScore no miden exactitud jurídica ni cobertura inmobiliaria. En esta integración el resumen no sustituye la fuente: se conservan procedencia, contenido, versión y condición de revisión. La evaluación de resúmenes y el entrenamiento de modelos quedan fuera de esta entrega; no se han importado sus ejemplos al piloto previo.

## Verificación

`npm test`, `npx tsc --noEmit` y `npm run build`. Las pruebas de adaptadores cubren contratos, errores, autenticación, límites y acuses con transportes simulados; no prueban un despliegue remoto. Las comprobaciones reales ejecutadas se registran en [VALIDATION.md](VALIDATION.md).

# Comprobaciones de integración — 30-sep-2026

Este registro distingue pruebas de código, conexiones reales y servicios aún pendientes. No constituye validación de exactitud jurídica ni de correlaciones causales.

## Ejecutado localmente

- **250 tests en 29 archivos** en la primera pasada completa; posteriormente se añade una regresión para el envoltorio de errores FastMCP. Memoria/versiones/consulta temporal, corrupción, reintentos y límites, errores de conectores y flujo de escaneo. Sin BD ni modelos reales.
- TypeScript correcto. ESLint de los nuevos módulos/CLI/pruebas correcto.
- Basic Memory **0.23.2** instalado mediante `uvx`, configuración y proyecto exclusivos dentro de `.knowledge`. MCP real: descubrimiento de herramientas, escritura de **7 documentos históricos** del piloto y búsqueda posterior a reinicio. Las huellas de los textos se cotejaron con el corpus original; la variante artificial de solo título se excluyó. Para el documento cuya recuperación tenía precisión de día se registra la hora de importación local, sin inventar la de descarga. Apareció un aviso `CancelledError` al cerrar una conexión SQLite del proceso; la lectura posterior comprobó persistencia y no debe ocultarse como un cierre limpio.
- MCP-BOE: **31 herramientas** descubiertas; consulta real de `BOE-A-1994-26003` con metadatos, análisis y texto, tres respuestas HTTP 200 del BOE. Sin consumo de IA.
- Exportador FtM genera NDJSON. El validador Python oficial **no arrancó en Windows** por falta de ICU; se añade un job Linux con biblioteca real, controles positivos y negativos. Resultado CI pendiente en esta versión del registro.
- Build de producción correcto tras permitir descargar Google Fonts. El primer intento dentro del sandbox falló por esa descarga; no fue un fallo de TypeScript.

## Integraciones con contrato probado, sin servidor conectado

- **OpenAleph**: bulk API 2, credencial y colección, búsqueda acotada y respuesta aceptada. Transporte simulado.
- **Graphiti**: protección de consumo, episodio JSON, fecha/UUID/procedencia, exclusión de reportes y acuse en cola. Transporte simulado; sin modelos ni base de grafo.
- **changedetection.io**: historial de instantáneas, contenido, autenticación y rechazo de monitores con error. Transporte simulado; no se añadieron monitores reales.

## Alcance que sigue pendiente

Servidores de OpenAleph/Graphiti/changedetection, credenciales y colección, disco persistente/respaldo del worker y activación del cron. No se desplegó, mergeó ni modificó producción. Los siete documentos del piloto son evidencia histórica pendiente de revisión, no una muestra nueva. No se repitió el ensayo de IA de pago ni se entrenó BOE-XSUM. La primera UI para explorar esta memoria y la extracción/resolución automática de empresas no forman parte de esta capa de conectores.

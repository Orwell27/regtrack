# Comprobaciones de integración — 30-sep-2026

Este registro distingue pruebas de código, conexiones reales y servicios aún pendientes. No constituye validación de exactitud jurídica ni de correlaciones causales.

## Ejecutado localmente

- **252 tests en 29 archivos** en CI. Primera pasada local completa: 250; dos regresiones adicionales (errores envueltos de FastMCP y sincronización concurrente) verificadas con 25 pruebas de integraciones antes de subir. Memoria/versiones/consulta temporal, corrupción, reintentos y límites, errores de conectores y flujo de escaneo. Sin BD ni modelos reales.
- TypeScript correcto. ESLint de los nuevos módulos/CLI/pruebas correcto.
- Basic Memory **0.23.2** instalado mediante `uvx`, configuración y proyecto exclusivos dentro de `.knowledge`. MCP real: descubrimiento de herramientas, escritura de **7 documentos históricos** del piloto y búsqueda posterior a reinicio. Las huellas de los textos se cotejaron con el corpus original; la variante artificial de solo título se excluyó. Para el documento cuya recuperación tenía precisión de día se registra la hora de importación local, sin inventar la de descarga. Apareció un aviso `CancelledError` al cerrar una conexión SQLite del proceso; la lectura posterior comprobó persistencia y no debe ocultarse como un cierre limpio.
- MCP-BOE: **31 herramientas** descubiertas; consulta real de `BOE-A-1994-26003` con metadatos, análisis y texto, tres respuestas HTTP 200 del BOE. Sin consumo de IA.
- Exportador FtM genera NDJSON. El validador Python oficial **no arrancó en Windows** por falta de ICU. **Verificado en Linux con FollowTheMoney 4.11.0**: documento exportado válido, Company/Person/Ownership válidos y cuatro entradas incorrectas rechazadas. [CI 36740595543](https://github.com/Orwell27/regtrack/actions/runs/36740595543), commit de implementación `d045b7c`, ambos jobs correctos. Preview Vercel correcto; no es producción.
- Build de producción correcto tras permitir descargar Google Fonts. El primer intento dentro del sandbox falló por esa descarga; no fue un fallo de TypeScript.

## Integraciones con contrato probado, sin servidor conectado

- **OpenAleph**: bulk API 2, credencial y colección, búsqueda acotada y respuesta aceptada. Transporte simulado.
- **Graphiti**: protección de consumo, episodio JSON, fecha/UUID/procedencia, exclusión de reportes y acuse en cola. Transporte simulado; sin modelos ni base de grafo.

## Conexión real añadida en la continuación

- **changedetection.io 0.60.8**, Python 3.12, ejecutado en Windows sin Docker. Prueba reproducible `npm run knowledge:check-changedetection`, con servidor real y página ficticia en loopback. Segunda ejecución completa: `artifacts/changedetection-smoke/run-5abIih/result.json`, estado `passed`; los artefactos quedan ignorados en Git y no forman parte del corpus real.
- Se verificaron seis condiciones: API sin clave devuelve 403; monitor sin capturas no acredita vigilancia; primera captura importada; cambio recuperable con consulta temporal e importación idempotente; persistencia tras reiniciar; fuente HTTP 503 rechazada sin añadir datos ni declarar «sin novedades». Los procesos creados por la prueba se detuvieron al terminar.
- Se extrajo `pullWatch` para que CLI y prueba utilicen exactamente el mismo importador. Se corrigió el caso de historial vacío, que antes podía devolver cero registros sin indicar que aún no existía ninguna captura.
- Nueva comprobación `knowledge check-services`: lectura de API/colección/episodios; distingue ausencia de configuración, falta de clave, error y accesibilidad. No llama a extracción ni embeddings. Con la configuración de ejemplo devuelve los tres servicios `not_configured`; no existe configuración permanente local.
- **257 tests en 30 archivos**, TypeScript y ESLint de los módulos afectados correctos localmente. Nuevo job `changedetection` para repetir el recorrido real en Linux; solo adjunta el resultado sin credenciales. El arranque permanente de OpenAleph/Graphiti no se ha probado: [preparación y fuentes](SERVICE-STARTUP.md).
- [CI 36752129585](https://github.com/Orwell27/regtrack/actions/runs/36752129585), implementación `ec4986e`: pruebas y smoke real Linux correctos; preview Vercel correcto. La regresión del historial vacío falla al retirar su protección (la promesa devuelve `timestamps: []`) y pasa al restaurarla; código original restaurado sin diferencias.

## Alcance que sigue pendiente

Alojamiento de OpenAleph/Graphiti y de un monitor permanente changedetection, credenciales y colección, disco persistente/respaldo del worker y activación del cron. Este equipo no tiene Docker/WSL y no se ha indicado un servidor alternativo. No se desplegó, mergeó ni modificó producción. Los siete documentos del piloto son evidencia histórica pendiente de revisión, no una muestra nueva. No se repitió el ensayo de IA de pago ni se entrenó BOE-XSUM. La primera UI para explorar esta memoria y la extracción/resolución automática de empresas no forman parte de esta capa de conectores.

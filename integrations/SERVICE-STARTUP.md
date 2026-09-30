# Conexión de servicios — preparación local

Estado al 30-09-2026: changedetection probado en Windows/Linux; OpenAleph probado localmente para importación privada, búsqueda exacta/variantes ficticias y persistencia tras reinicio; Graphiti conectado por MCP con lectura de episodios. WSL 3.0.1, Ubuntu 24.04 y Docker están instalados con autorización. Servicios detenidos al terminar; no hay vigilancia continua ni extracción con modelos activada.

## 1. Repetir la prueba real de cambios

```powershell
uvx --python 3.12 --prerelease=allow --from changedetection.io==0.60.8 python -c "import changedetectionio"
npm run knowledge:check-changedetection
```

Si `uvx` no está en PATH, definir `REGTRACK_UVX` con la ruta de su ejecutable. La preparación descarga dependencias; la ejecución usa el entorno Python en caché con `--offline`. La versión del paquete está fijada, pero esto no es un lock completo de sus dependencias transitivas.

La prueba arranca una página ficticia y el servidor en puertos libres de `127.0.0.1`, sin cargar `.env`, y ejecuta:

1. Rechazo de peticiones sin clave y de un monitor aún sin capturas.
2. Primera captura → importación mediante el mismo código que `knowledge pull-watch`.
3. Cambio de «veinte» a «treinta días» → segunda captura, búsqueda y consulta temporal.
4. Reintento sin duplicados y conservación tras reiniciar el servidor.
5. Fuente HTTP 503 → error explícito, sin crear una falsa ausencia de noticias.

Los procesos propios terminan al acabar. No queda un monitor continuo activo. `artifacts/changedetection-smoke/run-*/result.json` conserva el resultado sin claves; `vault` conserva los dos extractos ficticios. El datastore contiene una clave generada: no publicarlo ni copiarlo a la memoria real. La excepción `ALLOW_IANA_RESTRICTED_ADDRESSES` existe solo en este proceso desechable para acceder a su página local; no trasladarla a un servidor permanente.

La prueba también se ejecuta en el job `changedetection` de CI. Solo se adjunta `result.json`, nunca el datastore ni los registros del servicio.

## 2. OpenAleph y Graphiti en WSL

La fuente de instalación y operación es [local/README.md](local/README.md). Incluye verificación del instalador Microsoft, Docker oficial, Compose generado, imágenes por digest, secretos fuera de Git y puente temporal de loopback. Los contenedores están en una red interna sin salida a Internet. No repetir la instalación en una máquina ya preparada.

### OpenAleph

Referencia estudiada: [stack oficial](https://github.com/openaleph/openaleph/blob/98debd3733897104f54ae3aeec8d9145c900467f/docker-compose.example.yml). Las imágenes ejecutadas se fijan separadamente en [images.lock.json](local/images.lock.json); la API instalada informa 5.3.3-rc3.

Se probaron PostgreSQL, Elasticsearch, Redis, API con un proceso Gunicorn y worker. Usuario propio sin privilegios de administrador, colección privada creada por API, prueba ficticia en vault independiente. El ID real se obtiene de la respuesta, no se presupone. La UI y los workers de OCR/archivos quedan fuera de esta comprobación.

Con el servicio y su puente preparados, ejecutar `npm run knowledge:check-openaleph`. Después de detener y arrancar el stack completo, restablecer el puente y ejecutar `npm run knowledge:check-openaleph -- --verify-saved`: comprueba el mismo ID y SHA256 sin reimportar, y que solo hay un resultado. Ambos recorridos se ejecutaron realmente. Resultados locales sin claves en `artifacts/local-services`.

La recuperación inicial de primarios se limita a una simultánea para evitar cargar varios diccionarios a la vez. Con el mismo heap de 1 GB, dos arranques reales verificaron los analizadores de los ocho índices sin errores de memoria ni mapas vacíos. El arranque exige `check-analyzers.py`; un servidor healthy por sí solo no acredita sinónimos.

Ejecutar `npm run knowledge:check-openaleph-names` una vez y, después de reiniciar, `npm run knowledge:check-openaleph-names -- --verify-saved`. Se probó realmente con dos personas ficticias: Maruja recupera Maria únicamente cuando se activa `--synonyms`, controles negativos y persistencia de IDs, incluido el CLI. No se han enviado los siete documentos reales ni comprobado resolución de identidades o cruces de empresas.

### Graphiti

Referencia estudiada: [MCP README](https://github.com/getzep/graphiti/blob/3c427640abf909f12f71f963fce15eb514a3c493/mcp_server/README.md). Se arrancó el contenedor con FalkorDB y almacenamiento persistente configurado; se descubrieron 13 herramientas y se leyó correctamente un grupo vacío. Prueba: `npm run knowledge:check-graphiti`.

La ruta real de esta imagen es `http://127.0.0.1:8000/mcp`, sin barra final. Omitir `tokenEnv` para este servidor local: no tiene autenticación Bearer configurada. Añadir un token al cliente no protege al servidor. Un servicio remoto requiere HTTPS y autenticación efectiva antes de conectar.

Este perfil lleva una credencial de modelo deliberadamente inválida y no tiene salida a Internet. No invocar `add_memory` ni búsqueda semántica: extracción, embeddings y persistencia de hechos no están probados. Alfonso quiere conectarlo a la API de Claude más adelante y canceló el alta nueva de OpenAI. [GRAPHITI-PILOT.md](local/GRAPHITI-PILOT.md) conserva el caso ficticio para validar UUID, fechas y hechos; proveedor de embeddings y consumo pendientes. Un acuse `queued` no demuestra extracción.

### Continuidad

Los volúmenes y secretos están en la distribución RegTrack, fuera del checkout. No son un respaldo. Falta exportación/restauración comprobada y alojamiento permanente. WSL puede detenerse al terminar la última sesión aunque systemd siga activo; los puentes usados en las pruebas son temporales. No hay arranque automático ni monitor continuo configurado.

## 3. Verificar las conexiones sin escribir ni consumir modelos

```powershell
npm run knowledge -- check-services --config integrations/config.local.json
```

Devuelve por servicio `not_configured`, `credentials_missing`, `failed` o `readable`. Sale con código 1 si falta alguno o falla su lectura. `readable` significa únicamente que se pudo leer la API/colección/episodios; el propio resultado indica qué falta para una validación completa. No imprime documentos, claves ni respuestas de error del servidor.

Antes de activar vigilancia continua faltan las URL concretas, intervalos, criterio de frescura, disco persistente y respaldo restaurable. Un monitor nuevo o fallido no prueba «sin novedades». La importación actual identifica cada fuente por URL y fecha: mantener **un monitor por URL** en un vault; distintos filtros simultáneos sobre la misma URL necesitan ampliar el modelo de procedencia antes de incorporarlos.

# Conexión de servicios — preparación local

Estado al 30-09-2026: changedetection.io **ejecutado y probado** en este Windows. OpenAleph y Graphiti **pendientes de infraestructura**, no desplegados. No hay Docker, Podman ni WSL instalado. Este documento prepara la siguiente intervención; no acredita un arranque que no se ha ejecutado.

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

## 2. Preparar el alojamiento de OpenAleph y Graphiti

Falta elegir entre instalar Docker/WSL en este ordenador o utilizar un servidor Linux existente. El arranque permanente debe disponer de volúmenes y respaldo fuera de este checkout. No sustituir esa decisión por un job efímero de CI. No se instala software del sistema ni se inicia consumo de modelos con los comandos de RegTrack.

### OpenAleph

Referencia de arranque verificada: [README en la revisión estudiada](https://github.com/openaleph/openaleph/blob/98debd3733897104f54ae3aeec8d9145c900467f/README.md), [stack de ejemplo](https://github.com/openaleph/openaleph/blob/98debd3733897104f54ae3aeec8d9145c900467f/docker-compose.example.yml) y [guía oficial de configuración](https://openaleph.org/docs/dev-admin-guide/104/setup/).

Sobre una copia de esa revisión, preparar `aleph.env` a partir de `aleph.env.tmpl`, con `ALEPH_SECRET_KEY` propio. Mantener autenticación y crear usuario y colección privada; no activar `ALEPH_SINGLE_USER` para un servidor compartido. El stack usa PostgreSQL, Elasticsearch, Redis, API, UI y workers. La copia local del ejemplo necesita estos ajustes antes de arrancar:

- Publicar la UI en `127.0.0.1:8080:8080`; no publicar PostgreSQL, Redis ni Elasticsearch.
- Sustituir `POSTGRES_DATABASE` del ejemplo por `POSTGRES_DB`; usar una contraseña propia y reflejarla en las URI de base de datos.
- Fijar y registrar las imágenes por digest después de elegir las versiones compatibles: el ejemplo oficial contiene etiquetas móviles. El commit del repositorio no fija esas imágenes.
- Conservar los volúmenes de archivo, PostgreSQL, Redis y Elasticsearch. La propia documentación presenta este stack como prueba local, no como despliegue de producción.

Después de comprobar que Docker está disponible y las variables están preparadas:

```sh
docker compose -f docker-compose.example.yml config --quiet
docker compose -f docker-compose.example.yml up -d
# Cuando Elasticsearch esté preparado:
docker compose -f docker-compose.example.yml run --rm worker aleph upgrade
```

Crear la colección privada en la UI y obtener su identificador y la clave del usuario; no suponer que el ID es 1. Configurarlos en `integrations/config.local.json` y `OPENALEPH_API_KEY`. Evitar mostrar `docker compose config` sin `--quiet`: puede expandir secretos.

Validación pendiente: exportar el ejemplo ficticio a un vault independiente, `sync openaleph --limit 1`, esperar la indexación y recuperar **ese ID** con `search-aleph`. Un acuse `accepted` o una cola vacía por sí solos no bastan. No enviar los siete documentos reales hasta comprobar aislamiento y permisos.

### Graphiti

Referencia de arranque: [MCP README en la revisión estudiada](https://github.com/getzep/graphiti/blob/3c427640abf909f12f71f963fce15eb514a3c493/mcp_server/README.md) y [Compose con FalkorDB](https://github.com/getzep/graphiti/blob/3c427640abf909f12f71f963fce15eb514a3c493/mcp_server/docker/docker-compose.yml).

Preparar una copia de esa revisión con `GRAPHITI_GROUP_ID=regtrack`, `SEMAPHORE_LIMIT=1`, `BROWSER=0` y `GRAPHITI_TELEMETRY_ENABLED=false`. Publicar exclusivamente `127.0.0.1:8000:8000`; retirar los puertos Redis/Browser del ejemplo. Fijar la imagen por digest y conservar los volúmenes del grafo y registros. Definir modelo y embeddings deliberadamente: no adoptar por accidente los valores por defecto de upstream.

El ejemplo no configura autenticación Bearer del MCP. Para loopback, omitir `tokenEnv` en `graphiti.mcp`; añadir una variable en el cliente no protege al servidor. Para acceso remoto, necesita HTTPS y autenticación real en el servidor/proxy antes de conectar.

Primero ejecutar `probe graphiti` y `graphiti-episodes`, que solo descubren herramientas y leen episodios. La extracción y búsqueda semántica necesitan modelos/embeddings: siguen pendientes de seleccionar proveedor, credenciales y autorización de consumo. Los comandos de RegTrack exigen `--allow-model-calls`, pero otros clientes que accedan directamente al servidor no pasan por ese control.

Validación posterior: un único documento ficticio, comprobar el UUID del episodio procesado, revisar los hechos extraídos frente al texto y probar el reintento. Un acuse `queued` no acredita extracción. No convertir relaciones inferidas en vigencia u obligaciones.

## 3. Verificar las conexiones sin escribir ni consumir modelos

```powershell
npm run knowledge -- check-services --config integrations/config.local.json
```

Devuelve por servicio `not_configured`, `credentials_missing`, `failed` o `readable`. Sale con código 1 si falta alguno o falla su lectura. `readable` significa únicamente que se pudo leer la API/colección/episodios; el propio resultado indica qué falta para una validación completa. No imprime documentos, claves ni respuestas de error del servidor.

Antes de activar vigilancia continua faltan las URL concretas, intervalos, criterio de frescura, disco persistente y respaldo restaurable. Un monitor nuevo o fallido no prueba «sin novedades». La importación actual identifica cada fuente por URL y fecha: mantener **un monitor por URL** en un vault; distintos filtros simultáneos sobre la misma URL necesitan ampliar el modelo de procedencia antes de incorporarlos.

# Entorno local de servicios

WSL 3.0.1 y Ubuntu 24.04, distribución **RegTrack**, con Docker Engine y Compose del repositorio oficial. La instalación de Windows requiere autorización explícita y elevación UAC. Ningún script reinicia Windows. No se configura arranque al iniciar sesión ni vigilancia continua.

## Preparación

`setup-wsl.ps1` espera `artifacts/local-services/wsl.3.0.1.0.x64.msi`, descargado de la [versión oficial](https://github.com/microsoft/WSL/releases/tag/3.0.1). Verifica SHA256 y firma Microsoft antes de solicitar elevación; escribe un resultado local y activa únicamente VirtualMachinePlatform si falta. No activar WSL1 para resolver su aviso si solo se necesita WSL2.

Crear Ubuntu, siempre con ruta nativa de Windows:

```powershell
wsl --install -d Ubuntu-24.04 --name RegTrack --location 'C:\Users\Usuario\AppData\Local\RegTrack\wsl' --web-download --no-launch
wsl -d RegTrack -u root --exec bash /mnt/c/Users/Usuario/Documents/ChatGPT/regtrack/vigilancia/integrations/local/install-docker.sh
node integrations/local/prepare.mjs
```

El entorno dedicado usa root para administrar contenedores, no credenciales de las cuentas de producción. En esta máquina se creó `.wslconfig` con 3 GB, 2 CPU, 2 GB de swap y recuperación gradual de memoria; antes de tocarlo en otro equipo comprobar si ya contiene configuración ajena. Esta configuración limita todas las distribuciones WSL2: aquí solo existe RegTrack. Probar los servicios por separado por la memoria disponible.

`resolve-images.mjs` consulta registros públicos y verifica el SHA256 del manifiesto antes de actualizar `images.lock.json`. No ejecutarlo en cada arranque: actualizar las imágenes exige volver a validarlas. `prepare.mjs` genera Compose JSON (formato admitido por Docker) y secretos aleatorios en `.knowledge/local-services`; un reintento conserva los secretos existentes. No publicar `.env` ni las identidades generadas.

## OpenAleph: texto importado por API

Mantener una sesión de `wsl -d RegTrack` abierta durante las pruebas: [systemd no mantiene WSL vivo por sí solo](https://learn.microsoft.com/en-us/windows/wsl/systemd). Un `docker compose up -d` correcto seguido de la salida de la última sesión puede terminar con todos los contenedores detenidos. No equivale a servicio permanente. En la comprobación automatizada se utiliza un proceso temporal propio y se detiene al finalizar.

```powershell
wsl -d RegTrack -u root --exec bash /mnt/c/Users/Usuario/Documents/ChatGPT/regtrack/vigilancia/integrations/local/start-openaleph.sh
# En una terminal que se mantiene abierta; Ctrl+C lo detiene:
wsl -d RegTrack -u root --exec python3 /mnt/c/Users/Usuario/Documents/ChatGPT/regtrack/vigilancia/integrations/local/forward.py openaleph
# En otra terminal:
npm run knowledge:check-openaleph
```

El script copia configuración y secretos a `/opt/regtrack/services`, fuera del checkout, y utiliza volúmenes Docker persistentes. Inicializa un usuario API propio **sin privilegios de administrador**, sin contraseña interactiva ni correos, y guarda su clave sin mostrarla. El acceso API está en `127.0.0.1:8081`; las bases de datos no publican puertos. La red de contenedores no tiene salida a Internet. Los perfiles `ui` y `documents` quedan desactivados: esta prueba importa texto FtM, no comprueba la UI, OCR o ingestión de archivos.

La API se limita a un proceso Gunicorn. Elasticsearch recupera los índices de uno en uno (`node_initial_primaries_recoveries=1`) para evitar cargar varios diccionarios de sinónimos a la vez en su heap de 1 GB. La primera inicialización de índices puede tardar varios minutos con recursos limitados. Después de una migración comprobada se puede arrancar con `start-openaleph.sh --skip-migration`; no usar esa opción para saltarse una migración fallida o pendiente.

Antes de arrancar API y worker, el script comprueba los analizadores reales: expansión «Maruja» ↔ «María» en cada índice, control sin sinónimos, cobertura distinta de cero y ausencia de errores de memoria desde el arranque del contenedor. Un fallo corta el script aunque Docker diga healthy. La validación aislada se ejecuta desde Linux con `python3 integrations/local/check-analyzers.py`; solo lee el Elasticsearch dedicado.

En Docker 29.8.1 se observó que un contenedor conectado únicamente a una red interna conserva `PortBindings`, pero no publica realmente el puerto ([incidencia de upstream](https://github.com/moby/moby/discussions/53256)). `forward.py` reenvía TCP desde loopback de WSL al contenedor concreto sin abrirle salida a Internet; Windows accede por el reenvío local de WSL. Es un proceso temporal, no un servicio instalado. Detener y arrancar de nuevo el puente cuando se recrea el contenedor, porque su IP puede cambiar. La UI opcional tampoco se ha validado con esta red.

La prueba crea una colección ficticia, verifica el rechazo anónimo, importa mediante `OpenAleph.push`, espera recuperar la huella exacta y prueba el reintento. `--verify-saved` recupera el mismo documento sin reimportarlo; ejecutarlo después de reiniciar los servicios para comprobar persistencia. Los resultados sin claves se guardan en `artifacts/local-services`; una ejecución fallida no acredita conectividad completa.

Después de esa prueba, `npm run knowledge:check-openaleph-names` incorpora dos personas ficticias en la misma colección privada. Comprueba una variante conocida, el mismo ID y tres controles negativos. Tras reiniciar, `npm run knowledge:check-openaleph-names -- --verify-saved` solo lee y compara los IDs anteriores. El CLI permite `search-aleph --query "Maruja Pruebacodex" --synonyms`; sin esa opción conserva la búsqueda ordinaria. Una coincidencia ampliada es candidata a revisión, no una resolución automática de identidad.

Operación desde Linux, sin borrar volúmenes:

```sh
docker compose --env-file /opt/regtrack/services/.env -f /opt/regtrack/services/compose.openaleph.json stop
# Desde el checkout, tras una migración ya comprobada:
bash integrations/local/start-openaleph.sh --skip-migration
```

No usar `down -v` para detenerlos: borra memoria persistente. El script de arranque se niega a sustituir secretos distintos de los que están guardados en Linux.

## Graphiti: conexión sin modelos

```sh
docker compose -f /opt/regtrack/services/compose.graphiti.json up -d
# En otra terminal Linux abierta, desde el checkout:
python3 integrations/local/forward.py graphiti
# Al terminar el cliente, detener el puente con Ctrl+C y el contenedor:
docker compose -f /opt/regtrack/services/compose.graphiti.json stop
```

Perfil de comprobación: únicamente `127.0.0.1:8000`, grupo `regtrack`, grafo persistente, navegador desactivado, sin salida a Internet y **sin credencial de proveedor**. La cadena de configuración de OpenAI es deliberadamente inválida. Permite intentar descubrimiento MCP y lectura de episodios; no acredita extracción ni búsqueda semántica. No ejecutar `add_memory` con este perfil: produciría trabajo pendiente que no puede completarse.

Conectar el cliente con `graphiti.mcp.url=http://127.0.0.1:8000/mcp`, sin barra final y sin `tokenEnv` en loopback. La imagen probada redirige `/mcp/` a `/mcp`, aunque anuncia la primera en sus logs. El cliente rechaza redirecciones deliberadamente. `npm run knowledge:check-graphiti` verifica descubrimiento y lectura real; no invoca extracción. No presentar un token del cliente como autenticación del servidor. Para extracción real habrá que seleccionar modelo/embeddings, autorizar consumo, proporcionar credenciales y verificar hechos y fechas con un caso reservado. Esa activación requiere una configuración distinta y revisada.

## Comprobaciones reproducibles

```powershell
node --test integrations/local/check.mjs
node integrations/local/prepare.mjs artifacts/local-services-config
```

CI comprueba preservación de secretos, puertos locales, aislamiento de red, imágenes fijadas, sintaxis de Bash/Python y validez de Compose. No instala WSL ni afirma que los servidores estén arrancados. La evidencia de ejecuciones reales vive en [VALIDATION.md](../VALIDATION.md).

**Problema corregido en el perfil:** la recuperación paralela predeterminada podía devolver healthy mientras omitía el diccionario por falta de memoria. La recuperación secuencial mantiene el mismo heap; el nuevo control verifica el comportamiento de los analizadores. [Elastic documenta el mapa vacío con lenient=true](https://www.elastic.co/docs/reference/text-analysis/analysis-synonym-graph-tokenfilter) y el [paralelismo de recuperación](https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/cluster-level-shard-allocation-routing-settings). El ensayo de dos personas no mide precisión sobre nombres reales, homónimos o empresas ni capacidad para grandes volúmenes. Ver resultados y alcance exactos en VALIDATION.

Antes de archivar el checkout, conservar los resultados de prueba necesarios; `/opt/regtrack/services` y volúmenes están en el VHD de WSL, pero **eso no es un respaldo**. No desregistrar la distribución RegTrack sin exportar y comprobar su recuperación.

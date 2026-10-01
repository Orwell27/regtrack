# Memoria compartida para el MVP

El archivo puede consultarse desde Vercel y recibir capturas del escáner sin depender del disco del PC. Reutiliza el proyecto Supabase de RegTrack; no necesita cuenta, motor de IA ni proveedor nuevos. **Tabla remota creada el 1-oct-2026; lectura privada comprobada, todavía vacía.** La copia inicial y el acceso web con una cuenta real siguen pendientes.

## Qué conserva y cómo lo lee

- Tabla `public.regtrack_memory_records`: una clave por ID y versión, registro canónico JSON, vista Markdown y fecha de incorporación al servidor. Originales, análisis vinculados, reportes y relaciones explícitas se conservan juntos. No se altera el modelo de memoria existente.
- Inserción sin sobrescritura: un reintento conserva la misma fila. Tras cada lote se vuelven a leer los registros y se comprueban huellas, versión y Markdown. Enviar solo una parte del archivo local no borra historia remota. Un fallo de escritura o lectura posterior produce error; el CLI no confirma éxito parcial.
- RLS activada y forzada; `anon`, `authenticated` y `PUBLIC` sin acceso directo. El servidor usa su credencial existente, con permisos de lectura/inserción en esta tabla y sin UPDATE/DELETE. El lector web verifica primero la sesión contra Auth, exige que su ID exacto esté en `REGTRACK_MEMORY_READER_IDS` (configuración solo del servidor) y después comprueba el rol admin. Lista ausente/vacía o identidad distinta: acceso denegado antes de consultar perfiles, disco o documentos. Nunca entrega la clave de servidor al navegador.
- El lector utiliza paginación por clave y comprueba todas las páginas hasta una vacía, incluso si el servidor devuelve menos filas por página de las solicitadas. Límite provisional del MVP: 5.000 versiones o 20 MiB por lectura, con error visible en lugar de truncado silencioso. Un lote de envío admite como máximo 25 registros/4 MiB. La lectura de varias páginas no es una instantánea transaccional de escrituras concurrentes; otra consulta recoge las nuevas incorporaciones.
- Un fallo remoto no se sustituye por un archivo local viejo. La web muestra el estado de indisponibilidad. La vigencia y revisión jurídica continúan pendientes.

## Preparación realizada

La migración `supabase/migrations/20261001093618_shared_memory.sql` se creó inicialmente con Supabase CLI 2.119.0 y se aplicó mediante MCP el 1-oct a las 09:36 UTC tras la continuación autorizada por Alfonso. El nombre local se alineó con la versión devuelta por el historial remoto, sin cambiar su SQL. No volver a ejecutar CREATE TABLE ni aplicar todas las migraciones históricas. Probada antes en PostgreSQL 17 real, en contenedor temporal sin red ni disco persistente: acceso anónimo/usuario denegado, inserción y lectura del servidor, reintento sin duplicados, rechazo de UPDATE/DELETE y de filas sin estructura mínima. Comando reproducible: `bash scripts/check-memory-db.sh`; también se ejecuta en CI.

282 pruebas en 33 archivos correctas; TypeScript, ESLint dirigido y build correctos. Los tests del cliente usan la librería Supabase real con transporte PostgREST simulado: paginación, reintento, historial remoto, corrupción, fallo de conexión/confirmación y autorización web antes de leer. Las tres regresiones de identidad no autorizada fallaron antes del arreglo y pasan después. La compilación comprueba que no se empaquete el vault, los respaldos ni archivos de entorno. No confundir estas pruebas con una sincronización real contra Supabase.

La consulta de preparación encontró **cero perfiles admin enlazados** a Auth. El correo de Alfonso se ha solicitado para identificar el acceso; no se ha cambiado ningún rol ni creado un usuario. El conector Vercel devolvió 403, pero el CLI autenticado sí recuperó la configuración del preview. Solo las variables Supabase necesarias se copiaron a `.env.local`, ignorado en Git, comprobando el destino del proyecto sin imprimir valores. El archivo descargado queda también ignorado en `artifacts/memory-cloud/.env.preview`.

La revisión automática rechazó inicialmente crear la tabla. Tras «vamos a arreglarlo» permitió la migración, pero **rechazó por separado el envío de las siete versiones**, al exigir permiso explícito para transferir ese archivo local a ese destino. Se ha solicitado esa autorización concreta; no se reintentó el envío por otro mecanismo. La tabla continúa vacía. `memory:cloud status` y la API real confirman lectura del servidor y rechazo anónimo con código 42501 (09:40 UTC); evidencia local ignorada `artifacts/memory-cloud/remote-read.json`. No se ha probado escritura ni recuperación remota de documentos.

La revisión de permisos encontró que la tabla heredada `usuarios` carece de RLS y admite escrituras del navegador. Por ello su rol **no es una barrera de autorización suficiente**: la memoria añade la lista independiente de IDs verificados, sin modificar perfiles ni las rutas del PR14 ajeno. Esto protege su lector; no corrige la seguridad general de los otros paneles. El asesor señala además [RLS ausente en tablas existentes](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public) y [protección de contraseñas filtradas desactivada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); quedan fuera de esta activación. En memoria, el aviso informativo [RLS sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) es deliberado: ningún usuario del navegador debe acceder directamente; solo el servidor.

## Activación pendiente

1. Autorizar expresamente el envío de `.knowledge/vault` al proyecto `rygwmqxqjmgytnzgrnef` y su recuperación de comprobación. La tabla ya está creada; no hace falta recrearla. El acceso por CLI y la configuración privada están disponibles; nunca pegar claves en el chat.
2. Comprobar el contenido inicial y copiar únicamente las versiones autorizadas. No ejecutar todos los SQL históricos ni resolver por esta vía el PR14 ajeno.
3. Con `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` disponibles solo para el servidor, copiar el archivo local y comprobar lectura:

```powershell
npm run memory:cloud -- push --vault .knowledge/vault
npm run memory:cloud -- status
npm run memory:cloud -- recover-content --to artifacts/cloud-recovery-nueva
```

La recuperación crea un directorio nuevo y reconstruye JSON/Markdown sin alterar el destino existente. **Es recuperación de contenido: no conserva los acuses de otras integraciones.** Para reanudar Basic Memory/OpenAleph/Graphiti sin repetir envíos se necesita el respaldo completo anterior, no esa copia de contenido.

4. Identificar la cuenta solicitada, revisar su correspondencia con `usuarios.auth_id` y autorizar su acceso admin. Añadir su UUID verificado a `REGTRACK_MEMORY_READER_IDS`, solo en el servidor. Probar sesión anónima, usuario sin permiso y sesión real de Alfonso. No deducir autorización de metadatos editables, del perfil por sí solo ni de la primera cuenta encontrada.
5. Configurar `REGTRACK_MEMORY_BACKEND=supabase` en la web. La sincronización del worker es optativa con `REGTRACK_MEMORY_SYNC=1` y un directorio `REGTRACK_KNOWLEDGE_DIR` local escribible. La variable de GitHub del mismo nombre queda **sin activar**. El workflow la transmite y crea el vault temporal solamente cuando se habilita. No se ha fusionado la PR ni cambiado el cron remoto.

## Fallos y límites de continuidad

El pipeline conserva primero el original y su informe en el vault local. Si se activa la sincronización, envía el archivo al acabar, también cuando la ejecución quedó incompleta. Si falla esa copia, la ejecución termina con error y el informe lo indica. `--scan-only` sigue sin crear clientes de base de datos ni sincronizar, aunque exista la variable.

En un worker con disco persistente, repetir `memory:cloud push` recupera lo pendiente. **En GitHub Actions el disco temporal desaparece:** una captura que no llegó a Supabase no queda respaldada automáticamente. El repositorio es público; no se sube el vault privado como artefacto de recuperación. Sigue pendiente una cola duradera o un respaldo cifrado para ese caso; volver a recuperar la fuente no garantiza idéntico contenido. La memoria compartida aún no acredita autonomía continua.

La tabla es compartida por administradores de RegTrack, no está diseñada como archivo separado para varios clientes. La credencial del servidor conserva sus facultades en otras tablas; esta migración limita únicamente la nueva tabla. No modifica las rutas administrativas del PR14 ni acredita seguridad integral de la aplicación. No hay extracción Graphiti, claves nuevas, llamadas IA, cambios en alertas ni aprobación jurídica automática.

Referencias oficiales consultadas: [Upsert de Supabase](https://supabase.com/docs/reference/javascript/upsert), [roles de PostgreSQL en Supabase](https://supabase.com/docs/guides/database/postgres/roles) y documentación instalada de Next.js sobre acceso a datos desde el servidor.

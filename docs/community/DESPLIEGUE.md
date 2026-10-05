# Paquete de despliegue de comunidad y acceso

Preparado para el estado observado el 5-oct-2026 del proyecto `rygwmqxqjmgytnzgrnef`. No se ha ejecutado en producción. No activa solicitudes ni configura remitente, moderador o responsables.

## Qué se ha contrastado

La base real contiene las siete tablas heredadas y `regtrack_memory_records`. Las columnas necesarias de usuarios, alertas y relaciones existen; el enriquecimiento BOE de 008 también existe. Faltan las cinco tablas sectoriales de 007 y las once comunitarias. Solo `20261001093618_shared_memory` figura en el historial remoto. Por tanto, la ausencia de una fila en el historial no demuestra que falte su estructura.

El preflight del paquete se ha ejecutado en una transacción **de solo lectura** sobre esa base: dependencias presentes, objetos nuevos ausentes, administrador confirmado y activo, sin enlaces Auth duplicados y rol de servidor apto para RLS. Esto no sustituye el ensayo de escritura ni acredita una copia recuperable.

Vercel sirve producción en `https://regtrack.vercel.app`, desde `main` 2cab1ea en la inspección. Las variables de comunidad y origen canónico aún no están configuradas; por ausencia de `COMMUNITY_ENABLED`, el candidato mantiene la comunidad cerrada. Las claves de Supabase están configuradas para todos los entornos: no modificar una variable compartida creyendo que afecta solo al preview. Esta inspección solo leyó nombres/ámbitos, sin revelar valores secretos.

## Preparar y revisar

```text
npm run release:prepare
```

Genera `.artifacts/community-release/release.sql` y `manifest.json`, sin conectarse a ningún servicio. El manifiesto identifica proyecto, fuentes y SHA-256. Las mismas fuentes y el mismo paquete se ejecutan en las pruebas SQL y se conservan como artefacto de CI. Los finales de línea se normalizan para obtener el mismo resultado en Windows y Linux.

El paquete ensambla exclusivamente:

1. `007_sectorial.sql`: tablas ausentes y doce categorías iniciales.
2. `20261004224507_comunidad_nacional.sql`: comunidad y permisos.
3. `20261005113039_comunidad_normativa.sql`: referencias y revisión.
4. `20261005122015_acceso_seguro_y_alta.sql`: cierre de tablas antiguas y alta desde servidor.

No reaplica 001–006 ni 008, ni modifica memoria compartida. No inventa filas de participantes ni convierte al administrador del producto en moderador comunitario.

## Garantías del paquete

Un único BEGIN/COMMIT, bloqueo de despliegue y espera de bloqueo limitada a cinco segundos. Cada sentencia tiene un límite de sesenta segundos. Las tablas anteriores se bloquean contra escrituras durante la operación y se comparan huellas de todas sus filas antes/después sin exportar los datos. Esta comprobación debe dimensionarse si esas tablas crecen: un timeout aborta; no autoriza quitar el control.

Antes de confirmar, comprueba RLS en las 23 tablas afectadas, ausencia de permisos efectivos de tabla/columna para anon/authenticated, acceso del servidor y permisos de las tres funciones. Cualquier error aborta **toda** la transacción; ante un fallo, cerrar o revertir explícitamente la transacción de esa conexión y volver a inspeccionar. No continuar enviando fragmentos ni aplicar las fuentes por separado.

Una ejecución repetida o parcialmente aplicada se rechaza deliberadamente. Hay que inspeccionar su estado, no suprimir los controles. Los tests incluyen permiso público inesperado y modificación accidental de un dato al final: ambos abortan y conservan estructura, datos y permisos originales.

## Ejecución después de la aprobación

1. Confirmar ausencia de otro operador y copia recuperable. Revisar el SHA exacto y el estado remoto otra vez. La sesión del panel de Supabase es necesaria para comprobar backups y remitente; el conector disponible no acredita esos ajustes.
2. Preparar el despliegue Vercel del commit aprobado con `COMMUNITY_ENABLED=false`. Mantener origen canónico y claves correspondientes al entorno real. Durante el cambio puede haber una breve ventana en que el alta nueva devuelva indisponibilidad hasta que exista su función SQL.
3. Tras la aprobación concreta, desplegar el código y aplicar inmediatamente el SQL completo mediante la herramienta de migraciones, registrándolo como `community_access_release`. La herramienta asigna su versión real; guardar esa versión y el manifiesto junto al commit desplegado. No registrar como aplicadas migraciones históricas que no se han ejecutado ni reescribir la fila de memoria.
4. No usar `supabase db push` desde este historial heredado. Este despliegue queda trazado por el paquete, su manifiesto y la fila de migración agregada; antes de adoptar push automático se necesita una línea base contrastada del esquema existente. No ejecutar `migration repair` sobre todos los números para silenciar diferencias.
5. Comprobar permisos reales y asesores; desde la URL pública, anónimo rechazado, administrador legítimo admitido y sin sesiones cruzadas. Ensayar alta con un correo autorizado: entrega, confirmación, perfil gratuito y acceso. Las pruebas locales no envían correo.
6. Configurar responsable, contacto atendido y moderador explícito; confirmar operación y textos. Solo después activar solicitudes y difundir la URL pública. Nada de esta preparación publica mensajes ni activa gasto.

## Recuperación

Si falla el paquete antes del COMMIT, no hay cambio parcial. Si falla la aplicación después de confirmar, mantener RLS y los datos; corregir el código y conservar la comunidad cerrada. No devolver permisos públicos para hacer funcionar el registro antiguo. La copia de seguridad es un requisito separado, no una consecuencia de que la transacción haya pasado.

Referencias: [migraciones e historial de Supabase](https://supabase.com/docs/guides/deployment/database-migrations), [control de tablas expuestas sin RLS](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public). El asesor remoto también informa de protección contra contraseñas filtradas desactivada; revisar su [configuración y disponibilidad](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) antes de apertura. No se ha cambiado el plan ni contratado ninguna función.

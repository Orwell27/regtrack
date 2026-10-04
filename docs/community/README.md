# Comunidad nacional de RegTrack

La comunidad ayuda a propietarios de toda España a compartir una duda, aportar una experiencia y contar el resultado. La captación empieza desde cero. El código no crea miembros, conversaciones ni indicadores ficticios.

## Dónde está cada cosa

| Entrada | Para quién | Qué permite |
|---|---|---|
| `/comunidad` | Público | Entender la propuesta y solicitar una invitación |
| `/comunidad/crear-cuenta` | Solicitantes | Crear una cuenta y confirmar su correo |
| `/comunidad/preguntas` | Miembros admitidos | Buscar por tema/territorio, preguntar, responder y seguir conversaciones |
| `/comunidad/casos` | Miembros admitidos | Consultar fichas revisadas y autorizadas por el autor |
| `/comunidad/gestion` | Moderadores designados | Admitir, retirar acceso, moderar, publicar fichas y organizar el piloto |
| `/comunidad/normas` y `/comunidad/privacidad` | Público | Conocer las reglas y el tratamiento de datos |

La navegación de suscriptores y administradores incluye Comunidad. Las cuentas existentes usan el mismo acceso. El registro específico de comunidad crea una cuenta Auth; no contrata ni configura una suscripción de alertas. La solicitud contiene el perfil del participante y requiere admisión aparte.

## Preparación y apertura

**Estado de entrega: código y migración preparados; no implica activación en producción.** La función permanece cerrada por defecto. La base de datos de producción no se modifica durante las pruebas locales.

1. Revisar y aprobar el cambio. Confirmar que no coincide con otro despliegue o migración. Revisar especialmente la integración con los PR de autenticación y registro en curso: esta comunidad verifica Auth de manera independiente y no usa `usuarios.rol` para moderar.
2. Aplicar **solo** `supabase/migrations/20261004224507_comunidad_nacional.sql` al entorno de ensayo con Supabase CLI. Comparar primero `supabase migration list` y `supabase db push --dry-run`. Si hay migraciones históricas pendientes o divergentes, reconciliarlas antes: no ejecutar un `db push` indiscriminado. La nueva migración es transaccional, aditiva y no rellena datos de ejemplo.
3. Repetir en el ensayo el recorrido real con correo confirmado: solicitar, entrar como pendiente, admitir con moderador, preguntar, responder desde otra cuenta, marcar utilidad, compartir resultado, dar permiso, publicar ficha, retirar permiso y retirar acceso. Verificar también edición obsoleta, reportes y restauración. Las pruebas locales usan PostgreSQL embebido y un proveedor Auth simulado: **no sustituyen esta comprobación del proveedor real**.
4. Tras aprobación de apertura, repetir la revisión/aplicación de migración en producción. Verificar todas las tablas `community_*` con RLS y sin permisos directos para `anon`/`authenticated`; la RPC solo debe ser ejecutable por `service_role`. No modificar los grants de tablas ajenas.
5. Designar un moderador con una cuenta Auth real y correo confirmado. Comprobar primero su UUID y correo en Supabase Auth; insertar únicamente ese UUID en `public.community_moderators`. No promover por `usuarios.rol`, por metadata del navegador ni por un correo recibido en un formulario. El moderador puede solicitar además su participación desde Inicio; sus publicaciones requieren la misma admisión que las de cualquier miembro.
6. Configurar las variables de servidor de la tabla siguiente. Completar y revisar la información de privacidad con la identidad real, el contacto, los proveedores/contratos y el procedimiento de derechos del responsable. No abrir el formulario con datos de ejemplo.
7. En Supabase Auth, mantener la confirmación por correo activada, configurar SMTP y permitir exactamente `https://DOMINIO/api/comunidad/auth` como URL de redirección. Probar confirmación en el mismo navegador (PKCE) y acceso posterior en otro navegador; una confirmación sin sesión válida vuelve al login. Las invitaciones al piloto y avisos de admisión son **manuales**: esta versión no envía correos a terceros.
8. Desplegar la versión aprobada, activar la comunidad y comprobar en el dominio real. Establecer responsable, horas semanales y fecha desde Gestión. La fase de captación no consume las seis semanas del piloto.

| Variable | Valor |
|---|---|
| `COMMUNITY_ENABLED` | `false` hasta completar la preparación; `true` para abrir |
| `COMMUNITY_SITE_URL` | Origen público canónico completo, por ejemplo `https://regtrack.example`; sin rutas. Usar el origen del preview en ensayos. Evita errores y suplantación de cabeceras detrás de proxies. |
| `COMMUNITY_PRIVACY_CONTROLLER` | Nombre o razón social real del responsable |
| `COMMUNITY_CONTACT_EMAIL` | Correo real atendido por el equipo |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Proyecto correspondiente al entorno |
| `SUPABASE_SERVICE_KEY` | Secreto del servidor, nunca `NEXT_PUBLIC_*` |

En alojamiento distinto de Vercel, el proxy debe **sobrescribir**, no concatenar valores aportados por el cliente, las cabeceras de IP usadas para limitar solicitudes. Hay un máximo de 10 solicitudes por huella de IP/hora y 120 acciones por cuenta/hora. No se conserva la IP en las tablas de comunidad. Las respuestas de la API son privadas y no se cachean.

### SQL de comprobación (lectura)

```sql
select c.relname,c.relrowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname like 'community_%' and c.relkind='r';
select grantee,table_name,privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name like 'community_%'
  and grantee in ('anon','authenticated','PUBLIC'); -- debe devolver cero filas
select has_function_privilege('anon','public.community_execute(uuid,text,jsonb,text)','EXECUTE') as anon_exec,
       has_function_privilege('authenticated','public.community_execute(uuid,text,jsonb,text)','EXECUTE') as user_exec;
-- ambos false
```

## Operación del piloto

La mesa de gestión incorpora el plan semanal y textos de invitación/bienvenida. Antes de arrancar: conversar con unas diez personas, reunir 12–15 participantes de situaciones y territorios diversos y reservar capacidad de atención. Ampliar hacia 30–50 solo si se sostiene. Son criterios operativos propuestos, no umbrales demostrados por los estudios.

- **Cada día de atención:** revisar preguntas sin respuesta, dar contexto al nuevo miembro y atender avisos. No inventar respuestas de otros propietarios. La ayuda del equipo debe publicarse con su identidad.
- **Cada semana:** pedir resultados a los autores, revisar las fichas y entrevistar también a lectores silenciosos. Ejecutar en Gestión la limpieza de solicitudes pendientes de más de 90 días. Es una tarea manual; no hay un cron oculto.
- **Moderación:** explicar la decisión, ocultar/restaurar cuando corresponda y cerrar el aviso con su resolución. El historial conserva actor, acción, motivo y fecha. Los avisos muestran primero los 100 más antiguos; al resolverlos aparecen los siguientes.
- **Fichas:** solo se muestran si conservan el permiso y la versión revisada del caso. Una edición o retirada de permiso las retira automáticamente de la lectura. El texto editorial debe limitarse a la aportación del autor; no copiar respuestas de terceros sin permiso.
- **Medición:** el panel muestra preguntas visibles, preguntas sin respuesta, aportaciones marcadas útiles por quien preguntó y autores distintos de esas aportaciones. Son acumulados, no retención ni satisfacción. La primera/última acción de cada miembro incluye acciones como seguir; no representa una lectura ni una ayuda recibida. Complementar con entrevistas.
- **Semana seis:** decidir con ejemplos de ayuda real, participantes que vuelven y horas efectivamente necesarias. La plataforma no recluta por sí sola.

### Privacidad y bajas

Solo el equipo ve correos y solicitudes; el grupo ve alias y aportaciones. La cuenta pendiente o retirada no puede leer conversaciones, ni siquiera repitiendo una petición previamente exitosa. No hay publicaciones externas automáticas.

Atender solicitudes de derechos en el correo configurado verificando la identidad, sin pedir documentación innecesaria. Una baja de acceso se realiza en Gestión; **no equivale a borrar los datos**. Para una supresión, preparar una operación transaccional revisada sobre el miembro y sus dependencias (fichas, avisos, seguimientos, respuestas, preguntas), teniendo en cuenta las respuestas de terceros y la conservación justificada de incidencias; ejecutar solo sobre la persona verificada y comprobar después. No borrar primero `auth.users`: retirar antes el acceso comunitario para evitar que una cuenta futura con el mismo correo reclame una admisión antigua. Coordinar también la baja de alertas cuando corresponda, porque es otro perfil.

Las solicitudes pendientes caducadas se eliminan desde Gestión cuando no tienen aportaciones; las claves de reintento se conservan hasta 30 días y se limpian con esa misma acción. El registro de moderación requiere revisión de conservación por el responsable al cerrar el piloto.

## Verificación y mantenimiento

```text
npm ci
npm test
npm audit --omit=dev
npm run build
npx playwright install chromium
npm run test:e2e
```

La prueba E2E levanta un servidor local en 3100 y un simulador del protocolo Supabase en 54329. El simulador ejecuta la **misma migración SQL**, pero no envía correo ni se conecta a producción. Para verificar el build, compilar con las variables públicas locales del workflow y ejecutar con `COMMUNITY_E2E_PRODUCTION=true`. No usar credenciales reales en estas pruebas. `test-results/` contiene capturas y trazas locales; no se versiona.

CI ejecuta pruebas, lint de los archivos de comunidad e integración, compilación, auditoría de dependencias de producción y recorrido de navegador. Los fixtures están fuera de la aplicación y no hay una opción de omitir autenticación en runtime.

La actualización a Next.js 16.3.8 responde a avisos de seguridad; se retiró la CLI `shadcn` de las dependencias de ejecución porque el código ya contiene los componentes. Se actualizó también el SDK de Anthropic y dependencias compatibles. Quedan avisos de auditoría en herramientas de desarrollo; no se fuerza una bajada incompatible de ESLint para ocultarlos.

### Reversión

Poner `COMMUNITY_ENABLED=false` y redesplegar cierra solicitudes, API y páginas privadas. Mantener las tablas para preservar datos; no ejecutar un `drop` como reversión rutinaria. Volver a activar solo cuando se haya corregido y probado el problema. Un rollback al despliegue anterior quita la navegación nueva, pero tampoco borra las tablas.

## Referencias y límites de la entrega

La investigación que fundamenta el piloto está en [REFERENCIAS.md](REFERENCIAS.md). Las fuentes explican mecanismos de acogida, pertenencia y contribución; no garantizan resultados comerciales para RegTrack. La comunidad es nacional y filtra por territorio sin abrir canales vacíos por provincia.

El endurecimiento general del sistema antiguo de usuarios y sus API sigue siendo una revisión separada: al comenzar esta entrega había PR abiertos de autenticación, vigilancia y cartera. No se han mergeado ni alterado sus ramas. La autorización de esta comunidad no depende de esa tabla antigua. Antes de una apertura pública del producto completo, conciliar ese trabajo de seguridad con esta entrega.
